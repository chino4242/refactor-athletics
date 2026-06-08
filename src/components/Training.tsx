"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { getToday } from '@/utils/date';
import FirstVisitTooltip from './common/FirstVisitTooltip';
import { startOfWeek, addDays, format } from 'date-fns';
import { getWeeklySchedule, getProfile } from '@/services/api';
import { createClient } from '@/utils/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import ActiveWorkout from './ActiveWorkout';
import ProgramOverview from './ProgramOverview';
import { ChevronDown, Settings, Zap } from 'lucide-react';
import Link from 'next/link';
import QuickLogModal from './QuickLogModal';
import type { HistoryItem, CatalogItem } from '@/types';

interface TrainingProps {
  userId: string;
  bodyweight: number;
  sex: string;
  age: number;
  initialHistory?: HistoryItem[];
  initialCatalog?: CatalogItem[];
  onLogComplete?: () => void;
  highestLevel?: number;
}

interface DayPlan {
  date: Date;
  dateStr: string;
  plan: { title: string; type: string; xp: number; exercises?: string[]; treadmillBlocks?: number };
}

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Strength: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  Cardio: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  Hybrid: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
  Recovery: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
};

export default function Training({ userId, bodyweight, sex, age, initialHistory, initialCatalog, onLogComplete, highestLevel = 0 }: TrainingProps) {
  const { currentTheme, theme: _theme } = useTheme();
  const theme = _theme || THEMES.athlete;
  const [weekDays, setWeekDays] = useState<DayPlan[]>([]);
  const [selectedDayStr, setSelectedDayStr] = useState('');
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showFullExercises, setShowFullExercises] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<'all' | 'strength' | 'cardio' | 'core' | null>(null);

  // Check for active workout after hydration
  useEffect(() => {
    if (localStorage.getItem('active_workout')) {
      setShowActiveWorkout(true);
      setSectionFilter('all');
      setSelectedDayStr(getToday());
    }
  }, []);
  const [showWeekView, setShowWeekView] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [userPath, setUserPath] = useState<string | null>(null);

  // Load user path
  useEffect(() => {
    getProfile(userId).then(p => { if (p?.selected_path) setUserPath(p.selected_path); });
  }, [userId]);

  // Load completed dates this week (days with actual workout sets — not just synced habits)
  useEffect(() => {
    if (!userId) return;
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const startStr = format(start, 'yyyy-MM-dd');
    const supabase = createClient();
    supabase.from('workouts')
      .select('date, sets')
      .eq('user_id', userId)
      .gte('date', startStr)
      .then(({ data }) => {
        const dates = new Set<string>();
        (data || []).forEach((w: any) => {
          // Only count as completed if it has actual sets with reps/weight
          if (w.sets && Array.isArray(w.sets) && w.sets.some((s: any) => s.reps > 0 || s.weight > 0 || s.duration > 0)) {
            dates.add(w.date);
          }
        });
        setCompletedDates(dates);
      });
  }, [userId]);

  // Load schedule
  useEffect(() => {
    (async () => {
      const apiData = await getWeeklySchedule();
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const scheduleMap = new Map<number, any>();
      (apiData || []).forEach((d: any) => scheduleMap.set(d.order, d));

      const days: DayPlan[] = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i);
        const api = scheduleMap.get(i);
        return {
          date,
          dateStr: format(date, 'yyyy-MM-dd'),
          plan: api
            ? { title: api.title, type: api.type || 'Training', xp: api.xp || 0, exercises: api.exercises, treadmillBlocks: api.treadmillBlocks }
            : { title: 'Rest Day', type: 'Recovery', xp: 0 },
        };
      });
      setWeekDays(days);
      setSelectedDayStr(format(new Date(), 'yyyy-MM-dd'));
    })();
  }, []);

  const today = weekDays.find(d => d.dateStr === todayStr);
  const selectedDay = weekDays.find(d => d.dateStr === selectedDayStr) || today;
  const todayStyle = TYPE_STYLES[today?.plan.type || 'Recovery'] || TYPE_STYLES.Recovery;

  // Active workout view
  if (showActiveWorkout && selectedDayStr) {
    // Show section selector before launching workout
    if (!sectionFilter) {
      return (
        <div className="max-w-md mx-auto pb-32 px-2">
          <button
            onClick={() => setShowActiveWorkout(false)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium px-2 py-3 transition"
          >
            <span>‹</span> Back to schedule
          </button>
          <div className="text-center mb-6 mt-4">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.accentHex }}>Choose Your Focus</h2>
            <p className="text-zinc-500 text-sm mt-1">What are you training today?</p>
          </div>
          <div className="space-y-3">
            {[
              { key: 'all' as const, emoji: '⚡', label: 'Full Workout', desc: 'Run the entire scheduled program' },
              { key: 'strength' as const, emoji: '🏋️', label: 'Strength', desc: 'Lifts and resistance training only' },
              { key: 'cardio' as const, emoji: '🏃', label: 'Cardio', desc: 'Treadmill, intervals, and conditioning' },
              { key: 'core' as const, emoji: '🎯', label: 'Core', desc: 'Abs and midline stability work' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSectionFilter(opt.key)}
                className="w-full p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-600/50 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{opt.emoji}</div>
                  <div className="flex-1">
                    <div className="text-white font-black uppercase text-sm">{opt.label}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">{opt.desc}</div>
                  </div>
                  <ChevronDown size={18} className="text-zinc-600 group-hover:text-orange-500 transition -rotate-90" />
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto pb-32">
        <button
          onClick={() => { setSectionFilter(null); }}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium px-2 py-3 transition"
        >
          <span>‹</span> Back to focus selection
        </button>
        <ActiveWorkout userId={userId} initialDate={selectedDayStr} sectionFilter={sectionFilter === 'all' ? undefined : sectionFilter} onLogComplete={() => onLogComplete?.()} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 pb-32 relative" style={{ backgroundImage: theme.bgTexture }}>
      {/* Theme banner behind header */}
      <div className="absolute top-0 left-0 right-0 h-40 overflow-hidden pointer-events-none">
        <img src={`/themes/${currentTheme}/banner.png`} alt="" className="w-full h-full object-cover object-[center_20%] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />
      </div>

      <FirstVisitTooltip id="train" message="Your scheduled workout for today. Tap Start to begin — you'll earn XP for every set." />

      {/* Program Overview */}
      {userPath && <ProgramOverview userId={userId} path={userPath} />}

      {/* Today's Workout — Hero Card */}
      {today && (
        <div className="mx-2 mt-2">
          <div className={`relative p-5 rounded-2xl border overflow-hidden ${
            today.plan.type === 'Recovery'
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-gradient-to-br from-zinc-800/90 to-zinc-900 border-zinc-700/50'
          }`}>
            {/* Faded background text */}
            <div className="absolute -right-2 -bottom-4 text-7xl font-black text-white/[0.03] pointer-events-none select-none uppercase">
              {format(new Date(), 'EEEE')}
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.accentHex }}>{theme.labels.todaysWorkout}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${todayStyle.bg} ${todayStyle.text}`}>
                  {today.plan.type}
                </span>
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight mb-3">
                {today.plan.title}
              </h2>

              {/* Exercise preview — tap to expand full list */}
              {today.plan.exercises && today.plan.exercises.length > 0 && (
                <div className="mb-4">
                  <button onClick={() => setShowFullExercises(prev => !prev)} className="flex flex-wrap gap-1.5 text-left">
                    {today.plan.exercises.slice(0, showFullExercises ? undefined : 5).map((ex, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                        {ex}
                      </span>
                    ))}
                    {!showFullExercises && today.plan.exercises.length > 5 && (
                      <span className="text-[10px] px-2 py-1 text-zinc-500 underline">+{today.plan.exercises.length - 5} more ▾</span>
                    )}
                    {showFullExercises && today.plan.exercises.length > 5 && (
                      <span className="text-[10px] px-2 py-1 text-zinc-500 underline">show less ▴</span>
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                {today.plan.xp > 0 && (
                  <span className="text-xs text-zinc-500 font-medium">⚡ {today.plan.xp} XP</span>
                )}
                {(today.plan.treadmillBlocks || 0) > 0 && (
                  <span className="text-xs text-zinc-500 font-medium">🏃 Treadmill</span>
                )}
                <button
                  onClick={() => { setSelectedDayStr(todayStr); setShowActiveWorkout(true); setSectionFilter(null); }}
                  className={`ml-auto bg-gradient-to-r ${theme.accentGradient} text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg`}
                  style={{ boxShadow: `0 10px 15px -3px ${theme.accentHex}20` }}
                >
                  {theme.labels.startWorkout}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Log */}
      <div className="mx-2 mt-2">
        <button
          onClick={() => setShowQuickLog(true)}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 hover:border-zinc-700 transition-colors active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Zap size={16} className="text-orange-500" />
          </div>
          <div className="text-left">
            <span className="text-sm font-bold text-white">Quick Log</span>
            <p className="text-[10px] text-zinc-500">Log a run, lift, or any exercise outside your program</p>
          </div>
        </button>
      </div>

      {/* Week Schedule — Collapsible */}
      <div className="mx-2">
        <div className="flex items-center justify-between py-3 px-1">
          <button
            onClick={() => setShowWeekView(!showWeekView)}
            className="flex items-center gap-2"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">This Week</span>
            <ChevronDown size={16} className={`text-zinc-500 transition-transform ${showWeekView ? 'rotate-180' : ''}`} />
          </button>
          <Link href="/workouts" className="p-1.5 text-zinc-500 hover:text-orange-400 rounded hover:bg-zinc-800/50 transition">
            <Settings size={14} />
          </Link>
          {showWeekView && (
            <button onClick={() => { setSwapMode(!swapMode); setSwapFrom(null); }}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition ${swapMode ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-500 hover:text-orange-400'}`}>
              Swap
            </button>
          )}
        </div>

        {showWeekView && (
          <div className="flex flex-col gap-1.5 animate-fade-in-up pb-2">
            {swapMode && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 flex items-center justify-between mb-1">
                <span className="text-[11px] text-orange-400 font-bold">
                  {swapFrom ? `Tap another day to swap with ${format(weekDays.find(d => d.dateStr === swapFrom)?.date || new Date(), 'EEEE')}` : 'Tap a day to swap'}
                </span>
                <button onClick={() => { setSwapMode(false); setSwapFrom(null); }} className="text-[10px] text-zinc-500">Cancel</button>
              </div>
            )}
            {weekDays.map(day => {
              const isToday = day.dateStr === todayStr;
              const style = TYPE_STYLES[day.plan.type] || TYPE_STYLES.Recovery;
              const isCompleted = completedDates.has(day.dateStr);
              const isSwapSelected = swapFrom === day.dateStr;

              return (
                <button
                  key={day.dateStr}
                  onClick={async () => {
                    if (swapMode) {
                      if (isCompleted) return; // Can't swap completed days
                      if (!swapFrom) {
                        setSwapFrom(day.dateStr);
                      } else if (swapFrom !== day.dateStr) {
                        // Perform swap
                        const fromDay = weekDays.find(d => d.dateStr === swapFrom);
                        const toDay = day;
                        if (fromDay) {
                          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                          await fetch('/api/workouts/swap-days', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ day1: dayNames[fromDay.date.getDay()], day2: dayNames[toDay.date.getDay()] }),
                          });
                          setSwapMode(false);
                          setSwapFrom(null);
                          // Reload schedule
                          const apiData = await getWeeklySchedule();
                          const start = startOfWeek(new Date(), { weekStartsOn: 1 });
                          const scheduleMap = new Map<number, any>();
                          (apiData || []).forEach((d: any) => scheduleMap.set(d.order, d));
                          setWeekDays(Array.from({ length: 7 }, (_, i) => {
                            const date = addDays(start, i);
                            const api = scheduleMap.get(i);
                            return { date, dateStr: format(date, 'yyyy-MM-dd'), plan: api ? { title: api.title, type: api.type || 'Training', xp: api.xp || 0, exercises: api.exercises, treadmillBlocks: api.treadmillBlocks } : { title: 'Rest Day', type: 'Recovery', xp: 0 } };
                          }));
                        }
                      }
                    } else {
                      setSelectedDayStr(day.dateStr); setShowActiveWorkout(true);
                    }
                  }}
                  disabled={swapMode && isCompleted}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                    isSwapSelected
                      ? 'bg-orange-500/20 border border-orange-500/50'
                      : swapMode && isCompleted
                      ? 'bg-zinc-900/20 border border-transparent opacity-40'
                      : isToday
                      ? 'bg-zinc-800/80 border border-zinc-700/50'
                      : 'bg-zinc-900/40 border border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/30'
                  }`}
                >
                  {/* Day */}
                  <div className="w-10 text-center shrink-0">
                    <div className="text-[10px] font-bold uppercase text-zinc-500">{format(day.date, 'EEE')}</div>
                    <div className={`text-sm font-black ${isToday ? '' : 'text-zinc-300'}`} style={isToday ? { color: theme.accentHex } : {}}>{format(day.date, 'd')}</div>
                  </div>

                  {/* Type dot + Title */}
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold text-white truncate">{day.plan.title}</div>
                  </div>

                  {/* Type badge */}
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 ${style.bg} ${style.text}`}>
                    {day.plan.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showQuickLog && (
        <QuickLogModal
          userId={userId}
          bodyweight={bodyweight}
          sex={sex}
          catalog={initialCatalog || []}
          onClose={() => setShowQuickLog(false)}
          onLogged={() => onLogComplete?.()}
        />
      )}
    </div>
  );
}
