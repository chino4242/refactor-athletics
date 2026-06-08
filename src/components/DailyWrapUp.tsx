'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { xpToLevel } from '@/utils/xp';

interface DailyWrapUpProps {
  userId: string;
  mode: 'today' | 'yesterday';
  onDismiss?: () => void;
  stats?: { player_level?: number; level_progress_percent?: number; xp_to_next_level?: number; total_career_xp?: number; highest_daily_xp?: number } | null;
}

interface WrapUpData {
  date: string;
  xpItems: { source_label: string; amount: number }[];
  totalXp: number;
  steps: number;
  sleep: number;
  macros: { protein: number; carbs: number; fat: number; calories: number; caloriesBurned: number };
  workout: { name: string; exercises: number; xp: number } | null;
  streak: number;
  targets: { steps: number; sleep: number; protein: number; water: number; exercise_minutes: number };
  hiddenHabits: string[];
}

function getHeroStat(data: WrapUpData): { emoji: string; value: string; label: string } | null {
  // Pick the most impressive stat — highest absolute value that's meaningful
  const candidates: { emoji: string; value: string; label: string; priority: number }[] = [];
  if (data.workout) candidates.push({ emoji: '🏋️', value: `${data.workout.exercises} exercises`, label: 'trained', priority: data.workout.xp });
  if (data.steps >= 5000) candidates.push({ emoji: '🏃', value: data.steps.toLocaleString(), label: 'steps', priority: data.steps / 100 });
  if (data.sleep >= 7) candidates.push({ emoji: '😴', value: `${data.sleep}h`, label: 'sleep', priority: data.sleep * 5 });
  if (data.macros.protein >= 100) candidates.push({ emoji: '🥩', value: `${data.macros.protein}g`, label: 'protein', priority: data.macros.protein / 3 });
  if (candidates.length === 0 && data.totalXp > 0) return { emoji: '⚡', value: `${data.totalXp}`, label: 'XP earned' };
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0] || null;
}

// Theme-voiced recap messages keyed by theme ID
const THEMED_RECAPS: Record<string, { active: string[]; rest: string[] }> = {
  athlete: {
    active: ['Solid day in the books.', 'That\'s how champions are built.', 'Another day, another edge.'],
    rest: ['Recovery is part of the game.', 'Even pros take rest days.'],
  },
  dragon: {
    active: ['The hoard grows. Your power swells.', 'Fire coursed through you yesterday.', 'The wyrm stirs — stronger.'],
    rest: ['The dragon rests between hunts.', 'Even flame needs fuel to burn.'],
  },
  samurai: {
    active: ['Discipline honored. The path continues.', 'A worthy day on the warrior\'s road.', 'Your blade grew sharper.'],
    rest: ['The samurai meditates between battles.', 'Stillness sharpens the mind.'],
  },
  dinosaur: {
    active: ['The predator fed well.', 'You moved. You hunted. You grew.', 'Evolution favors the relentless.'],
    rest: ['Even apex predators conserve energy.', 'The hunt resumes tomorrow.'],
  },
  viking: {
    active: ['The forge burned bright.', 'A saga worth telling.', 'Odin watched — and nodded.'],
    rest: ['The warrior rests by the fire.', 'Mead and rest before the next raid.'],
  },
};

function generateThemedReflection(data: WrapUpData, themeKey: string): string {
  const isActive = data.workout || data.steps >= 7500 || data.totalXp >= 50;
  const recaps = THEMED_RECAPS[themeKey];
  if (!recaps) return generateReflection(data); // fallback for classic mode
  const pool = isActive ? recaps.active : recaps.rest;
  // Deterministic pick based on date to avoid randomness on re-render
  const dayNum = parseInt(data.date.replace(/-/g, ''), 10);
  return pool[dayNum % pool.length];
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
  const { steps, sleep, protein } = data.targets;
  const hidden = data.hiddenHabits;
  if (!hidden.includes('habit_steps') && data.steps > 0 && data.steps < steps) return `${data.steps.toLocaleString()} of ${steps.toLocaleString()} steps. A short walk gets you there.`;
  if (!hidden.includes('macro_protein') && data.macros.protein > 0 && data.macros.protein < protein) return `${data.macros.protein}g of ${protein}g protein — try a shake or extra serving today.`;
  if (!hidden.includes('habit_sleep') && data.sleep > 0 && data.sleep < sleep) return `${data.sleep}h of ${sleep}h sleep. Wind down 30 min earlier tonight.`;
  if (!data.workout) return 'No workout logged. Even 20 minutes counts.';
  return null;
}

