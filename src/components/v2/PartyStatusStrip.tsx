"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  userId: string;
}

interface MemberStatus {
  userId: string;
  displayName: string;
  trainedToday: boolean;
  powerLevel: number;
  lastTrained: string | null;
}

export default function PartyStatusStrip({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [selected, setSelected] = useState<MemberStatus | null>(null);

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      // Get user's group
      const { data: membership } = await supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1).single();
      if (!membership) return;

      // Get all members
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id, users(display_name)')
        .eq('group_id', membership.group_id);

      if (!groupMembers?.length) return;

      const memberIds = groupMembers.map((m: any) => m.user_id);
      const today = new Date().toLocaleDateString('en-CA');

      // Get today's workouts for all members
      const { data: todayWorkouts } = await supabase
        .from('workouts')
        .select('user_id, date')
        .in('user_id', memberIds)
        .eq('date', today);

      const trainedSet = new Set((todayWorkouts || []).map((w: any) => w.user_id));

      const statuses: MemberStatus[] = groupMembers.map((m: any) => ({
        userId: m.user_id,
        displayName: m.users?.display_name || 'Member',
        trainedToday: trainedSet.has(m.user_id),
        powerLevel: 0,
        lastTrained: trainedSet.has(m.user_id) ? 'Today' : null,
      }));

      // Sort: trained today first, then alphabetical
      statuses.sort((a, b) => (b.trainedToday ? 1 : 0) - (a.trainedToday ? 1 : 0) || a.displayName.localeCompare(b.displayName));
      setMembers(statuses);
    })();
  }, [userId]);

  if (members.length === 0) return null;

  return (
    <div className="mb-3">
      {/* Avatar row */}
      <div className="flex items-center gap-2 px-1">
        <p className="text-[10px] text-zinc-600 mr-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>PARTY</p>
        {members.map(m => (
          <button
            key={m.userId}
            onClick={() => setSelected(selected?.userId === m.userId ? null : m)}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all ${
              m.trainedToday
                ? `${colors.primary} bg-zinc-800 text-white`
                : 'border-zinc-700 bg-zinc-900 text-zinc-600'
            } ${m.trainedToday ? 'ring-1 ring-green-500/40' : ''}`}
          >
            {m.displayName.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Selected member detail */}
      {selected && (
        <div className={`mt-2 border ${colors.border} bg-zinc-800/50 px-3 py-2 flex items-center justify-between`}>
          <div>
            <p className="text-xs text-white font-medium">{selected.displayName}</p>
            <p className="text-[10px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {selected.trainedToday ? '✓ TRAINED TODAY' : 'NOT YET TODAY'}
            </p>
          </div>
          {!selected.trainedToday && selected.userId !== userId ? (
            <button
              onClick={async () => {
                await fetch('/api/challenge-75', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'nudge', target_user_id: selected.userId }) });
                setSelected(null);
              }}
              className={`text-[10px] px-2 py-1 border ${colors.border} bg-zinc-900 text-zinc-400 hover:text-white transition-colors`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              👊 NUDGE
            </button>
          ) : (
            <span className={`text-[8px] ${selected.trainedToday ? 'text-green-400' : 'text-zinc-600'}`}>
              {selected.trainedToday ? '🔥' : '○'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
