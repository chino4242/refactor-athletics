'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TimedWorkoutActiveProps {
  template: {
    id: string;
    name: string;
    format: 'amrap' | 'for_time' | 'timed_rounds' | 'emom';
    duration_seconds: number;
    time_cap_seconds: number | null;
    rounds: number | null;
    exercises: any;
    benchmark_score: string | null;
  };
  userId: string;
  onComplete: (result: WorkoutResult) => void;
  onCancel: () => void;
}

interface WorkoutResult {
  rounds: number;
  partialReps: number;
  totalSeconds: number;
  format: string;
}

// ─── Coaching Lines by Theme ─────────────────────────────────────────────────

const COACHING_LINES: Record<string, { quarter: string; half: string; threeQuarter: string; finalMinute: string; done: string }> = {
  athlete: {
    quarter: 'Good start. Stay consistent.',
    half: 'Halfway. Keep moving.',
    threeQuarter: 'Three quarters done. Push through.',
    finalMinute: 'Final minute. Everything you have.',
    done: 'Time. Great work.',
  },
  dragon: {
    quarter: 'The fire builds. Feed it.',
    half: 'Halfway. The dragon stirs.',
    threeQuarter: 'Almost there. Burn everything.',
    finalMinute: 'Final minute. Unleash the inferno.',
    done: 'Done. The flame dies only when you say.',
  },
  samurai: {
    quarter: 'Discipline. One breath at a time.',
    half: 'Halfway. The blade sharpens.',
    threeQuarter: 'Honor demands you finish.',
    finalMinute: 'Final minute. Strike with everything.',
    done: 'Done. The clock stops. You remain.',
  },
  viking: {
    quarter: 'The storm gathers. Row harder.',
    half: 'Halfway across. No turning back.',
    threeQuarter: 'Shore in sight. Dig deep.',
    finalMinute: 'Final minute. For Valhalla.',
    done: 'Done. The saga records this.',
  },
  dinosaur: {
    quarter: 'The hunt begins. Find your rhythm.',
    half: 'Halfway. The prey weakens.',
    threeQuarter: 'Closing in. Do not slow.',
    finalMinute: 'Final minute. Go for the kill.',
    done: 'Done. Apex achieved.',
  },
};

function getCoachingLines(theme: string) {
  return COACHING_LINES[theme] || COACHING_LINES.athlete;
}