export default function DailyWrapUp({ userId, mode, onDismiss, stats }: DailyWrapUpProps) {
  const [data, setData] = useState<WrapUpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { currentTheme } = useTheme();
  const { isClassic } = useExperienceMode();

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

      const { data: habits } = await supabase
        .from('habit_logs').select('habit_id, value')
        .eq('user_id', userId).eq('date', dateStr);

      const { data: userProfile } = await supabase
        .from('users').select('habit_targets, nutrition_targets, hidden_habits')
        .eq('id', userId).single();

      const { data: nutrition } = await supabase
        .from('nutrition_logs').select('macro_type, amount')
        .eq('user_id', userId).eq('date', dateStr);

      const { data: workouts } = await supabase
        .from('workouts').select('exercise_id, xp')
        .eq('user_id', userId).gte('timestamp', dayStart).lt('timestamp', dayEnd);

      const steps = habits?.find(h => h.habit_id === 'habit_steps')?.value || 0;
      const sleep = habits?.find(h => h.habit_id === 'habit_sleep')?.value || 0;

      const macros = { protein: 0, carbs: 0, fat: 0, calories: 0, caloriesBurned: 0 };
      for (const n of nutrition || []) {
        if (n.macro_type === 'protein') macros.protein += n.amount;
        if (n.macro_type === 'carbs') macros.carbs += n.amount;
        if (n.macro_type === 'fat') macros.fat += n.amount;
        if (n.macro_type === 'calories_burned') macros.caloriesBurned += n.amount;
      }

      const { data: mealCals } = await supabase.from('meal_entries')
        .select('calories, protein, carbs, fat')
        .eq('user_id', userId).eq('date', dateStr);
      if (mealCals?.length) {
        macros.calories = Math.round(mealCals.reduce((s: number, m: any) =>
          s + (m.calories || ((m.protein || 0) * 4 + (m.carbs || 0) * 4 + (m.fat || 0) * 9)), 0));
      } else {
        macros.calories = Math.round((macros.protein * 4) + (macros.carbs * 4) + (macros.fat * 9));
      }

      const workout = workouts?.length ? {
        name: 'Workout',
        exercises: new Set(workouts.map(w => w.exercise_id)).size,
        xp: workouts.reduce((s, w) => s + (w.xp || 0), 0),
      } : null;

      const { getTodayXp } = await import('@/utils/getTodayXp');
      const { xpItems, totalXp } = await getTodayXp(userId, targetDate);

      // Calculate streak: consecutive days with any activity (working backwards from target date)
      let streak = 0;
      if (totalXp > 0) {
        const { data: recentDays } = await supabase
          .from('habit_logs').select('date')
          .eq('user_id', userId)
          .lte('date', dateStr)
          .order('date', { ascending: false })
          .limit(90);
        if (recentDays?.length) {
          const activeDates = new Set(recentDays.map(r => r.date));
          const d = new Date(targetDate);
          while (activeDates.has(d.toLocaleDateString('en-CA'))) {
            streak++;
            d.setDate(d.getDate() - 1);
          }
        }
      }

      const targets = {
        steps: userProfile?.habit_targets?.habit_steps || 10000,
        sleep: userProfile?.habit_targets?.habit_sleep || 7,
        protein: userProfile?.nutrition_targets?.protein || 150,
        water: userProfile?.nutrition_targets?.water || userProfile?.habit_targets?.habit_water || 100,
        exercise_minutes: userProfile?.habit_targets?.habit_exercise_minutes || 30,
      };
      const hiddenHabits: string[] = userProfile?.hidden_habits || [];

      setData({ date: dateStr, xpItems, totalXp, steps, sleep, macros, workout, streak, targets, hiddenHabits });
      setLoading(false);
    };
    load();
  }, [userId, mode]);

  if (loading) return null;
  if (!data || (data.totalXp === 0 && !data.workout && data.steps === 0)) return null;

  const dateLabel = mode === 'yesterday'
    ? `Yesterday, ${new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'Today So Far';

  const reflection = isClassic ? generateReflection(data) : generateThemedReflection(data, currentTheme);
  const nudge = mode === 'yesterday' ? generateNudge(data) : null;
  const hero = getHeroStat(data);
  const xpLabel = isClassic ? 'pts' : 'XP';
  const progressPercent = stats?.level_progress_percent ?? 0;
  const level = stats?.player_level ?? 1;
  const xpToNext = stats?.xp_to_next_level ?? 0;

  // Detect if yesterday's XP caused a level-up
  const totalCareerXp = stats?.total_career_xp ?? 0;
  const leveledUp = totalCareerXp > 0 && data.totalXp > 0 &&
    xpToLevel(totalCareerXp - data.totalXp).level < xpToLevel(totalCareerXp).level;
  const bestDay = stats?.highest_daily_xp ?? 0;

  // Habit checkmarks — dynamic based on user's visible habits with targets
  const checks: { emoji: string; label: string; met: boolean }[] = [];
  const hidden = data.hiddenHabits;
  if (data.sleep > 0 && !hidden.includes('habit_sleep')) checks.push({ emoji: '😴', label: `${data.sleep}h`, met: data.sleep >= data.targets.sleep });
  if (data.steps > 0 && !hidden.includes('habit_steps')) checks.push({ emoji: '👟', label: `${(data.steps / 1000).toFixed(1)}k`, met: data.steps >= data.targets.steps });
  if (data.macros.protein > 0 && !hidden.includes('macro_protein')) checks.push({ emoji: '🥩', label: `${data.macros.protein}g`, met: data.macros.protein >= data.targets.protein });
  if (data.workout) checks.push({ emoji: '🏋️', label: 'Trained', met: true });
  if (data.macros.calories > 0 && !hidden.includes('macro_calories')) checks.push({ emoji: '🥗', label: 'Logged', met: true });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header + Dismiss */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{dateLabel}</span>
        {onDismiss && <button onClick={onDismiss} className="text-zinc-600 hover:text-zinc-400 p-1"><X size={14} /></button>}
      </div>

      {/* Hero Stat */}
      {hero && (
        <div className="px-4 pt-2 pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl">{hero.emoji}</span>
            <span className="text-2xl font-black text-white">{hero.value}</span>
            <span className="text-sm text-zinc-400">{hero.label}</span>
          </div>
        </div>
      )}

      {/* Reflection — theme-voiced */}
      <div className="px-4 pb-3">
        <p className="text-[13px] text-zinc-400 italic">{reflection}</p>
      </div>

      {/* XP Progress / Level-Up Celebration */}
      <div className="px-4 pb-3">
        {leveledUp ? (
          <div className="text-center py-2">
            <div className="text-2xl mb-1">🎉</div>
            <div className="text-sm font-black text-amber-400">Level {level} Reached!</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">+{data.totalXp} {xpLabel} pushed you over the edge</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-400">+{data.totalXp} {xpLabel}</span>
              <span className="text-[10px] text-zinc-500">
                {xpToNext > 0 ? `${xpToNext.toLocaleString()} to Lv ${level + 1}` : `Level ${level}`}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressPercent * 100, 100)}%` }}
              />
            </div>
            {bestDay > 0 && data.totalXp > 0 && (
              <div className="text-[10px] text-zinc-500 mt-1.5">
                {data.totalXp >= bestDay
                  ? '⭐ New personal best!'
                  : `Your best: ${bestDay} ${xpLabel}`}
              </div>
            )}
          </>
        )}
      </div>

      {/* Habit Checkmarks — compact row */}
      {checks.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
          {checks.map((c, i) => (
            <span key={i} className={`text-[11px] font-medium flex items-center gap-1 ${c.met ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {c.met ? <Check size={10} className="text-emerald-500" /> : <span className="w-2.5" />}
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
      )}

      {/* Streak Callout */}
      {data.streak >= 2 && (
        <div className="px-4 pb-3">
          <span className="text-[11px] font-bold text-amber-400">🔥 {data.streak}-day streak</span>
        </div>
      )}

      {/* Expandable XP Breakdown */}
      {data.xpItems.length > 0 && (
        <div className="px-4 pb-2">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400 uppercase tracking-wider font-bold">
            {expanded ? 'Hide' : 'Details'}
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {data.xpItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{item.source_label}</span>
                  <span className="text-amber-400/80 font-medium">+{item.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nudge */}
      {nudge && (
        <div className="px-4 pb-3">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2">
            <p className="text-[11px] text-orange-300">{nudge}</p>
          </div>
        </div>
      )}

      {/* Dismiss */}
      {onDismiss && (
        <div className="px-4 pb-4 pt-1">
          <button onClick={onDismiss} className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1">
            Onward <ChevronDown size={12} className="rotate-[-90deg]" />
          </button>
        </div>
      )}
    </div>
  );
}
