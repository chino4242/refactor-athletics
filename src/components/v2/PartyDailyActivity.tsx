"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import { useVisualMode } from '@/context/VisualModeContext';

interface Props {
  userId: string;
  refreshKey?: number;
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
  streak: number;
  sections: { armor: boolean; engine: boolean; core: boolean; mobility: boolean };
  scheduledSections: string[]; // only show boxes for these
  rankUps: { exercise: string; level: number }[];
}

export default function PartyDailyActivity({ userId, refreshKey = 0 }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const { isVibrant } = useVisualMode();
  const [members, setMembers] = useState<MemberActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();

    // Get user's group
    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1);
    if (!memberships?.[0]) { setLoading(false); return; }
    const groupId = memberships[0].group_id;

    // Get all members in group
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user_id, users(display_name, nutrition_targets, timezone)')
      .eq('group_id', groupId);

    if (!groupMembers || groupMembers.length < 2) { setLoading(false); return; }

    // Get today's rank-up events for the group
    const todayStart = new Date(new Date().toLocaleDateString('en-CA') + 'T00:00:00').toISOString();
    const { data: rankUpEvents } = await supabase
      .from('party_events')
      .select('user_id, metadata')
      .eq('group_id', groupId)
      .eq('event_type', 'rank_up')
      .gte('created_at', todayStart);

    // Fetch today's data for each member in parallel
    const results = await Promise.all(groupMembers.map(async (member: any) => {
      const uid = member.user_id;
      const tz = member.users?.timezone || 'America/New_York';
      const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      const todayStart = new Date(today + 'T00:00:00').toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toLocaleDateString('en-CA');

      const [{ data: xpData }, { data: nutritionData }, { data: habitData }, { data: workoutData }, { data: streakData }] = await Promise.all([
        supabase.from('xp_ledger').select('amount').eq('user_id', uid).gte('created_at', todayStart),
        supabase.from('nutrition_logs').select('amount').eq('user_id', uid).eq('date', today).eq('macro_type', 'protein'),
        supabase.from('habit_logs').select('habit_id, value').eq('user_id', uid).eq('date', today).in('habit_id', ['habit_steps', 'habit_active_minutes']),
        supabase.from('workouts').select('id, exercise_id, session_id').eq('user_id', uid).eq('date', today),
        supabase.from('workouts').select('date').eq('user_id', uid).gte('date', sixtyDaysAgo),
      ]);

      // Categorize today's logged exercises into sections
      const coreKeywords = ['plank', 'crunch', 'sit_up', 'v_up', 'flutter', 'ab', 'core', 'dead_bug', 'russian_twist', 'leg_raise'];
      const cardioKeywords = ['run_', 'row_', 'treadmill', 'cardio', 'cycling', 'swimming', 'synced_running', 'synced_walking'];
      const loggedIds = new Set((workoutData || []).map((w: any) => w.exercise_id || ''));

      // Fetch scheduled sections for today
      const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      let scheduledSections: string[] = [];
      const sectionExercises: Record<string, string[]> = { armor: [], engine: [], core: [] };
      try {
        // Try user's own programs first
        let programId: string | null = null;
        const { data: userPrograms } = await supabase
          .from('workout_programs')
          .select('id')
          .eq('user_id', uid)
          .ilike('day_of_week', todayDay)
          .limit(1);
        if (userPrograms?.[0]) {
          programId = userPrograms[0].id;
        } else {
          // Fall back to default programs for their path
          const { data: memberProfile } = await supabase.from('users').select('selected_path').eq('id', uid).single();
          const path = memberProfile?.selected_path || 'hybrid';
          const { data: defaultPrograms } = await supabase
            .from('workout_programs')
            .select('id')
            .eq('is_default', true)
            .eq('training_path', path)
            .ilike('day_of_week', todayDay)
            .limit(1);
          if (defaultPrograms?.[0]) programId = defaultPrograms[0].id;
        }
        if (programId) {
          const { data: blocks } = await supabase
            .from('program_blocks')
            .select('block_type, exercise_id')
            .eq('workout_id', programId);
          for (const block of blocks || []) {
            if (block.block_type === 'treadmill') {
              sectionExercises.engine.push('__treadmill__');
            } else if (block.exercise_id) {
              if (coreKeywords.some(k => block.exercise_id.includes(k))) {
                sectionExercises.core.push(block.exercise_id);
              } else {
                sectionExercises.armor.push(block.exercise_id);
              }
            }
          }
          if (sectionExercises.armor.length > 0) scheduledSections.push('armor');
          if (sectionExercises.engine.length > 0) scheduledSections.push('engine');
          if (sectionExercises.core.length > 0) scheduledSections.push('core');
        }
      } catch {}

      // Section is complete only when ALL exercises in it are logged
      const sections = {
        armor: sectionExercises.armor.length > 0 && sectionExercises.armor.every(id => loggedIds.has(id)),
        engine: sectionExercises.engine.length > 0 && (loggedIds.has('cardio_block') || loggedIds.has('__treadmill__') || cardioKeywords.some(k => [...loggedIds].some(id => id.includes(k)))),
        core: sectionExercises.core.length > 0 && sectionExercises.core.every(id => loggedIds.has(id)),
        mobility: false,
      };

      const xp = (xpData || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const protein = (nutritionData || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const proteinTarget = member.users?.nutrition_targets?.protein || null;
      const steps = (habitData || []).filter((h: any) => h.habit_id === 'habit_steps').reduce((s: number, h: any) => s + (h.value || 0), 0);
      const activeMinutes = (habitData || []).filter((h: any) => h.habit_id === 'habit_active_minutes').reduce((s: number, h: any) => s + (h.value || 0), 0);
      const trained = (workoutData || []).length > 0;

      // Compute streak
      const streakDates = new Set((streakData || []).map((w: any) => w.date));
      let streak = 0;
      const checkDay = new Date(today);
      // Start from yesterday (or today if already trained)
      if (!streakDates.has(today)) checkDay.setDate(checkDay.getDate() - 1);
      while (streakDates.has(checkDay.toLocaleDateString('en-CA'))) {
        streak++;
        checkDay.setDate(checkDay.getDate() - 1);
      }

      // Rank-ups today for this member
      const memberRankUps = (rankUpEvents || [])
        .filter((e: any) => e.user_id === uid && e.metadata?.exercise)
        .map((e: any) => ({ exercise: e.metadata.exercise, level: e.metadata.level || 0 }));

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
        streak,
        sections,
        scheduledSections,
        rankUps: memberRankUps,
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

  useEffect(() => { fetchActivity(); }, [userId, refreshKey]);

  if (loading || members.length < 2) return null;

  const allTrained = members.every(m => m.trained);

  return (
    <div className={`${isVibrant ? 'rounded-2xl bg-zinc-900/50 border border-zinc-800/30' : `border ${colors.border} bg-zinc-900/50`} p-3 mb-4`}>
      <p className={`text-xs text-zinc-500 uppercase mb-2 ${isVibrant ? 'font-semibold tracking-widest' : ''}`} style={isVibrant ? undefined : { fontFamily: "var(--font-pixel), monospace" }}>TODAY&apos;S ACTIVITY</p>

      {/* Both Trained Badge */}
      {allTrained && (
        <div className={`flex items-center justify-center gap-2 py-1.5 mb-2 ${isVibrant ? 'rounded-lg bg-emerald-950/30 border border-emerald-500/20' : `border ${colors.border} bg-zinc-800/50`}`}>
          <span className="text-xs">⚔</span>
          <span className={`text-xs ${isVibrant ? 'text-emerald-400 font-bold' : `${colors.secondary} uppercase`}`} style={isVibrant ? undefined : { fontFamily: "var(--font-pixel), monospace" }}>BOTH TRAINED TODAY</span>
          <span className="text-xs">⚔</span>
        </div>
      )}

      <div className="space-y-2">
        {members.map(m => (
          <div key={m.userId} className={`px-2 py-2 ${
            isVibrant
              ? m.isYou ? 'rounded-xl bg-zinc-800/40 border border-zinc-700/30' : 'rounded-xl border border-zinc-800/20'
              : m.isYou ? `border ${colors.border} bg-zinc-800/50` : 'border border-zinc-800/30'
          }`}>
            {/* Name + Streak row */}
            <div className="flex items-center justify-between mb-1">
              <p className={`text-xs ${m.isYou ? 'text-white font-bold' : 'text-zinc-400'}`} style={isVibrant ? undefined : { fontFamily: "var(--font-pixel), monospace" }}>
                {m.name}{m.isYou ? ' (YOU)' : ''}
              </p>
              {m.streak > 0 && (
                <span className={`text-xs ${m.streak >= 7 ? 'text-amber-300' : 'text-zinc-400'}`} style={isVibrant ? undefined : { fontFamily: "var(--font-pixel), monospace" }}>
                  🏋️ {m.streak}d
                </span>
              )}
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-zinc-400">
                ⚡ <span className={m.xp ? 'text-amber-300' : 'text-zinc-600'}>{m.xp ?? '—'}</span>
              </span>
              <span className="text-xs text-zinc-400">
                🥩 <span className={m.protein ? 'text-white' : 'text-zinc-600'}>
                  {m.protein ?? '—'}{m.proteinTarget ? `/${m.proteinTarget}g` : m.protein ? 'g' : ''}
                </span>
              </span>
              <span className="text-xs text-zinc-400">
                👣 <span className={m.steps ? 'text-white' : 'text-zinc-600'}>{m.steps ? m.steps.toLocaleString() : '—'}</span>
              </span>
              {m.activeMinutes !== null && m.activeMinutes > 0 && (
                <span className="text-xs text-zinc-400">
                  ⏱ <span className="text-white">{m.activeMinutes} min</span>
                </span>
              )}
              {(m.activeMinutes === null || m.activeMinutes === 0) && (
                <span className="text-xs text-zinc-400">
                  ⏱ <span className="text-zinc-600">0 min</span>
                </span>
              )}
            </div>

            {/* Session section boxes */}
            {m.scheduledSections.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {[
                  { key: 'armor', label: 'STR', done: m.sections.armor },
                  { key: 'engine', label: 'CARDIO', done: m.sections.engine },
                  { key: 'core', label: 'CORE', done: m.sections.core },
                  { key: 'mobility', label: 'MOB', done: m.sections.mobility },
                ].filter(s => m.scheduledSections.includes(s.key)).map(s => (
                  <div key={s.key} className={`px-1.5 py-0.5 ${
                    isVibrant
                      ? s.done ? 'rounded-md bg-emerald-950/30 border border-emerald-500/20' : 'rounded-md bg-zinc-800/30 border border-zinc-700/30'
                      : s.done ? 'border border-green-800 bg-green-950/30' : 'border border-zinc-700 bg-zinc-800/30'
                  }`}>
                    <span className={`text-xs ${s.done ? 'text-green-400' : 'text-zinc-600'}`} style={isVibrant ? undefined : { fontFamily: "var(--font-pixel), monospace" }}>
                      {s.done ? '✓' : '○'} {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Rank-ups */}
            {m.rankUps && m.rankUps.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {m.rankUps.map((r, i) => (
                  <p key={i} className={`text-xs ${isVibrant ? 'text-emerald-400' : colors.secondary}`} style={isVibrant ? undefined : { fontFamily: "var(--font-pixel), monospace" }}>
                    ↑ {r.exercise.replace(/_/g, ' ')} → Lv{r.level}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
