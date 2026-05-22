'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Check, ChevronRight } from 'lucide-react';

interface DailyWrapUpProps {
  userId: string;
  mode: 'today' | 'yesterday';
  onDismiss?: () => void;
}

interface WrapUpData {
  date: string;
  xpItems: { source_label: string; amount: number }[];
  totalXp: number;
  steps: number;
  sleep: number;
  macros: { protein: number; carbs: number; fat: number; calories: number; caloriesBurned: number };
  workout: { name: string; exercises: number; xp: number } | null;
}

function generateReflection(data: WrapUpData): string {
  const parts: string[] = [];
  if (data.sleep >= 7) parts.push('hit your sleep target');
  if (data.steps >= 7500) parts.push('stayed active');
  if (data.workout) parts.push('got a workout in');
  if (data.macros.protein >= 100) parts.push('fueled up on protein');
  if (parts.length === 0) {
    if (data.totalXp > 0) return 'Every bit of progress counts.';
    return 'A rest day is still a day forward.';
  }
  if (parts.length === 1) return `You ${parts[0]}. Nice work.`;
  return `You ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`;
}

function generateNudge(data: WrapUpData): string | null {
  if (data.steps > 0 && data.steps < 7500) return `Hit ${data.steps.toLocaleString()} of 7,500 steps. A short walk after lunch gets you there.`;
  if (data.macros.protein > 0 && data.macros.protein < 120) return `${data.macros.protein}g protein — try adding a shake or extra serving today.`;
  if (data.sleep > 0 && data.sleep < 6.5) return `${data.sleep}h sleep. Try winding down 30 min earlier tonight.`;
  if (!data.workout) return 'No workout logged. Even 20 minutes counts.';
  return null;
}

