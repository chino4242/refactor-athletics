'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculateRefactorScore, getDailyPowerUp, getPowerUpLabel, type ScoreInputs } from '@/utils/refactorScore';

interface RefactorScoreCardProps {
  userId: string;
  profile: any;
}

export default function RefactorScoreCard({ userId, profile }: RefactorScoreCardProps) {
  const [score, setScore] = useState<{ total: number; subScores: any[] } | null>(null);
  const [powerUp, setPowerUp] = useState<{ emoji: string; label: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');

      // Daily Power-Up
      const powerUpId = getDailyPowerUp(todayStr);
      setPowerUp(getPowerUpLabel(powerUpId));

      // Fetch 14 days of habit data for consistency
      const fourteenDaysAgo = new Date(today); fourteenDaysAgo.setDate(today.getDate() - 14);
      const { data: habits14d } = await supabase.from('habit_logs').select('date, habit_id, value')
        .eq('user_id', userId).gte('date', fourteenDaysAgo.toLocaleDateString('en-CA')).lte('date', todayStr);

      // Fetch 14 days of workouts for training + volume
      const fourteenDaysAgoTs = Math.floor(fourteenDaysAgo.getTime() / 1000);
      const nowTs = Math.floor(Date.now() / 1000);
      const { data: workouts14d } = await supabase.from('workouts').select('date, weight, reps, timestamp')
        .eq('user_id', userId).gte('timestamp', fourteenDaysAgoTs).lt('timestamp', nowTs);

      // Fetch 7 days of nutrition
      const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
      const { data: nutrition7d } = await supabase.from('nutrition_logs').select('date, macro_type, amount')
        .eq('user_id', userId).gte('date', sevenDaysAgo.toLocaleDateString('en-CA')).lte('date', todayStr);

      const { data: meals7d } = await supabase.from('meal_entries').select('date, protein')
        .eq('user_id', userId).gte('date', sevenDaysAgo.toLocaleDateString('en-CA')).lte('date', todayStr);

      // Body comp direction
      const { data: bodyComp } = await supabase.from('body_measurements').select('date, weight, body_fat_percentage')
        .eq('user_id', userId).order('date', { ascending: true }).limit(10);

      // --- Compute inputs ---
      const targets = profile?.habit_targets || {};
      const stepsTarget = targets.habit_steps || 10000;
      const sleepTarget = targets.habit_sleep || 7;
      const proteinTarget = profile?.nutrition_targets?.protein || 150;
      const netCalTarget = profile?.nutrition_targets?.net_calorie_target || -500;

      // Consistency: per-day target adherence
      const habitDays: ScoreInputs['habitDays'] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA');
        const dayHabits = (habits14d || []).filter(h => h.date === dateStr);
        const steps = dayHabits.find(h => h.habit_id === 'habit_steps')?.value || 0;
        const sleep = dayHabits.find(h => h.habit_id === 'habit_sleep')?.value || 0;
        let met = 0, total = 3;
        if (steps >= stepsTarget) met++;
        if (sleep >= sleepTarget) met++;
        // Check if any workout that day
        const dayWorkouts = (workouts14d || []).filter(w => w.date === dateStr);
        if (dayWorkouts.length > 0) met++;
        habitDays.push({ date: dateStr, targetsMet: met, targetsTotal: total });
      }

      // Training: this week vs last week volume
      const weekStart = new Date(today); weekStart.setDate(today.getDate() - 7);
      const prevWeekStart = new Date(today); prevWeekStart.setDate(today.getDate() - 14);
      const thisWeekWorkouts = (workouts14d || []).filter(w => new Date(w.date) >= weekStart);
      const prevWeekWorkouts = (workouts14d || []).filter(w => new Date(w.date) >= prevWeekStart && new Date(w.date) < weekStart);
      const weeklyVolume = thisWeekWorkouts.reduce((s, w) => s + (w.weight || 0) * (w.reps || 1), 0);
      const prevWeekVolume = prevWeekWorkouts.reduce((s, w) => s + (w.weight || 0) * (w.reps || 1), 0);
      const workoutDays = new Set(thisWeekWorkouts.map(w => w.date)).size;

      // Recovery
      const last7Sleep = (habits14d || []).filter(h => h.habit_id === 'habit_sleep' && new Date(h.date) >= sevenDaysAgo);
      const avgSleep = last7Sleep.length > 0 ? last7Sleep.reduce((s, h) => s + h.value, 0) / last7Sleep.length : 0;
      const hrvEntries = (habits14d || []).filter(h => h.habit_id === 'habit_hrv').sort((a, b) => a.date.localeCompare(b.date));
      let hrvTrend: 'up' | 'down' | 'flat' = 'flat';
      if (hrvEntries.length >= 4) {
        const firstHalf = hrvEntries.slice(0, Math.floor(hrvEntries.length / 2));
        const secondHalf = hrvEntries.slice(Math.floor(hrvEntries.length / 2));
        const avgFirst = firstHalf.reduce((s, h) => s + h.value, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, h) => s + h.value, 0) / secondHalf.length;
        hrvTrend = avgSecond > avgFirst * 1.05 ? 'up' : avgSecond < avgFirst * 0.95 ? 'down' : 'flat';
      }
      const restDays = 7 - workoutDays;

      // Nutrition
      let proteinDaysHit = 0, calorieDaysOnTarget = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA');
        const dayMeals = (meals7d || []).filter(m => m.date === dateStr);
        const dayProtein = dayMeals.reduce((s, m) => s + (m.protein || 0), 0);
        if (dayProtein >= proteinTarget) proteinDaysHit++;
        const dayNutrition = (nutrition7d || []).filter(n => n.date === dateStr);
        const calsIn = dayMeals.reduce((s, m) => s + ((m as any).calories || 0), 0) || dayNutrition.filter(n => n.macro_type !== 'calories_burned').reduce((s, n) => s + (n.amount || 0), 0) * 4;
        const calsBurned = dayNutrition.filter(n => n.macro_type === 'calories_burned').reduce((s, n) => s + (n.amount || 0), 0);
        if (calsIn - calsBurned <= netCalTarget + 200) calorieDaysOnTarget++; // 200 cal buffer
      }

      // Body Recomp
      let recompDirection: 'positive' | 'negative' | 'flat' = 'flat';
      const recompWeeksTracked = bodyComp?.length || 0;
      if (bodyComp && bodyComp.length >= 2) {
        const first = bodyComp[0];
        const last = bodyComp[bodyComp.length - 1];
        const wantLoseWeight = (profile?.body_composition_goals?.target_weight || 0) < (profile?.bodyweight || 999);
        const weightDelta = (last.weight || 0) - (first.weight || 0);
        const fatDelta = (last.body_fat_percentage || 0) - (first.body_fat_percentage || 0);
        if (wantLoseWeight) {
          recompDirection = (weightDelta < 0 || fatDelta < 0) ? 'positive' : weightDelta > 2 ? 'negative' : 'flat';
        } else {
          recompDirection = (weightDelta > 0 && fatDelta <= 0) ? 'positive' : fatDelta > 2 ? 'negative' : 'flat';
        }
      }

      const inputs: ScoreInputs = {
        habitDays, weeklyVolume, prevWeekVolume, workoutsThisWeek: workoutDays,
        avgSleep, sleepTarget, hrvTrend, restDaysThisWeek: restDays,
        proteinDaysHit, calorieDaysOnTarget,
        recompDirection, recompWeeksTracked,
      };

      setScore(calculateRefactorScore(inputs));
    };
    load();
  }, [userId, profile]);

  if (!score) return null;

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp size={10} className="text-emerald-400" />;
    if (trend === 'down') return <TrendingDown size={10} className="text-rose-400" />;
    return <Minus size={10} className="text-zinc-500" />;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      {/* Power-Up Banner */}
      {powerUp && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-400">⚡ Daily Power-Up: {powerUp.emoji} {powerUp.label}</span>
          <span className="text-[10px] text-amber-500/70">2x XP</span>
        </div>
      )}

      {/* Composite Score */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Refactor Score</div>
          <div className="text-3xl font-black text-white">{score.total}<span className="text-lg text-zinc-500">/100</span></div>
        </div>
        <div className="w-16 h-16 rounded-full border-4 border-zinc-700 flex items-center justify-center relative">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#f97316" strokeWidth="3"
              strokeDasharray={`${score.total} ${100 - score.total}`} strokeLinecap="round" />
          </svg>
          <span className="text-xs font-bold text-orange-400">{score.total}%</span>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-5 gap-1.5">
        {score.subScores.map((sub: any) => (
          <div key={sub.label} className="text-center">
            <div className="text-sm mb-0.5">{sub.emoji}</div>
            <div className="text-[11px] font-bold text-white">{sub.score}</div>
            <div className="flex justify-center"><TrendIcon trend={sub.trend} /></div>
            <div className="text-[8px] text-zinc-500 mt-0.5">{sub.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
