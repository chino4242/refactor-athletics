"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  userId: string;
}

interface RecapData {
  workoutDays: number;
  totalVolume: number;
  totalXp: number;
  rankUps: { name: string; level: number }[];
  bestLift: { name: string; value: number } | null;
  exercisesSynced: number;
  partyTotal: number;
  topMember: string;
  topVolume: number;
}

export default function WeeklyRecapCard({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [slide, setSlide] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show Sun-Tue (recap of last week)
    const day = new Date().getDay();
    if (day > 2 && day !== 0) return;

    const dismissKey = `recap_dismissed_${new Date().toLocaleDateString('en-CA')}`;
    if (localStorage.getItem(dismissKey)) return;

    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const now = new Date();
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      const monStr = lastMonday.toLocaleDateString('en-CA');
      const sunStr = lastSunday.toLocaleDateString('en-CA');

      const [{ data: workouts }, { data: xpData }] = await Promise.all([
        supabase.from('workouts').select('date, exercise_id, raw_value, sets, level').eq('user_id', userId).gte('date', monStr).lte('date', sunStr),
        supabase.from('xp_ledger').select('amount').eq('user_id', userId).gte('created_at', lastMonday.toISOString()).lte('created_at', lastSunday.toISOString()),
      ]);

      const myDays = new Set((workouts || []).map(w => w.date)).size;
      if (myDays === 0) return;

      // Volume from sets array
      const totalVolume = (workouts || []).reduce((s, w) => {
        if (Array.isArray(w.sets)) return s + w.sets.reduce((ss: number, set: any) => ss + ((set.weight || 0) * (set.reps || 1)), 0);
        return s + (w.raw_value || 0);
      }, 0);

      // Total XP
      const totalXp = (xpData || []).reduce((s, e) => s + (e.amount || 0), 0);

      // Rank-ups
      const rankUps = (workouts || []).filter(w => w.level > 0 && !w.exercise_id.startsWith('synced_'))
        .reduce((acc: { name: string; level: number }[], w) => {
          const name = w.exercise_id.replace(/_/g, ' ');
          if (!acc.some(r => r.name === name)) acc.push({ name, level: w.level });
          return acc;
        }, []);

      // Best lift (highest raw_value, non-synced)
      const lifts = (workouts || []).filter(w => w.raw_value > 0 && !w.exercise_id.startsWith('synced_'));
      const best = lifts.length > 0 ? lifts.reduce((a, b) => (b.raw_value || 0) > (a.raw_value || 0) ? b : a) : null;
      const bestLift = best ? { name: best.exercise_id.replace(/_/g, ' '), value: Math.round(best.raw_value) } : null;

      // Synced exercises
      const exercisesSynced = (workouts || []).filter(w => w.exercise_id.startsWith('synced_')).length;

      // Party stats
      let topMember = '', topVolume = 0, partyTotal = 0;
      const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1);
      const membership = memberships?.[0];
      if (membership) {
        const { data: groupMembers } = await supabase.from('group_members').select('user_id, users(display_name)').eq('group_id', membership.group_id);
        const memberIds = (groupMembers || []).map((m: any) => m.user_id);
        const nameMap = new Map((groupMembers || []).map((m: any) => [m.user_id, m.users?.display_name || 'Member']));
        const { data: partyWorkouts } = await supabase.from('workouts').select('user_id, raw_value, sets').in('user_id', memberIds).gte('date', monStr).lte('date', sunStr);
        const volByUser: Record<string, number> = {};
        for (const w of partyWorkouts || []) {
          const vol = Array.isArray(w.sets) ? w.sets.reduce((ss: number, set: any) => ss + ((set.weight || 0) * (set.reps || 1)), 0) : (w.raw_value || 0);
          volByUser[w.user_id] = (volByUser[w.user_id] || 0) + vol;
        }
        partyTotal = Object.values(volByUser).reduce((s, v) => s + v, 0);
        const sorted = Object.entries(volByUser).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) { topMember = nameMap.get(sorted[0][0]) || 'Member'; topVolume = Math.round(sorted[0][1]); }
      }

      setRecap({ workoutDays: myDays, totalVolume: Math.round(totalVolume), totalXp, rankUps, bestLift, exercisesSynced, partyTotal: Math.round(partyTotal), topMember, topVolume });
    })();
  }, [userId]);

  if (!recap || dismissed) return null;

  // Build slides
  const slides: { title: string; content: React.ReactNode }[] = [
    { title: 'OVERVIEW', content: (
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{recap.workoutDays}</p>
          <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>DAYS</p>
        </div>
        <div>
          <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{recap.totalVolume.toLocaleString()}</p>
          <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>LBS</p>
        </div>
        <div>
          <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{recap.totalXp.toLocaleString()}</p>
          <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>XP</p>
        </div>
      </div>
    )},
  ];

  if (recap.bestLift) {
    slides.push({ title: 'BEST LIFT', content: (
      <div className="text-center">
        <p className="text-2xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{recap.bestLift.value} lbs</p>
        <p className="text-[9px] text-zinc-400 mt-1 capitalize">{recap.bestLift.name}</p>
      </div>
    )});
  }

  if (recap.rankUps.length > 0) {
    slides.push({ title: 'RANK UPS', content: (
      <div className="space-y-1 text-center">
        {recap.rankUps.slice(0, 3).map((r, i) => (
          <p key={i} className="text-[10px] text-white capitalize">⬆ {r.name} → Lv.{r.level}</p>
        ))}
      </div>
    )});
  }

  if (recap.partyTotal > 0) {
    slides.push({ title: 'PARTY', content: (
      <div className="text-center space-y-1">
        <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{recap.partyTotal.toLocaleString()} lbs</p>
        <p className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>PARTY TOTAL</p>
        {recap.topMember && <p className="text-[8px] text-zinc-400">👑 {recap.topMember} led with {recap.topVolume.toLocaleString()}</p>}
      </div>
    )});
  }

  const handleDismiss = () => {
    localStorage.setItem(`recap_dismissed_${new Date().toLocaleDateString('en-CA')}`, '1');
    setDismissed(true);
  };

  return (
    <div className={`border ${colors.primary} bg-zinc-900 p-4 mb-4 relative`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-[8px] ${colors.secondary} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>★ LAST WEEK · {slides[slide].title}</p>
        <button onClick={handleDismiss} className="text-zinc-600 text-xs">✕</button>
      </div>

      {/* Slide content */}
      <div className="min-h-[50px] flex items-center justify-center">
        {slides[slide].content}
      </div>

      {/* Dots + swipe */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className={`w-1.5 h-1.5 rounded-full ${i === slide ? 'bg-white' : 'bg-zinc-700'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