export default function DailyWrapUp({ userId, mode, onDismiss }: DailyWrapUpProps) {
  const [data, setData] = useState<WrapUpData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const now = new Date();
      const targetDate = mode === 'yesterday'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dateStr = targetDate.toLocaleDateString('en-CA');
      const dayStart = Math.floor(targetDate.getTime() / 1000);
      const dayEnd = dayStart + 86400;

      // Fetch XP ledger entries for the target date
      const { data: xpEntries } = await supabase
        .from('xp_ledger')
        .select('amount, source_label')
        .eq('user_id', userId)
        .gte('created_at', new Date(dayStart * 1000).toISOString())
        .lt('created_at', new Date(dayEnd * 1000).toISOString())
        .order('amount', { ascending: false });

      // Fetch habits for the date
      const { data: habits } = await supabase
        .from('habit_logs')
        .select('habit_id, value')
        .eq('user_id', userId)
        .eq('date', dateStr);

      // Fetch nutrition for the date
      const { data: nutrition } = await supabase
        .from('nutrition_logs')
        .select('macro_type, amount')
        .eq('user_id', userId)
        .eq('date', dateStr);

      // Fetch workouts for the date
      const { data: workouts } = await supabase
        .from('workouts')
        .select('exercise_id, xp')
        .eq('user_id', userId)
        .gte('timestamp', dayStart)
        .lt('timestamp', dayEnd);

      // Process
      const steps = habits?.find(h => h.habit_id === 'habit_steps')?.value || 0;
      const sleep = habits?.find(h => h.habit_id === 'habit_sleep')?.value || 0;

      const macros = { protein: 0, carbs: 0, fat: 0, calories: 0, caloriesBurned: 0 };
      for (const n of nutrition || []) {
        if (n.macro_type === 'protein') macros.protein += n.amount;
        if (n.macro_type === 'carbs') macros.carbs += n.amount;
        if (n.macro_type === 'fat') macros.fat += n.amount;
        if (n.macro_type === 'calories_burned') macros.caloriesBurned += n.amount;
      }
      // Derive calories from macros
      macros.calories = Math.round((macros.protein * 4) + (macros.carbs * 4) + (macros.fat * 9));

      const workout = workouts?.length ? {
        name: 'Workout',
        exercises: new Set(workouts.map(w => w.exercise_id)).size,
        xp: workouts.reduce((s, w) => s + (w.xp || 0), 0),
      } : null;

      // Deduplicate: keep highest XP entry per source_label, filter out noise
      const deduped = new Map<string, number>();
      for (const e of (xpEntries || [])) {
        if (e.amount <= 0) continue;
        if (e.source_label === 'exercise_minutes' || e.source_label === 'Exercise Minutes') continue;
        if (e.source_label.startsWith('Auto-Cal')) continue;
        const existing = deduped.get(e.source_label) || 0;
        if (e.amount > existing) deduped.set(e.source_label, e.amount);
      }

      // Fallback: if ledger is sparse, synthesize from actual habit/workout data
      if (steps > 0 && !deduped.has('Steps')) {
        const { stepsToXp } = await import('@/utils/xp');
        deduped.set('Steps', stepsToXp(steps));
      }
      if (sleep > 0 && !deduped.has('Sleep')) {
        deduped.set('Sleep', Math.round(sleep * 2));
      }
      if (workout && !deduped.has('Workout')) {
        deduped.set('Workout', workout.xp);
      }

      // Consolidate individual macro entries into one "Nutrition" line
      let nutritionXp = 0;
      const macroLabels = ['Protein', 'Carbs', 'Fat', 'Water', 'Calories Burned', 'protein', 'carbs', 'fat'];
      for (const label of macroLabels) {
        if (deduped.has(label)) { nutritionXp += deduped.get(label)!; deduped.delete(label); }
      }
      if (nutritionXp > 0) deduped.set('Logged nutrition', nutritionXp);

      const xpItems = Array.from(deduped.entries()).map(([source_label, amount]) => ({ source_label, amount }));
      xpItems.sort((a, b) => b.amount - a.amount);
      const totalXp = xpItems.reduce((s, e) => s + e.amount, 0);

      setData({ date: dateStr, xpItems, totalXp, steps, sleep, macros, workout });
      setLoading(false);
    };
    load();
  }, [userId, mode]);

  if (loading) return null;
  if (!data || (data.totalXp === 0 && !data.workout && data.steps === 0)) return null;

  const dateLabel = mode === 'yesterday'
    ? `Yesterday, ${new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'Today So Far';

  const reflection = generateReflection(data);
  const nudge = mode === 'yesterday' ? generateNudge(data) : null;
  const netCal = data.macros.calories - data.macros.caloriesBurned;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{dateLabel}</span>
        {onDismiss && <button onClick={onDismiss} className="text-zinc-600 hover:text-zinc-400 p-1"><X size={14} /></button>}
      </div>

      {/* Reflection */}
      <div className="px-4 pb-3">
        <p className="text-sm text-zinc-300 italic">"{reflection}"</p>
      </div>

      {/* XP Attribution */}
      {data.xpItems.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">XP Earned: {data.totalXp}</div>
          <div className="space-y-1">
            {data.xpItems.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <Check size={10} className="text-emerald-500" /> {item.source_label}
                </span>
                <span className="text-orange-400 font-bold">+{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Blocks */}
      <div className="px-4 pb-3 space-y-2">
        {data.steps > 0 && (
          <div className="flex items-center justify-between text-xs bg-zinc-800/50 rounded-lg px-3 py-2">
            <span className="text-zinc-400">🏃 Steps</span>
            <span className="text-white font-bold">{data.steps.toLocaleString()}</span>
          </div>
        )}
        {data.macros.protein > 0 && (
          <div className="flex items-center justify-between text-xs bg-zinc-800/50 rounded-lg px-3 py-2">
            <span className="text-zinc-400">🥗 Nutrition</span>
            <span className="text-white font-bold">
              {netCal !== 0 ? `Net: ${netCal > 0 ? '+' : ''}${netCal} cal` : ''} P:{data.macros.protein} C:{data.macros.carbs} F:{data.macros.fat}
            </span>
          </div>
        )}
        {data.workout && (
          <div className="flex items-center justify-between text-xs bg-zinc-800/50 rounded-lg px-3 py-2">
            <span className="text-zinc-400">🏋️ Training</span>
            <span className="text-white font-bold">{data.workout.exercises} exercises · +{data.workout.xp} XP</span>
          </div>
        )}
        {data.sleep > 0 && (
          <div className="flex items-center justify-between text-xs bg-zinc-800/50 rounded-lg px-3 py-2">
            <span className="text-zinc-400">😴 Sleep</span>
            <span className="text-white font-bold">{data.sleep}h</span>
          </div>
        )}
      </div>

      {/* Nudge (yesterday only) */}
      {nudge && (
        <div className="px-4 pb-3">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2">
            <p className="text-[11px] text-orange-300">{nudge}</p>
          </div>
        </div>
      )}

      {/* Dismiss (yesterday mode) */}
      {onDismiss && (
        <div className="px-4 pb-4">
          <button onClick={onDismiss} className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1">
            Looks good <Check size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
