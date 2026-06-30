"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  userId: string;
}

interface MemberActivity {
  userId: string;
  name: string;
  isYou: boolean;
  xp: number | null;
  protein: number | null;
  proteinTarget: number | null;
  steps: number | null;
  trained: boolean;
  activeMinutes: number | null;
}

export default function PartyDailyActivity({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [members, setMembers] = useState<MemberActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();

    // Get user's group
    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1);
    if (!memberships?.[0]) { setLoading(false); return; }

    // Get all members in group
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user_id, users(display_name, nutrition_targets, timezone)')
      .eq('group_id', memberships[0].group_id);

    if (!groupMembers || groupMembers.length < 2) { setLoading(false); return; }

    // Fetch today's data for each member in parallel
    const results = await Promise.all(groupMembers.map(async (member: any) => {
      const uid = member.user_id;
      const tz = member.users?.timezone || 'America/New_York';
      const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      const todayStart = new Date(today + 'T00:00:00').toISOString();

      const [{ data: xpData }, { data: nutritionData }, { data: habitData }, { data: workoutData }] = await Promise.all([
        supabase.from('xp_ledger').select('amount').eq('user_id', uid).gte('created_at', todayStart),
        supabase.from('nutrition_logs').select('amount').eq('user_id', uid).eq('date', today).eq('macro_type', 'protein'),
        supabase.from('habit_logs').select('habit_id, value').eq('user_id', uid).eq('date', today).in('habit_id', ['habit_steps', 'habit_active_minutes']),
        supabase.from('workouts').select('id').eq('user_id', uid).eq('date', today).limit(1),
      ]);

      const xp = (xpData || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const protein = (nutritionData || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const proteinTarget = member.users?.nutrition_targets?.protein || null;
      const steps = (habitData || []).filter((h: any) => h.habit_id === 'habit_steps').reduce((s: number, h: any) => s + (h.value || 0), 0);
      const activeMinutes = (habitData || []).filter((h: any) => h.habit_id === 'habit_active_minutes').reduce((s: number, h: any) => s + (h.value || 0), 0);
      const trained = (workoutData || []).length > 0;

      return {
        userId: uid,
        name: member.users?.display_name || 'Member',
        isYou: uid === userId,
        xp: xp || null,
        protein: protein || null,
        proteinTarget,
        steps: steps || null,
        trained,
        activeMinutes: activeMinutes || null,
      };
    }));

    // Sort: trained first, then by XP descending
    results.sort((a, b) => {
      if (a.trained !== b.trained) return a.trained ? -1 : 1;
      return (b.xp || 0) - (a.xp || 0);
    });

    setMembers(results);
    setLoading(false);
  };

  useEffect(() => { fetchActivity(); }, [userId]);

  if (loading || members.length < 2) return null;

  return (
    <div className={`border ${colors.border} bg-zinc-900/50 p-3 mb-4`}>
      <p className="text-[10px] text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>TODAY&apos;S ACTIVITY</p>
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.userId} className={`px-2 py-2 ${m.isYou ? `border ${colors.border} bg-zinc-800/50` : 'border border-zinc-800/30'}`}>
            {/* Name row */}
            <p className={`text-[9px] mb-1 ${m.isYou ? 'text-white' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {m.name}{m.isYou ? ' (YOU)' : ''}
            </p>
            {/* Metrics row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[8px] text-zinc-400">
                ⚡ <span className={m.xp ? 'text-amber-300' : 'text-zinc-600'}>{m.xp ?? '—'}</span>
              </span>
              <span className="text-[8px] text-zinc-400">
                🥩 <span className={m.protein ? 'text-white' : 'text-zinc-600'}>
                  {m.protein ?? '—'}{m.proteinTarget ? `/${m.proteinTarget}g` : m.protein ? 'g' : ''}
                </span>
              </span>
              <span className="text-[8px] text-zinc-400">
                👣 <span className={m.steps ? 'text-white' : 'text-zinc-600'}>{m.steps ? m.steps.toLocaleString() : '—'}</span>
              </span>
              <span className="text-[8px] text-zinc-400">
                🏋️ <span className={m.trained ? 'text-green-400' : 'text-zinc-600'}>{m.trained ? '✓' : '○'}</span>
              </span>
              {m.activeMinutes !== null && (
                <span className="text-[8px] text-zinc-400">
                  🔥 <span className="text-white">{m.activeMinutes} min</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
