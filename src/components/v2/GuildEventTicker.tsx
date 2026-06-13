"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  userId: string;
}

interface GuildEvent {
  id: string;
  text: string;
  timestamp: number;
  type: 'rankup' | 'workout' | 'bounty' | 'challenge';
}

export default function GuildEventTicker({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [expanded, setExpanded] = useState(false);

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
      const nameMap = new Map(groupMembers.map((m: any) => [m.user_id, m.users?.display_name || 'Member']));
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');

      // Fetch rank-ups (workouts with level > 0, recent)
      const { data: rankUps } = await supabase
        .from('workouts')
        .select('user_id, exercise_id, level, date, timestamp')
        .in('user_id', memberIds)
        .gt('level', 2)
        .gte('date', sevenDaysAgo)
        .order('timestamp', { ascending: false })
        .limit(10);

      // Fetch recent workout days (unique user+date combos)
      const { data: recentWorkouts } = await supabase
        .from('workouts')
        .select('user_id, date')
        .in('user_id', memberIds)
        .gte('date', sevenDaysAgo)
        .neq('user_id', userId);

      // Build events
      const evts: GuildEvent[] = [];

      // Rank-ups
      for (const r of rankUps || []) {
        const name = nameMap.get(r.user_id) || 'Member';
        const exName = (r.exercise_id || '').replace(/_/g, ' ');
        evts.push({
          id: `rank_${r.user_id}_${r.exercise_id}_${r.date}`,
          text: `${name} ranked up ${exName} → LV${r.level}`,
          timestamp: r.timestamp,
          type: 'rankup',
        });
      }

      // Workout days (deduplicate by user+date)
      const seen = new Set<string>();
      for (const w of recentWorkouts || []) {
        const key = `${w.user_id}_${w.date}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const name = nameMap.get(w.user_id) || 'Member';
        evts.push({
          id: `workout_${key}`,
          text: `${name} trained`,
          timestamp: new Date(w.date + 'T12:00:00').getTime() / 1000,
          type: 'workout',
        });
      }

      // Sort by timestamp descending, limit to 15
      evts.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(evts.slice(0, 15));
    })();
  }, [userId]);

  if (events.length === 0) return null;

  const displayed = expanded ? events : events.slice(0, 3);

  return (
    <div className={`border ${colors.border} bg-zinc-900/50 p-3 mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[7px] text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>GUILD LOG</p>
        {events.length > 3 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[7px] text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {expanded ? '▴ LESS' : `▾ ${events.length} EVENTS`}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {displayed.map(evt => (
          <div key={evt.id} className="flex items-center gap-2">
            <span className="text-[8px]">
              {evt.type === 'rankup' ? '⚔' : evt.type === 'bounty' ? '★' : '◆'}
            </span>
            <p className="text-[8px] text-zinc-400 flex-1 truncate" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {evt.text}
            </p>
            <span className="text-[7px] text-zinc-600">{timeAgo(evt.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
