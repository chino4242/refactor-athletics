"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import PixelBox, { ScreenWrapper } from './PixelBox';
import NutritionInputV2 from './NutritionInputV2';
import ActivityConfirmModal from './ActivityConfirmModal';
import { TrainSkeleton } from './Skeletons';

interface TrainScreenProps {
  userId: string;
}

interface ScheduledWorkout {
  name: string;
  exercises: string[];
  estimatedXp: number;
}

interface WeekDay {
  label: string;
  date: string;
  completed: boolean;
  isToday: boolean;
}

function inferTitle(blocks: any[]): string {
  const sections = new Set(blocks.map((b: any) => b.section).filter(Boolean));
  const parts: string[] = [];
  if (sections.has('Armor')) parts.push('Strength');
  if (sections.has('Core Work')) parts.push('Core');
  if (sections.has('Engine')) parts.push('Cardio');
  if (sections.has('Mobility')) parts.push('Mobility');
  return parts.join(' + ') || 'Workout';
}

function getWeekDays(): WeekDay[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label,
      date: d.toLocaleDateString('en-CA'),
      completed: false,
      isToday: d.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA'),
    };
  });
}

export default function TrainScreen({ userId }: TrainScreenProps) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [workout, setWorkout] = useState<ScheduledWorkout | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>(getWeekDays());
  const [loading, setLoading] = useState(true);
  const [hasBattleSession, setHasBattleSession] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [fullSchedule, setFullSchedule] = useState<any[]>([]);
  const [yesterday, setYesterday] = useState<string | null>(null);
  const [tomorrow, setTomorrow] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessionGroups, setSessionGroups] = useState<{ type: string; exercises: { id: string; name: string }[]; completed: number }[]>([]);
  const [todayXp, setTodayXp] = useState(0);
  const [allComplete, setAllComplete] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [syncedActivities, setSyncedActivities] = useState<{ name: string; duration: number; xp: number; exerciseId: string; confirmed: boolean }[]>([]);
  const [confirmingActivity, setConfirmingActivity] = useState<{ name: string; duration: number; xp: number; exerciseId: string; id: string } | null>(null);

  // Refresh when app returns to foreground
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') setRefreshKey(k => k + 1); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    // Check for in-progress battle
    try {
      const saved = localStorage.getItem('battle_session');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.date === new Date().toLocaleDateString('en-CA') && state.cards?.some((c: any) => !c.defeated)) {
          setHasBattleSession(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Fetch today's scheduled workout
        const localDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const schedRes = await fetch('/api/workouts/schedule');
        const schedule = await schedRes.json();
        setFullSchedule(schedule || []);
        const todayProgram = (schedule || []).find((p: any) => (p.day || '').toLowerCase() === localDay);

        if (todayProgram) {
          setWorkout({
            name: todayProgram.title || todayProgram.name || 'Workout',
            exercises: (todayProgram.exercises || []).slice(0, 5),
            estimatedXp: todayProgram.xp || (todayProgram.exercises?.length || 3) * 50,
          });

          // Build session groups with completion data
          if (todayProgram.sessionGroups?.length) {
            const today = new Date().toLocaleDateString('en-CA');
            const { createClient: getClient } = await import('@/utils/supabase/client');
            const sb = getClient();
            const { data: todayWorkouts } = await sb.from('workouts').select('exercise_id, xp').eq('user_id', userId).eq('date', today);
            const completedIds = new Set((todayWorkouts || []).map((w: any) => w.exercise_id));
            const xpTotal = (todayWorkouts || []).reduce((s: number, w: any) => s + (w.xp || 0), 0);
            setTodayXp(xpTotal);

            // Synced activities for the activity log
            const synced = (todayWorkouts || []).filter((w: any) => (w.exercise_id || '').startsWith('synced_'));
            setSyncedActivities(synced.map((w: any) => {
              const parts = w.exercise_id.replace('synced_', '').split('_');
              const type = parts[0] || 'Activity';
              const dur = Math.round((w.raw_value || 0) / 60);
              return { name: type.charAt(0).toUpperCase() + type.slice(1), duration: dur, xp: w.xp || 0, exerciseId: w.exercise_id, confirmed: true };
            }));

            const groups = (todayProgram.sessionGroups as any[]).map((g: any) => ({
              type: g.type,
              exercises: g.exercises,
              completed: g.exercises.filter((e: any) => completedIds.has(e.id)).length,
            }));
            setSessionGroups(groups);

            const totalExercises = groups.reduce((s: number, g: any) => s + g.exercises.length, 0);
            const totalCompleted = groups.reduce((s: number, g: any) => s + g.completed, 0);
            const isAllDone = totalCompleted >= totalExercises && totalExercises > 0;
            setAllComplete(isAllDone);

            // Award completion bonus if all done and not already awarded
            if (isAllDone) {
              const bonusKey = `day_complete_${today}`;
              if (!localStorage.getItem(bonusKey)) {
                localStorage.setItem(bonusKey, '1');
                const { awardXp } = await import('@/utils/xp-service');
                const sb2 = (await import('@/utils/supabase/client')).createClient();
                await awardXp(sb2, userId, { type: 'workout', level: 0, volumeXp: 200 }, 'Day Complete Bonus');
              }
            }
          }
        } else {
          setWorkout(null);
        }

        // Fetch this week's workout completions
        const mon = new Date();
        mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
        const mondayStr = mon.toLocaleDateString('en-CA');

        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: workouts } = await supabase
          .from('workouts')
          .select('date')
          .eq('user_id', userId)
          .gte('date', mondayStr);

        const completedDates = new Set((workouts || []).map((w: any) => w.date));
        setWeekDays(prev => prev.map(d => ({ ...d, completed: completedDates.has(d.date) })));

        // Daily streak: count consecutive days with workouts ending yesterday (or today if already trained)
        const { data: streakData } = await supabase.from('workouts').select('date').eq('user_id', userId).gte('date', new Date(Date.now() - 60 * 86400000).toLocaleDateString('en-CA'));
        const streakDates = new Set((streakData || []).map((w: any) => w.date));
        let streak = 0;
        const today = new Date().toLocaleDateString('en-CA');
        let checkDay = streakDates.has(today) ? new Date() : new Date(Date.now() - 86400000);
        while (true) {
          const ds = checkDay.toLocaleDateString('en-CA');
          if (streakDates.has(ds)) { streak++; checkDay.setDate(checkDay.getDate() - 1); }
          else break;
        }
        setDailyStreak(streak);

        // Tomorrow preview (from schedule)
        const tomorrowDay = new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const tomorrowProg = (schedule || []).find((p: any) => (p.day || '').toLowerCase() === tomorrowDay);
        setTomorrow(tomorrowProg ? tomorrowProg.title || tomorrowProg.name : null);

        // Yesterday summary (from DB)
        const yesterdayDate = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
        const { data: yesterdayWorkouts } = await supabase.from('workouts').select('exercise_id, level').eq('user_id', userId).eq('date', yesterdayDate).gt('level', 0);
        if (yesterdayWorkouts?.length) {
          const rankUps = yesterdayWorkouts.filter((w: any) => w.level >= 2).length;
          setYesterday(`${yesterdayWorkouts.length} exercises${rankUps > 0 ? ` · ${rankUps} rank-up${rankUps > 1 ? 's' : ''} 🏆` : ''}`);
        }
      } catch {}
      setLoading(false);
    })();
  }, [userId, refreshKey]);

  if (loading) {
    return <TrainSkeleton />;
  }

  return (
    <ScreenWrapper onRefresh={async () => { setRefreshKey(k => k + 1); }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className={`text-[10px] ${colors.headerText} uppercase tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          TRAIN
        </p>
      </div>

      {/* Weekly View */}
      <PixelBox className="p-3 mb-4">
        <p className={`text-[10px] ${colors.headerText} mb-2 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          THIS WEEK
        </p>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const dayName = dayNames[i];
            const isSelected = selectedDay === dayName;
            return (
              <button key={day.date} onClick={() => {
                if (isSelected || day.isToday) { setSelectedDay(null); const localDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(); const prog = fullSchedule.find((p: any) => (p.day || '').toLowerCase() === localDay); setWorkout(prog ? { name: prog.title || prog.name || 'Workout', exercises: (prog.exercises || []).slice(0, 5), estimatedXp: prog.xp || 50 } : null); }
                else { setSelectedDay(dayName); const prog = fullSchedule.find((p: any) => (p.day || '').toLowerCase() === dayName); setWorkout(prog ? { name: prog.title || prog.name || 'Workout', exercises: (prog.exercises || []).slice(0, 5), estimatedXp: prog.xp || 50 } : null); }
              }} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  {day.label}
                </span>
                <div className={`w-7 h-7 flex items-center justify-center border ${
                  isSelected ? `${colors.primary} bg-zinc-700` :
                  day.isToday && !selectedDay ? `${colors.primary} bg-zinc-800` :
                  day.completed ? 'border-green-500 bg-green-900/30' :
                  'border-zinc-700 bg-zinc-900'
                }`}>
                  {day.completed && !isSelected && <span className="text-[9px] text-green-400">✓</span>}
                  {day.isToday && !day.completed && !isSelected && !selectedDay && <span className={`text-[9px] ${colors.secondary}`}>▸</span>}
                  {isSelected && <span className={`text-[9px] ${colors.secondary}`}>▸</span>}
                </div>
              </button>
            );
          })}
        </div>
        {dailyStreak >= 2 && (
          <p className="text-[10px] text-amber-400 mt-2 text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            🔥 {dailyStreak} DAY STREAK
          </p>
        )}
      </PixelBox>

      {/* Today's Battle — Daily Mission Board */}
      <PixelBox highlight className="p-4 mb-4">
        {workout ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[10px] ${colors.headerText} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {selectedDay ? `${selectedDay.toUpperCase()}'S WORKOUT` : allComplete ? '✓ DAY COMPLETE' : "TODAY\u0027S BATTLE"}
              </p>
              {todayXp > 0 && <span className={`text-[10px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>⚡{todayXp} XP</span>}
            </div>

            {/* Session Groups */}
            {sessionGroups.length > 0 ? (
              <div className="space-y-2 mb-3">
                {sessionGroups.map((g, i) => {
                  const done = g.completed >= g.exercises.length;
                  return (
                    <a key={i} href={`/train/active?session=${g.type.toLowerCase()}${selectedDay ? `&day=${selectedDay}` : ''}`} className={`flex items-center justify-between px-3 py-2 border ${done ? 'border-green-800 bg-green-950/30' : colors.border + ' bg-zinc-800/50'} hover:bg-zinc-700/50 transition-colors`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${done ? 'text-green-400' : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                          {done ? '✓' : '○'} {g.type}
                        </span>
                      </div>
                      <span className={`text-[9px] ${done ? 'text-green-500' : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        {g.completed}/{g.exercises.length}
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1 mb-3">
                {workout.exercises.map((ex, i) => (
                  <p key={i} className="text-xs text-zinc-400">• {ex}</p>
                ))}
              </div>
            )}

            {/* Progress bar */}
            {sessionGroups.length > 0 && (
              <div className="mb-3">
                <div className="flex h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`${allComplete ? 'bg-green-500' : colors.barFill} transition-all duration-500`} style={{ width: `${(sessionGroups.reduce((s, g) => s + g.completed, 0) / Math.max(sessionGroups.reduce((s, g) => s + g.exercises.length, 0), 1)) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Completion bonus teaser or action button */}
            {allComplete ? (
              <div className="text-center space-y-2">
                <p className="text-[10px] text-green-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  🏆 ALL SESSIONS COMPLETE — +200 XP BONUS
                </p>
                <div className="flex justify-center gap-4 text-[9px] text-zinc-400">
                  <span>{sessionGroups.reduce((s, g) => s + g.exercises.length, 0)} exercises</span>
                  <span>⚡{todayXp} XP</span>
                  {dailyStreak >= 2 && <span>🔥 {dailyStreak} streak</span>}
                </div>
                <p className="text-[8px] text-zinc-600 italic mt-1">
                  {currentTheme === 'samurai' ? 'The rift is quiet tonight. Rest well, warrior.' :
                   currentTheme === 'draconic' ? 'The flames dim. You have earned your rest.' :
                   currentTheme === 'viking' ? 'The battle is won. Odin raises his horn.' :
                   currentTheme === 'apex_predator' ? 'The pack rests. Tomorrow, you hunt again.' :
                   'Great work today. Recovery starts now.'}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">
                  Complete all → +200 XP bonus
                </span>
                <a
                  href={`/train/active${selectedDay ? `?day=${selectedDay}` : ''}`}
                  className={`text-[10px] px-4 py-2 border ${colors.primary} bg-zinc-800 ${colors.secondary} hover:bg-zinc-700 transition-colors`}
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                >
                  {hasBattleSession ? '▸ RESUME' : '▸ START ALL'}
                </a>
              </div>
            )}
          </>
        ) : (
          <>
            <p className={`text-[10px] ${colors.headerText} mb-2 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {currentTheme !== 'athlete' ? '🔥 RECOVERY DAY' : 'REST DAY'}
            </p>
            <p className="text-xs text-zinc-300 mb-2">Rest fuels progress. Your muscles grow today.</p>
            <p className="text-[11px] text-zinc-500 mb-3">
              {['Walk 10-20 min for blood flow', 'Foam roll tight areas (5 min)', 'Deep breathing + stretch (10 min)', 'Light mobility work — no intensity'][new Date().getDay() % 4]}
            </p>
            <div className="flex gap-2">
              <a href="/train/active?mode=flexible&filter=cardio" className={`text-[10px] px-3 py-1.5 border ${colors.border} bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                🚶 WALK
              </a>
              <a href="/train/active?mode=flexible" className={`text-[10px] px-3 py-1.5 border ${colors.border} bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                🧘 MOBILITY
              </a>
            </div>
          </>
        )}
      </PixelBox>

      {/* Yesterday + Tomorrow context */}
      {(yesterday || tomorrow) && (
        <div className="mb-4 px-1 space-y-1">
          {yesterday && <p className="text-[11px] text-zinc-500">Yesterday: {yesterday}</p>}
          {tomorrow && <p className="text-[11px] text-zinc-600">Tomorrow: {tomorrow}</p>}
        </div>
      )}

      {/* Today's Synced Activities */}
      {syncedActivities.length > 0 && (
        <PixelBox className="p-3 mb-4">
          <p className={`text-[9px] ${colors.headerText} mb-2 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            TODAY&apos;S ACTIVITIES
          </p>
          <div className="space-y-1">
            {syncedActivities.map((a, i) => (
              <button key={i} onClick={() => setConfirmingActivity({ ...a, id: String(i) })} className="w-full flex items-center justify-between hover:bg-zinc-800/50 px-1 py-0.5 -mx-1 rounded transition-colors">
                <span className="text-[10px] text-zinc-300">{a.name} · {a.duration} min</span>
                <span className={`text-[9px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>+{a.xp} XP</span>
              </button>
            ))}
          </div>
        </PixelBox>
      )}

      {/* Activity Confirm Modal */}
      {confirmingActivity && (
        <ActivityConfirmModal
          activity={confirmingActivity}
          onConfirm={async (sessionGroup) => {
            if (sessionGroup) {
              // Update the workout row with session_group
              const { createClient } = await import('@/utils/supabase/client');
              const supabase = createClient();
              // Find the workout by exercise_id and today's date
              const today = new Date().toLocaleDateString('en-CA');
              await supabase.from('workouts').update({ session_id: sessionGroup }).eq('user_id', userId).eq('exercise_id', confirmingActivity.exerciseId).eq('date', today);

              // Update local session groups — mark this group as fully complete
              setSessionGroups(prev => prev.map(g =>
                g.type.toLowerCase() === sessionGroup ? { ...g, completed: g.exercises.length } : g
              ));
            }
            setConfirmingActivity(null);
          }}
          onDismiss={() => setConfirmingActivity(null)}
        />
      )}

      {/* Quick Log */}
      <PixelBox className="p-4 mb-4">
        <p className={`text-[10px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          QUICK LOG
        </p>
        <p className="text-[11px] text-zinc-500 mb-2">Manual entry when sync fails</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '🏃 RUN', href: '/train/active?mode=flexible&filter=cardio' },
            { label: '🏋️ LIFT', href: '/train/active?mode=flexible&filter=strength' },
            { label: '◆ OTHER', href: '/train/active?mode=flexible' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-[10px] px-2 py-3 border ${colors.border} bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 transition-colors text-center`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </PixelBox>

      {/* Nutrition */}
      <PixelBox className="p-4">
        <p className={`text-[10px] ${colors.headerText} mb-2 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          FUEL
        </p>
        <NutritionInputV2 userId={userId} />
      </PixelBox>
    </ScreenWrapper>
  );
}
