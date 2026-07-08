"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface SummaryData {
  xp: number;
  exercises: number;
  rankUps: number;
  streak: number;
  streakPhase: string;
  bountiesCompleted: number;
  bountiesTotal: number;
  campaignPassed: boolean | null;
  duelWon: boolean | null;
  steps: number;
}

interface Props {
  userId: string;
  onDismiss: () => void;
}

export default function DailySummary({ userId, onDismiss }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
      const yesterdayStart = new Date(yesterday + 'T00:00:00').toISOString();
      const yesterdayEnd = new Date(yesterday + 'T23:59:59').toISOString();

      const weekStart = new Date(yesterday);
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - ((day + 6) % 7));
      const weekStartStr = weekStart.toLocaleDateString('en-CA');

      const [{ data: xpData }, { data: workouts }, { data: habits }, { data: bounties }] = await Promise.all([
        supabase.from('xp_ledger').select('amount').eq('user_id', userId).gte('created_at', yesterdayStart).lte('created_at', yesterdayEnd),
        supabase.from('workouts').select('level, exercise_id').eq('user_id', userId).eq('date', yesterday),
        supabase.from('habit_logs').select('habit_id, value').eq('user_id', userId).eq('date', yesterday),
        supabase.from('weekly_bounties').select('completed').eq('user_id', userId).eq('week_start', weekStartStr),
      ]);

      const xp = (xpData || []).reduce((s, r: any) => s + (r.amount || 0), 0);
      const exercises = new Set((workouts || []).map((w: any) => w.exercise_id)).size;
      const rankUps = (workouts || []).filter((w: any) => w.level > 0).length;
      const steps = (habits || []).filter((h: any) => h.habit_id === 'habit_steps').reduce((s, h: any) => s + (h.value || 0), 0);

      // Streak
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toLocaleDateString('en-CA');
      const { data: streakData } = await supabase.from('workouts').select('date').eq('user_id', userId).gte('date', sixtyDaysAgo);
      const streakDates = new Set((streakData || []).map((w: any) => w.date));
      let streak = 0;
      let checkDay = streakDates.has(yesterday) ? new Date(Date.now() - 86400000) : new Date(Date.now() - 2 * 86400000);
      while (streakDates.has(checkDay.toLocaleDateString('en-CA'))) { streak++; checkDay.setDate(checkDay.getDate() - 1); }

      const streakPhase = streak >= 30 ? 'Eternal' : streak >= 14 ? 'Relentless' : streak >= 7 ? 'Forged' : streak >= 3 ? 'Burning' : streak >= 1 ? 'Spark' : '';

      // Bounties
      const bountiesCompleted = (bounties || []).filter((b: any) => b.completed).length;
      const bountiesTotal = (bounties || []).length;

      if (xp === 0 && exercises === 0) { onDismiss(); return; }

      setData({ xp, exercises, rankUps, streak, streakPhase, bountiesCompleted, bountiesTotal, campaignPassed: null, duelWon: null, steps });
    })();
  }, [userId, onDismiss]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/95" />
      <div className="relative text-center space-y-5 px-8 max-w-sm w-full animate-in fade-in zoom-in duration-500" onClick={e => e.stopPropagation()}>
        <p className={`text-xs ${colors.secondary} uppercase tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          YESTERDAY&apos;S JOURNEY
        </p>

        {/* XP earned */}
        <div>
          <p className="text-3xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            +{data.xp.toLocaleString()} XP
          </p>
          {data.streakPhase && (
            <p className="text-xs text-amber-400 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              🔥 {data.streakPhase} — Day {data.streak}
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {data.exercises > 0 && (
            <div className={`border ${colors.border} bg-zinc-900 p-3`}>
              <p className="text-xs text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>Exercises</p>
              <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{data.exercises}</p>
            </div>
          )}
          {data.rankUps > 0 && (
            <div className={`border ${colors.border} bg-zinc-900 p-3`}>
              <p className="text-xs text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>Rank-Ups</p>
              <p className="text-lg text-amber-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>{data.rankUps}</p>
            </div>
          )}
          {data.steps > 0 && (
            <div className={`border ${colors.border} bg-zinc-900 p-3`}>
              <p className="text-xs text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>Steps</p>
              <p className="text-lg text-emerald-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>{data.steps.toLocaleString()}</p>
            </div>
          )}
          {data.bountiesTotal > 0 && (
            <div className={`border ${colors.border} bg-zinc-900 p-3`}>
              <p className="text-xs text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>Bounties</p>
              <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{data.bountiesCompleted}/{data.bountiesTotal}</p>
            </div>
          )}
        </div>

        {/* Creature line */}
        <p className="text-xs text-zinc-500 italic">
          {currentTheme === 'samurai' ? '"Yesterday earned its place. Today begins clean."' :
           currentTheme === 'dragon' ? '"The fire remembers what you fed it yesterday."' :
           currentTheme === 'viking' ? '"Another day carved into the saga."' :
           currentTheme === 'dinosaur' ? '"The pack moved well yesterday. Again today."' :
           '"Good work yesterday. Fresh start today."'}
        </p>

        <button onClick={onDismiss} className={`text-xs px-6 py-3 border ${colors.primary} bg-zinc-800 ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          BEGIN TODAY
        </button>
      </div>
    </div>
  );
}
