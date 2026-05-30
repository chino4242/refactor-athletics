import { createClient } from '@/utils/supabase/client';
import { stepsToXp } from '@/utils/xp';

export interface XpItem {
  source_label: string;
  amount: number;
}

export interface TodayXpResult {
  xpItems: XpItem[];
  totalXp: number;
}

/**
 * Single source of truth for today's XP calculation.
 * Queries xp_ledger, deduplicates (highest per source_label),
 * and synthesizes missing entries from habit/workout data.
 */
export async function getTodayXp(userId: string, date?: Date): Promise<TodayXpResult> {
  const supabase = createClient();
  const targetDate = date || new Date();
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const dateStr = dayStart.toLocaleDateString('en-CA');

  // Fetch XP ledger entries
  const { data: xpEntries } = await supabase
    .from('xp_ledger')
    .select('amount, source_label')
    .eq('user_id', userId)
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString())
    .order('amount', { ascending: false });

  // Fetch habits for fallback
  const { data: habits } = await supabase
    .from('habit_logs')
    .select('habit_id, value')
    .eq('user_id', userId)
    .eq('date', dateStr);

  // Fetch workouts for fallback
  const dayStartUnix = Math.floor(dayStart.getTime() / 1000);
  const dayEndUnix = dayStartUnix + 86400;
  const { data: workouts } = await supabase
    .from('workouts')
    .select('exercise_id, xp')
    .eq('user_id', userId)
    .gte('timestamp', dayStartUnix)
    .lt('timestamp', dayEndUnix);

  // Deduplicate: keep highest XP entry per source_label
  const deduped = new Map<string, number>();
  for (const e of (xpEntries || [])) {
    if (e.amount <= 0) continue;
    if (e.source_label === 'exercise_minutes' || e.source_label === 'Exercise Minutes') continue;
    if (e.source_label.startsWith('Auto-Cal')) continue;
    const existing = deduped.get(e.source_label) || 0;
    if (e.amount > existing) deduped.set(e.source_label, e.amount);
  }

  // Fallback: synthesize from habit/workout data if ledger is missing entries
  const steps = habits?.find(h => h.habit_id === 'habit_steps')?.value || 0;
  const sleep = habits?.find(h => h.habit_id === 'habit_sleep')?.value || 0;

  if (steps > 0 && !deduped.has('Steps')) {
    deduped.set('Steps', stepsToXp(steps));
  }
  if (sleep > 0 && !deduped.has('Sleep')) {
    deduped.set('Sleep', Math.round(sleep * 2));
  }
  if (workouts?.length && !deduped.has('Workout')) {
    // Only add aggregate "Workout" if no individual exercise entries exist in ledger
    const hasExerciseEntries = workouts.some(w => deduped.has(w.exercise_id?.replace(/_/g, ' ')) || [...deduped.keys()].some(k => k.toLowerCase().includes((w.exercise_id || '').replace(/_/g, ' ').toLowerCase().slice(0, 10))));
    if (!hasExerciseEntries) {
      const workoutXp = workouts.reduce((s, w) => s + (w.xp || 0), 0);
      if (workoutXp > 0) deduped.set('Workout', workoutXp);
    }
  }

  // Consolidate macro entries into one "Nutrition" line
  let nutritionXp = 0;
  const macroLabels = ['Protein', 'Carbs', 'Fat', 'Water', 'Calories Burned', 'protein', 'carbs', 'fat'];
  for (const label of macroLabels) {
    if (deduped.has(label)) { nutritionXp += deduped.get(label)!; deduped.delete(label); }
  }
  if (nutritionXp > 0) deduped.set('Logged nutrition', nutritionXp);

  const xpItems = Array.from(deduped.entries()).map(([source_label, amount]) => ({ source_label, amount }));
  xpItems.sort((a, b) => b.amount - a.amount);
  const totalXp = xpItems.reduce((s, e) => s + e.amount, 0);

  return { xpItems, totalXp };
}
