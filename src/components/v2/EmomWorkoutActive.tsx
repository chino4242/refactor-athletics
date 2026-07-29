"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { haptic } from '@/utils/haptics';

// --- Types ---

interface EmomExercise {
  name: string;
  reps: number;
  per_side?: boolean;
  unit?: string;
}

interface EmomWorkoutActiveProps {
  template: {
    id: string;
    name: string;
    format: 'emom';
    duration_seconds: number;
    exercises: {
      minutes: number;
      alternating: boolean;
      exercises?: EmomExercise[];
      odd_exercises?: EmomExercise[];
      even_exercises?: EmomExercise[];
    };
    benchmark_score: string | null;
  };
  userId: string;
  onComplete: (result: EmomResult) => void;
  onCancel: () => void;
}

interface EmomResult {
  minutesCompleted: number;
  minutesTotal: number;
  roundsCompleted: number;
  totalSeconds: number;
  format: 'emom';
}

type MinuteStatus = 'pending' | 'active' | 'completed' | 'missed';

// --- Component ---

export default function EmomWorkoutActive({ template, userId, onComplete, onCancel }: EmomWorkoutActiveProps) {
  const totalMinutes = template.exercises.minutes;
  const isAlternating = template.exercises.alternating;

  // State
  const [currentMinute, setCurrentMinute] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(60.0);
  const [isResting, setIsResting] = useState(false);
  const [minuteStatuses, setMinuteStatuses] = useState<MinuteStatus[]>(() => {
    const s = Array<MinuteStatus>(totalMinutes).fill('pending');
    s[0] = 'active';
    return s;
  });
  const [isFinished, setIsFinished] = useState(false);
  const [coaching, setCoaching] = useState("Let's go.");

  // Refs for timer precision
  const minuteStartRef = useRef<number>(Date.now());
  const workoutStartRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneThisMinuteRef = useRef(false);
  const currentMinuteRef = useRef(1);
  const isFinishedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { currentMinuteRef.current = currentMinute; }, [currentMinute]);
  useEffect(() => { isFinishedRef.current = isFinished; }, [isFinished]);

  // Get exercises for a given minute
  const getExercisesForMinute = useCallback((minute: number): EmomExercise[] => {
    if (!isAlternating) {
      return template.exercises.exercises || [];
    }
    return minute % 2 === 1
      ? (template.exercises.odd_exercises || [])
      : (template.exercises.even_exercises || []);
  }, [isAlternating, template.exercises]);

  // Coaching line logic
  const getCoachingLine = useCallback((minute: number, total: number): string => {
    if (minute === 1) return "Let's go.";
    if (minute === Math.ceil(total / 2)) return 'Halfway. Stay with it.';
    if (minute === total) return 'Last one. Make it count.';
    return '';
  }, []);

  // Advance to next minute or finish
  const advanceMinute = useCallback(() => {
    const cm = currentMinuteRef.current;

    // Mark current minute based on whether user tapped Done
    setMinuteStatuses(prev => {
      const next = [...prev];
      if (!doneThisMinuteRef.current) {
        next[cm - 1] = 'missed';
      }
      return next;
    });

    // Check if workout is complete
    if (cm >= totalMinutes) {
      setIsFinished(true);
      isFinishedRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      haptic('success');
      setCoaching('All minutes accounted for.');
      return;
    }

    // Move to next minute
    haptic('medium');
    const nextMinute = cm + 1;
    setCurrentMinute(nextMinute);
    currentMinuteRef.current = nextMinute;
    setIsResting(false);
    doneThisMinuteRef.current = false;
    minuteStartRef.current = Date.now();
    setSecondsRemaining(60);

    setMinuteStatuses(prev => {
      const next = [...prev];
      next[nextMinute - 1] = 'active';
      return next;
    });

    const line = getCoachingLine(nextMinute, totalMinutes);
    setCoaching(line);
  }, [totalMinutes, getCoachingLine]);

  // Main timer loop
  useEffect(() => {
    workoutStartRef.current = Date.now();
    minuteStartRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      if (isFinishedRef.current) return;

      const elapsed = (Date.now() - minuteStartRef.current) / 1000;
      const remaining = 60 - elapsed;

      if (remaining <= 0) {
        // Minute is over — advance
        advanceMinute();
      } else {
        setSecondsRemaining(remaining);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [advanceMinute]);

  // Handle 'Done' tap
  const handleDone = useCallback(() => {
    if (isResting || isFinished) return;

    doneThisMinuteRef.current = true;
    setIsResting(true);
    haptic('light');

    setMinuteStatuses(prev => {
      const next = [...prev];
      next[currentMinute - 1] = 'completed';
      return next;
    });
  }, [isResting, isFinished, currentMinute]);

  // Format time display
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '0.0';
    if (seconds <= 10) return seconds.toFixed(1);
    return Math.ceil(seconds).toString();
  };

  // 3-2-1 final countdown detection
  const isCountdown = secondsRemaining <= 3 && secondsRemaining > 0 && !isResting;

  // Current exercises
  const currentExercises = getExercisesForMinute(currentMinute);

  // Stats
  const completedCount = minuteStatuses.filter(s => s === 'completed').length;
  const missedCount = minuteStatuses.filter(s => s === 'missed').length;

  // --- Trigger onComplete after showing results ---
  useEffect(() => {
    if (!isFinished) return;

    const roundsCompleted = minuteStatuses.filter(s => s === 'completed').length;
    const totalSeconds = Math.round((Date.now() - workoutStartRef.current) / 1000);

    const timeout = setTimeout(() => {
      onComplete({
        minutesCompleted: totalMinutes,
        minutesTotal: totalMinutes,
        roundsCompleted,
        totalSeconds,
        format: 'emom',
      });
    }, 4000);

    return () => clearTimeout(timeout);
  }, [isFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Results Screen ---
  if (isFinished) {
    const totalSeconds = Math.round((Date.now() - workoutStartRef.current) / 1000);
    const roundsCompleted = minuteStatuses.filter(s => s === 'completed').length;

    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6 animate-fade-in">
          {/* Completion icon */}
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto">
            <span className="text-3xl text-green-400">✓</span>
          </div>

          <h1 className="text-2xl font-bold text-white">{template.name}</h1>
          <p className="text-zinc-500 text-xs uppercase tracking-wider">EMOM Complete</p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 pt-4 w-full max-w-sm mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Minutes</p>
              <p className="text-2xl font-bold text-white mt-1">{totalMinutes}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{roundsCompleted}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Missed</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{missedCount}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Time</p>
              <p className="text-2xl font-bold text-white mt-1">
                {Math.floor(totalSeconds / 60)}:{String(totalSeconds % 60).padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* Minute progress recap */}
          <div className="flex items-center justify-center gap-1.5 pt-4 flex-wrap max-w-xs mx-auto">
            {minuteStatuses.map((status, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'missed' ? 'bg-red-500' :
                  'bg-zinc-700'
                }`}
              />
            ))}
          </div>

          {/* Coaching */}
          <p className="text-green-400 text-sm italic mt-4">{coaching}</p>
        </div>
      </div>
    );
  }

  // --- Active Workout Screen ---
  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Safe area top padding */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          onClick={onCancel}
          className="text-zinc-500 text-sm px-3 py-1.5 border border-zinc-800 rounded-lg active:bg-zinc-800 transition-colors"
        >
          ✕ Quit
        </button>
        <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium">
          {template.name}
        </p>
        <div className="w-16" />
      </div>

      {/* Minute indicator */}
      <div className="text-center pt-1 pb-1">
        <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-medium">
          MINUTE {currentMinute} / {totalMinutes}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 px-4 py-3 flex-wrap max-w-xs mx-auto">
        {minuteStatuses.map((status, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              status === 'completed' ? 'bg-green-500' :
              status === 'missed' ? 'bg-red-500' :
              status === 'active' ? 'bg-white scale-125 shadow-[0_0_6px_rgba(255,255,255,0.5)]' :
              'bg-zinc-700'
            }`}
          />
        ))}
      </div>

      {/* Timer — HERO section */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* 3-2-1 countdown background pulse */}
        {isCountdown && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[14rem] font-black text-white/10 animate-pulse leading-none select-none">
              {Math.ceil(secondsRemaining)}
            </span>
          </div>
        )}

        {/* Main timer display */}
        <div className="relative z-10 text-center">
          <p
            className={`font-mono font-black leading-none transition-colors duration-300 ${
              isResting ? 'text-green-400' : 'text-white'
            } ${secondsRemaining <= 10 ? 'text-7xl' : 'text-8xl sm:text-9xl'}`}
          >
            {formatTime(secondsRemaining)}
          </p>
          <p className={`text-sm mt-4 uppercase tracking-[0.3em] font-semibold ${
            isResting ? 'text-green-500' : 'text-zinc-600'
          }`}>
            {isResting ? 'REST' : 'WORK'}
          </p>
        </div>

        {/* Coaching line */}
        {coaching && (
          <p className="text-zinc-500 text-sm italic mt-8 text-center px-8">
            {coaching}
          </p>
        )}
      </div>

      {/* Exercise list */}
      <div className="px-5 pb-3">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-2.5">
          {isAlternating && (
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1 font-medium">
              {currentMinute % 2 === 1 ? 'ODD MINUTE' : 'EVEN MINUTE'}
            </p>
          )}
          {currentExercises.map((ex, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">{ex.name}</span>
              <span className="text-zinc-400 text-sm font-mono tabular-nums">
                {ex.reps}{ex.unit ? ` ${ex.unit}` : ''}{ex.per_side ? ' /side' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Done button */}
      <div className="px-5 pb-6">
        <div className="pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={handleDone}
            disabled={isResting}
            className={`w-full py-5 rounded-xl text-lg font-bold uppercase tracking-wider transition-all duration-150 ${
              isResting
                ? 'bg-green-950/40 border-2 border-green-800 text-green-500 cursor-default'
                : 'bg-white text-black active:scale-[0.97] active:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
            }`}
          >
            {isResting ? '✓ DONE' : 'DONE ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