// ─── Timer Helpers ───────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimedWorkoutActive({ template, userId, onComplete, onCancel }: TimedWorkoutActiveProps) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const coaching = getCoachingLines(currentTheme);

  const duration = template.duration_seconds;

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const pausedElapsedRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Round state
  const [rounds, setRounds] = useState(0);
  const [partialReps, setPartialReps] = useState<Record<number, boolean>>({});

  // Coaching state
  const [coachingLine, setCoachingLine] = useState<string | null>(null);
  const shownCoachingRef = useRef<Set<string>>(new Set());
  const coachingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse exercises from template
  const exercises: { name: string; reps: number | string }[] = Array.isArray(template.exercises)
    ? template.exercises.map((ex: any) => ({
        name: ex.name || ex.exercise || 'Unknown',
        reps: ex.reps || ex.target_reps || ex.rep_scheme || '—',
      }))
    : [];

  // ─── Timer Logic ─────────────────────────────────────────────────────────

  const getElapsed = useCallback(() => {
    if (!isRunning) return pausedElapsedRef.current;
    return pausedElapsedRef.current + (Date.now() - startTimeRef.current);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || isComplete) return;

    timerRef.current = setInterval(() => {
      const elapsedMs = getElapsed();
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, duration - elapsedSec);
      setTimeRemaining(remaining);

      // Check coaching milestones
      const progress = elapsedSec / duration;
      if (progress >= 0.25 && !shownCoachingRef.current.has('quarter')) {
        shownCoachingRef.current.add('quarter');
        showCoaching(coaching.quarter);
      } else if (progress >= 0.5 && !shownCoachingRef.current.has('half')) {
        shownCoachingRef.current.add('half');
        showCoaching(coaching.half);
      } else if (progress >= 0.75 && !shownCoachingRef.current.has('threeQuarter')) {
        shownCoachingRef.current.add('threeQuarter');
        showCoaching(coaching.threeQuarter);
      } else if (remaining <= 60 && remaining > 0 && !shownCoachingRef.current.has('finalMinute')) {
        shownCoachingRef.current.add('finalMinute');
        showCoaching(coaching.finalMinute);
      }

      // Timer complete
      if (remaining <= 0) {
        handleTimerComplete();
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isComplete, duration, getElapsed, coaching]);

  const showCoaching = (line: string) => {
    setCoachingLine(line);
    if (coachingTimeoutRef.current) clearTimeout(coachingTimeoutRef.current);
    coachingTimeoutRef.current = setTimeout(() => setCoachingLine(null), 4000);
  };

  const handleTimerComplete = () => {
    setIsComplete(true);
    setIsRunning(false);
    setTimeRemaining(0);
    if (timerRef.current) clearInterval(timerRef.current);
    showCoaching(coaching.done);

    // Haptic feedback
    import('@/utils/haptics').then(m => m.haptic('success'));
  };

  // ─── Pause/Resume ─────────────────────────────────────────────────────────

  const togglePause = () => {
    if (isRunning) {
      // Pause: record elapsed so far
      pausedElapsedRef.current += Date.now() - startTimeRef.current;
      setIsRunning(false);
    } else {
      // Resume: reset start time
      startTimeRef.current = Date.now();
      setIsRunning(true);
    }
  };

  // ─── Round Completion ─────────────────────────────────────────────────────

  const handleRoundComplete = () => {
    if (isComplete) return;
    setRounds(r => r + 1);
    import('@/utils/haptics').then(m => m.haptic('heavy'));
  };

  // ─── Partial Reps Toggle ──────────────────────────────────────────────────

  const togglePartialRep = (index: number) => {
    setPartialReps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const countPartialReps = () => {
    return Object.values(partialReps).filter(Boolean).length;
  };

  // ─── Submit Result ────────────────────────────────────────────────────────

  const handleSubmit = () => {
    const elapsed = Math.floor(pausedElapsedRef.current / 1000) + (isRunning ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0);
    onComplete({
      rounds,
      partialReps: countPartialReps(),
      totalSeconds: Math.min(elapsed, duration),
      format: 'amrap',
    });
  };

  // ─── Keep screen awake ────────────────────────────────────────────────────

  useEffect(() => {
    let wakeLock: any = null;
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {}
    };
    acquire();
    const onVisChange = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { wakeLock?.release(); document.removeEventListener('visibilitychange', onVisChange); };
  }, []);

  // ─── Accent color helper ──────────────────────────────────────────────────

  const accentBorder = colors.primary; // e.g. 'border-red-800'
  const accentText = colors.secondary; // e.g. 'text-red-400'

  // ─── Render: Completion State ─────────────────────────────────────────────

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6">
        {/* Coaching line (done) */}
        {coachingLine && (
          <p className={`text-sm font-medium ${accentText} mb-6 text-center italic animate-in fade-in duration-500`}>
            {coachingLine}
          </p>
        )}

        <div className="text-6xl mb-4">⏱️</div>
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">TIME!</h1>
        <p className="text-zinc-400 text-sm mb-8">{template.name} — {formatTime(duration)} AMRAP</p>

        {/* Score */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm mb-6">
          <div className="text-center mb-4">
            <span className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Rounds Completed</span>
            <p className="text-5xl font-black text-white mt-1">{rounds}</p>
          </div>

          {/* Partial reps section */}
          {exercises.length > 0 && (
            <div className="border-t border-zinc-800 pt-4 mt-4">
              <span className="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-3">
                Partial Round (check completed)
              </span>
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => togglePartialRep(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      partialReps[i] ? 'bg-zinc-800' : 'bg-zinc-900/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      partialReps[i] ? `${accentBorder} bg-zinc-800` : 'border-zinc-600'
                    }`}>
                      {partialReps[i] && <CheckCircle2 size={14} className={accentText} />}
                    </div>
                    <span className="text-white text-sm font-medium">{ex.reps} {ex.name}</span>
                  </button>
                ))}
              </div>
              {countPartialReps() > 0 && (
                <p className={`text-xs ${accentText} mt-2 text-center`}>
                  +{countPartialReps()} partial rep{countPartialReps() > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Previous best */}
        {template.benchmark_score && (
          <p className="text-zinc-500 text-xs mb-4">
            Previous best: <span className="text-zinc-300 font-bold">{template.benchmark_score}</span>
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          className={`w-full max-w-sm h-14 rounded-xl font-black text-lg uppercase tracking-wide transition-all active:scale-95 bg-white text-black`}
        >
          Save Result
        </button>

        <button onClick={onCancel} className="mt-4 text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
          Discard
        </button>
      </div>
    );
  }

  // ─── Render: Active Timer ─────────────────────────────────────────────────

  // Progress for visual indicator
  const progress = 1 - timeRemaining / duration;
  const isUrgent = timeRemaining <= 60 && timeRemaining > 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-safe-top py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">AMRAP</span>
          {template.benchmark_score && (
            <span className="text-zinc-600 text-xs">Best: {template.benchmark_score}</span>
          )}
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
          aria-label="Cancel workout"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-zinc-900 shrink-0">
        <div
          className={`h-full transition-all duration-200 ${isUrgent ? 'bg-red-500' : 'bg-zinc-600'}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-between py-6 px-4 overflow-hidden">
        {/* Timer */}
        <div className="text-center shrink-0">
          <p className={`text-[72px] sm:text-[96px] font-black font-mono leading-none tracking-tighter transition-colors duration-300 ${
            isUrgent ? 'text-red-400 animate-pulse' : 'text-white'
          }`}>
            {formatTime(timeRemaining)}
          </p>
          {/* Pause indicator */}
          {!isRunning && (
            <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest mt-2 animate-pulse">
              PAUSED
            </p>
          )}
        </div>

        {/* Coaching line */}
        {coachingLine && (
          <div className="shrink-0 my-2">
            <p className={`text-sm font-medium ${accentText} text-center italic animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              &ldquo;{coachingLine}&rdquo;
            </p>
          </div>
        )}

        {/* Exercises List */}
        <div className="w-full max-w-sm shrink-0">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-zinc-500 text-xs font-mono w-8 text-right shrink-0">{ex.reps}</span>
                  <span className="text-white text-sm font-medium">{ex.name}</span>
                </div>
              ))}
              {exercises.length === 0 && (
                <p className="text-zinc-600 text-sm text-center">No exercises listed</p>
              )}
            </div>
          </div>
        </div>

        {/* Round Counter */}
        <div className="text-center shrink-0 my-4">
          <span className="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Rounds</span>
          <p className="text-5xl font-black text-white">{rounds}</p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="px-4 pb-safe-bottom pb-4 shrink-0 space-y-3">
        {/* Round Complete Button */}
        <button
          onClick={handleRoundComplete}
          className={`w-full h-16 rounded-2xl font-black text-xl uppercase tracking-wide transition-all active:scale-95 border-2 ${accentBorder} bg-zinc-900 text-white`}
        >
          ROUND ✓
        </button>

        {/* Pause / Cancel row */}
        <div className="flex items-center justify-between">
          <button
            onClick={togglePause}
            className="text-zinc-400 text-sm font-bold uppercase tracking-wider hover:text-white transition-colors px-3 py-2"
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={onCancel}
            className="text-zinc-600 text-sm hover:text-red-400 transition-colors px-3 py-2"
          >
            End Early
          </button>
        </div>
      </div>
    </div>
  );
}
