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

  // Deduplicate: keep highest XP entry per source_label (normalize legacy "(Sync)" labels)
  const deduped = new Map<string, number>();
  for (const e of (xpEntries || [])) {
    if (e.amount <= 0) continue;
    if (e.source_label === 'exercise_minutes' || e.source_label === 'Exercise Minutes') continue;
    if (e.source_label.startsWith('Auto-Cal')) continue;
    const normalizedLabel = e.source_label.replace(/\s*\(Sync\)/, '');
    const existing = deduped.get(normalizedLabel) || 0;
    if (e.amount > existing) deduped.set(normalizedLabel, e.amount);
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
    // Add XP from workout blocks that aren't individually in the ledger
    for (const w of workouts) {
      const label = (w.exercise_id || '').replace(/_/g, ' ').replace(/^block /, '').replace(/\b\w/g, (c: string) => c.toUpperCase());
      if (!deduped.has(label) && (w.xp || 0) > 0) {
        deduped.set(label, w.xp);
      }
    }
  }

  // Consolidate macro entries into one "Nutrition" line
  let nutritionXp = 0;
  const macroLabels = ['Protein', 'Carbs', 'Fat', 'Water', 'Calories Burned', 'protein', 'carbs', 'fat'];
  for (const label of macroLabels) {
    if (deduped.has(label)) { nutritionXp += deduped.get(label)!; deduped.delete(label); }
  }
  if (nutritionXp > 0) deduped.set('Logged nutrition', nutritionXp);

  // Roll low-value sources into "Other"
  let otherXp = 0;
  for (const [label, amount] of deduped) {
    if (amount < 5) { otherXp += amount; deduped.delete(label); }
  }
  if (otherXp > 0) deduped.set('Other', otherXp);

  const xpItems = Array.from(deduped.entries()).map(([source_label, amount]) => ({ source_label, amount }));
  xpItems.sort((a, b) => b.amount - a.amount);
  const totalXp = xpItems.reduce((s, e) => s + e.amount, 0);

  return { xpItems, totalXp };
}
