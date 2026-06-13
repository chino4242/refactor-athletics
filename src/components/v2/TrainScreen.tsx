"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import PixelBox, { ScreenWrapper } from './PixelBox';
import NutritionInputV2 from './NutritionInputV2';
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
      } catch {}
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return <TrainSkeleton />;
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className={`text-[10px] ${colors.headerText} uppercase tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          TRAIN
        </p>
      </div>

      {/* Weekly View */}
      <PixelBox className="p-3 mb-4">
        <p className={`text-[8px] ${colors.headerText} mb-2 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
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
                <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  {day.label}
                </span>
                <div className={`w-6 h-6 flex items-center justify-center border ${
                  isSelected ? `${colors.primary} bg-zinc-700` :
                  day.isToday && !selectedDay ? `${colors.primary} bg-zinc-800` :
                  day.completed ? 'border-green-500 bg-green-900/30' :
                  'border-zinc-700 bg-zinc-900'
                }`}>
                  {day.completed && !isSelected && <span className="text-[8px] text-green-400">✓</span>}
                  {day.isToday && !day.completed && !isSelected && !selectedDay && <span className={`text-[8px] ${colors.secondary}`}>▸</span>}
                  {isSelected && <span className={`text-[8px] ${colors.secondary}`}>▸</span>}
                </div>
              </button>
            );
          })}
        </div>
      </PixelBox>

      {/* Today's Workout */}
      <PixelBox highlight className="p-4 mb-4">
        {workout ? (
          <>
            <p className={`text-[9px] ${colors.headerText} mb-2 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {selectedDay ? `${selectedDay.toUpperCase()}'S WORKOUT` : "TODAY\u0027S WORKOUT"}
            </p>
            <p className="text-sm text-white font-medium mb-2">{workout.name}</p>
            <div className="space-y-1 mb-3">
              {workout.exercises.map((ex, i) => (
                <p key={i} className="text-xs text-zinc-400">• {ex}</p>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                +{workout.estimatedXp} XP
              </span>
              <a
                href={`/train/active${selectedDay ? `?day=${selectedDay}` : ''}`}
                className={`text-[10px] px-4 py-2 border ${colors.primary} bg-zinc-800 ${colors.secondary} hover:bg-zinc-700 transition-colors`}
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                {hasBattleSession ? '▸ RESUME BATTLE' : '▸ START'}
              </a>
            </div>
          </>
        ) : (
          <>
            <p className={`text-[9px] ${colors.headerText} mb-2 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              TODAY
            </p>
            <p className="text-xs text-zinc-400 mb-3">No workout scheduled</p>
            <a
              href="/train/active"
              className={`inline-block text-[10px] px-4 py-2 border ${colors.primary} bg-zinc-800 text-white hover:bg-zinc-700 transition-colors`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              {hasBattleSession ? '▸ RESUME BATTLE' : '▸ QUICK LOG'}
            </a>
          </>
        )}
      </PixelBox>

      {/* Nutrition */}
      <PixelBox className="p-4 mb-4">
        <p className={`text-[8px] ${colors.headerText} mb-2 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          FUEL
        </p>
        <NutritionInputV2 userId={userId} />
      </PixelBox>

      {/* Quick Log */}
      <PixelBox className="p-4">
        <p className={`text-[9px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          QUICK LOG
        </p>
        <p className="text-[8px] text-zinc-500 mb-2">Manual entry when sync fails</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '🏃 RUN', href: '/train/active?mode=flexible&filter=cardio' },
            { label: '🏋️ LIFT', href: '/train/active?mode=flexible&filter=strength' },
            { label: '◆ OTHER', href: '/train/active?mode=flexible' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-[8px] px-2 py-3 border ${colors.border} bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 transition-colors text-center`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </PixelBox>
    </ScreenWrapper>
  );
}
