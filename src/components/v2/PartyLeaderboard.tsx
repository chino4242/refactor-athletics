"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  userId: string;
}

interface MemberPL {
  userId: string;
  name: string;
  powerLevel: number;
  weekDelta: number;
  isYou: boolean;
}

export default function PartyLeaderboard({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [members, setMembers] = useState<MemberPL[]>([]);

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1);
      const membership = memberships?.[0];
      if (!membership) return;

      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id, users(display_name)')
        .eq('group_id', membership.group_id);

      if (!groupMembers?.length || groupMembers.length < 2) return;

      const memberIds = groupMembers.map((m: any) => m.user_id);
      const nameMap = new Map(groupMembers.map((m: any) => [m.user_id, m.users?.display_name || 'Member']));

      // Get current power levels (count of ranked exercises with level > 0 in last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
      const { data: workouts } = await supabase
        .from('workouts')
        .select('user_id, exercise_id, level')
        .in('user_id', memberIds)
        .gt('level', 0)
        .gte('date', ninetyDaysAgo);

      // Calculate PL per member (max level per exercise, summed)
      const plByUser: Record<string, Map<string, number>> = {};
      for (const w of workouts || []) {
        if (!plByUser[w.user_id]) plByUser[w.user_id] = new Map();
        const current = plByUser[w.user_id].get(w.exercise_id) || 0;
        if (w.level > current) plByUser[w.user_id].set(w.exercise_id, w.level);
      }

      // Week delta: compare to 7 days ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
      const { data: lastWeekWorkouts } = await supabase
        .from('workouts')
        .select('user_id, exercise_id, level')
        .in('user_id', memberIds)
        .gt('level', 0)
        .gte('date', ninetyDaysAgo)
        .lt('date', sevenDaysAgo);

      const plLastWeek: Record<string, Map<string, number>> = {};
      for (const w of lastWeekWorkouts || []) {
        if (!plLastWeek[w.user_id]) plLastWeek[w.user_id] = new Map();
        const current = plLastWeek[w.user_id].get(w.exercise_id) || 0;
        if (w.level > current) plLastWeek[w.user_id].set(w.exercise_id, w.level);
      }

      const results: MemberPL[] = memberIds.map(uid => {
        const currentPL = Array.from(plByUser[uid]?.values() || []).reduce((s, v) => s + v, 0);
        const prevPL = Array.from(plLastWeek[uid]?.values() || []).reduce((s, v) => s + v, 0);
        return {
          userId: uid,
          name: nameMap.get(uid) || 'Member',
          powerLevel: currentPL,
          weekDelta: currentPL - prevPL,
          isYou: uid === userId,
        };
      });

      results.sort((a, b) => b.powerLevel - a.powerLevel);
      setMembers(results);
    })();
  }, [userId]);

  if (members.length < 2) return null;

  return (
    <div className={`border ${colors.border} bg-zinc-900/50 p-3 mb-4`}>
      <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>PARTY POWER</p>
      <div className="space-y-1.5">
        {members.map((m, i) => (
          <div key={m.userId} className={`flex items-center justify-between px-2 py-1 ${m.isYou ? `border ${colors.border} bg-zinc-800/50` : ''}`}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 w-3">{i + 1}.</span>
              <span className={`text-xs ${m.isYou ? 'text-white' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{m.name}{m.isYou ? ' (YOU)' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${m.isYou ? colors.secondary : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>PL {m.powerLevel}</span>
              {m.weekDelta !== 0 && (
                <span className={`text-xs ${m.weekDelta > 0 ? 'text-green-400' : 'text-red-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  {m.weekDelta > 0 ? '▲' : '▼'}{Math.abs(m.weekDelta)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
