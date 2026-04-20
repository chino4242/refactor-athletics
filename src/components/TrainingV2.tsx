"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { startOfWeek, addDays, format } from 'date-fns';
import { getWeeklySchedule } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import ActiveWorkout from './ActiveWorkout';
import { ChevronDown } from 'lucide-react';
import type { HistoryItem, CatalogItem } from '@/types';

interface TrainingV2Props {
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

export default function TrainingV2({ userId, bodyweight, sex, age, initialHistory, initialCatalog, onLogComplete, highestLevel = 0 }: TrainingV2Props) {
  const { theme: _theme } = useTheme();
  const theme = _theme || THEMES.athlete;
  const rankKey = `level${Math.min(highestLevel, 5)}`;
  const rankImage = theme.ranks?.[rankKey]?.image;
  const [weekDays, setWeekDays] = useState<DayPlan[]>([]);
  const [selectedDayStr, setSelectedDayStr] = useState('');
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showWeekView, setShowWeekView] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

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
    return (
      <div className="max-w-3xl mx-auto pb-32">
        <button
          onClick={() => setShowActiveWorkout(false)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium px-2 py-3 transition"
        >
          <span>‹</span> Back to schedule
        </button>
        <ActiveWorkout userId={userId} initialDate={selectedDayStr} onLogComplete={() => onLogComplete?.()} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 pb-32" style={{ backgroundImage: theme.bgTexture }}>

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
            {/* Rank avatar */}
            {rankImage && (
              <img src={rankImage} alt="" className="absolute -right-2 -bottom-2 w-24 h-24 object-contain opacity-10 pointer-events-none select-none" />
            )}

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

              {/* Exercise preview */}
              {today.plan.exercises && today.plan.exercises.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {today.plan.exercises.slice(0, 5).map((ex, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                      {ex}
                    </span>
                  ))}
                  {today.plan.exercises.length > 5 && (
                    <span className="text-[10px] px-2 py-1 text-zinc-500">+{today.plan.exercises.length - 5} more</span>
                  )}
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
                  onClick={() => { setSelectedDayStr(todayStr); setShowActiveWorkout(true); }}
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

      {/* Week Schedule — Collapsible */}
      <div className="mx-2">
        <button
          onClick={() => setShowWeekView(!showWeekView)}
          className="flex items-center justify-between w-full py-3 px-1"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">This Week</span>
          <ChevronDown size={16} className={`text-zinc-500 transition-transform ${showWeekView ? 'rotate-180' : ''}`} />
        </button>

        {showWeekView && (
          <div className="flex flex-col gap-1.5 animate-fade-in-up pb-2">
            {weekDays.map(day => {
              const isToday = day.dateStr === todayStr;
              const style = TYPE_STYLES[day.plan.type] || TYPE_STYLES.Recovery;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => { setSelectedDayStr(day.dateStr); setShowActiveWorkout(true); }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                    isToday
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
    </div>
  );
}
