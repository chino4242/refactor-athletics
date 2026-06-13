"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  userId: string;
}

export default function WeeklyRecapCard({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [recap, setRecap] = useState<{ totalVolume: number; workoutDays: number; topMember: string; topVolume: number; partyTotal: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show Mon-Tue (recap of last week)
    const day = new Date().getDay();
    if (day > 2 && day !== 0) return; // Show Sun-Tue only

    const dismissKey = `recap_dismissed_${new Date().toLocaleDateString('en-CA')}`;
    if (localStorage.getItem(dismissKey)) return;

    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      // Last week's date range
      const now = new Date();
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      const monStr = lastMonday.toLocaleDateString('en-CA');
      const sunStr = lastSunday.toLocaleDateString('en-CA');

      // Get user's group
      const { data: membership } = await supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1).single();

      // Your stats
      const { data: myWorkouts } = await supabase
        .from('workouts')
        .select('date, raw_value, sets, reps')
        .eq('user_id', userId)
        .gte('date', monStr)
        .lte('date', sunStr);

      const myVolume = (myWorkouts || []).reduce((s, w) => s + (w.raw_value || 0) * (w.sets || 1) * (w.reps || 1), 0);
      const myDays = new Set((myWorkouts || []).map(w => w.date)).size;

      if (myDays === 0 && !membership) return; // Nothing to show

      let topMember = '';
      let topVolume = 0;
      let partyTotal = 0;

      if (membership) {
        const { data: groupMembers } = await supabase
          .from('group_members')
          .select('user_id, users(display_name)')
          .eq('group_id', membership.group_id);

        const memberIds = (groupMembers || []).map((m: any) => m.user_id);
        const nameMap = new Map((groupMembers || []).map((m: any) => [m.user_id, m.users?.display_name || 'Member']));

        const { data: partyWorkouts } = await supabase
          .from('workouts')
          .select('user_id, raw_value, sets, reps')
          .in('user_id', memberIds)
          .gte('date', monStr)
          .lte('date', sunStr);

        const volByUser: Record<string, number> = {};
        for (const w of partyWorkouts || []) {
          volByUser[w.user_id] = (volByUser[w.user_id] || 0) + (w.raw_value || 0) * (w.sets || 1) * (w.reps || 1);
        }

        partyTotal = Object.values(volByUser).reduce((s, v) => s + v, 0);
        const sorted = Object.entries(volByUser).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          topMember = nameMap.get(sorted[0][0]) || 'Member';
          topVolume = sorted[0][1];
        }
      }

      setRecap({ totalVolume: Math.round(myVolume), workoutDays: myDays, topMember, topVolume: Math.round(topVolume), partyTotal: Math.round(partyTotal) });
    })();
  }, [userId]);

  if (!recap || dismissed) return null;

  const handleDismiss = () => {
    const dismissKey = `recap_dismissed_${new Date().toLocaleDateString('en-CA')}`;
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  return (
    <div className={`border ${colors.primary} bg-zinc-900 p-4 mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[8px] ${colors.secondary} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>★ LAST WEEK</p>
        <button onClick={handleDismiss} className="text-zinc-600 text-xs">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{recap.workoutDays}</p>
          <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>DAYS TRAINED</p>
        </div>
        <div>
          <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{recap.totalVolume.toLocaleString()}</p>
          <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>LBS LIFTED</p>
        </div>
      </div>
      {recap.partyTotal > 0 && (
        <div className="border-t border-zinc-800 pt-2 space-y-1">
          <p className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            PARTY: {recap.partyTotal.toLocaleString()} LBS TOTAL
          </p>
          {recap.topMember && (
            <p className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              👑 {recap.topMember} LED WITH {recap.topVolume.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
