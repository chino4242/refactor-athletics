'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import RestTimerBar from './RestTimerBar';

interface FlexibleViewProps {
  workoutData: any[];
  completedIndices: number[];
  onCompleteBlock: (blockIndex: number, exercisesData?: any[]) => void;
  onSkipBlock: (blockIndex: number) => void;
  fullHistory: any[];
  catalog: any[];
  userProfile: any;
}

export default function FlexibleWorkoutView({ workoutData, completedIndices, onCompleteBlock, onSkipBlock, fullHistory, catalog, userProfile }: FlexibleViewProps) {
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  const [blockSets, setBlockSets] = useState<Record<number, Record<string, { completed: number[]; weights: string[]; reps: string[] }>>>({});
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const restStartRef = useRef<number>(0);
  const restDurationRef = useRef<number>(0);

  // Wall-clock rest timer
  useEffect(() => {
    if (!isResting || restTime <= 0) {
      if (restTime === 0 && isResting) setIsResting(false);
      return;
    }
    if (restStartRef.current === 0) {
      restStartRef.current = Date.now();
      restDurationRef.current = restTime;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - restStartRef.current) / 1000);
      const remaining = Math.max(0, restDurationRef.current - elapsed);
      setRestTime(remaining);
      if (remaining === 0) setIsResting(false);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isResting]);

  const startRest = (seconds: number) => {
    restStartRef.current = 0;
    setRestTime(seconds);
    setIsResting(true);
  };

  // Get exercises for a block (handles supersets)
  const getExercises = (block: any): { id: string; name: string; sets: number; repsPerSet: string }[] => {
    if (block.type === 'superset' && block.exercises) {
      return block.exercises.map((ex: any) => ({
        id: ex.exercise_id || ex.name,
        name: ex.name || ex.exercise_id || 'Exercise',
        sets: ex.sets || block.sets || 3,
        repsPerSet: ex.reps || String(block.reps_per_set || 10),
      }));
    }
    return [{
      id: block.exercise_id || block.name,
      name: block.name || 'Exercise',
      sets: block.sets || 1,
      repsPerSet: String(block.reps_per_set || 10),
    }];
  };

  const getExState = (blockIdx: number, exId: string, totalSets: number) => {
    const block = blockSets[blockIdx];
    if (!block || !block[exId]) return { completed: [] as number[], weights: Array(totalSets).fill(''), reps: Array(totalSets).fill('') };
    return block[exId];
  };

  const updateExState = (blockIdx: number, exId: string, totalSets: number, updater: (prev: { completed: number[]; weights: string[]; reps: string[] }) => { completed: number[]; weights: string[]; reps: string[] }) => {
    setBlockSets(prev => {
      const block = prev[blockIdx] || {};
      const current = block[exId] || { completed: [], weights: Array(totalSets).fill(''), reps: Array(totalSets).fill('') };
      return { ...prev, [blockIdx]: { ...block, [exId]: updater(current) } };
    });
  };

  const toggleSet = (blockIdx: number, exId: string, setIdx: number, totalSets: number, restSeconds: number) => {
    updateExState(blockIdx, exId, totalSets, prev => {
      const newCompleted = prev.completed.includes(setIdx)
        ? prev.completed.filter(s => s !== setIdx)
        : [...prev.completed, setIdx];
      // Start rest if completing (not unchecking) and not last set
      if (!prev.completed.includes(setIdx) && newCompleted.length < totalSets) {
        startRest(restSeconds);
      }
      return { ...prev, completed: newCompleted };
    });
  };

  const handleComplete = (blockIdx: number) => {
    const block = workoutData[blockIdx];
    const exercises = getExercises(block);
    const isDuration = !!block.target_duration_seconds || (typeof block.reps_per_set === 'string' && String(block.reps_per_set).includes('s'));

    const exercisesPayload = exercises.map(ex => {
      const state = getExState(blockIdx, ex.id, ex.sets);
      return {
        name: ex.name,
        catalogId: block.type === 'superset' ? (block.exercises?.find((e: any) => (e.exercise_id || e.name) === ex.id)?.exercise_id || null) : block.exercise_id,
        sets: state.completed.map(i => ({
          weight: isDuration ? 0 : parseFloat(state.weights[i] || '0'),
          ...(isDuration
            ? { duration: parseInt(state.reps[i], 10) || parseInt(String(block.target_duration_seconds || block.reps_per_set), 10) || 0 }
            : { reps: parseInt(state.reps[i], 10) || parseInt(ex.repsPerSet, 10) || 10 }),
        })),
      };
    }).filter(ex => ex.sets.length > 0);

    onCompleteBlock(blockIdx, exercisesPayload);
    setExpandedBlock(null);
  };

  const getTotalCompleted = (blockIdx: number) => {
    const exercises = getExercises(workoutData[blockIdx]);
    const block = blockSets[blockIdx];
    if (!block) return 0;
    return exercises.reduce((sum, ex) => sum + (block[ex.id]?.completed?.length || 0), 0);
  };

  const getTotalSets = (blockIdx: number) => {
    const exercises = getExercises(workoutData[blockIdx]);
    return exercises.reduce((sum, ex) => sum + ex.sets, 0);
  };

  return (
    <div className="space-y-2 pb-4">
      <RestTimerBar restTime={restTime} totalRest={restDurationRef.current || 60} onSkip={() => { setRestTime(0); setIsResting(false); }} />

      {workoutData.map((block, idx) => {
        const isCompleted = completedIndices.includes(block._globalIdx ?? idx);
        const isExpanded = expandedBlock === idx;
        const totalCompleted = getTotalCompleted(idx);
        const totalSets = getTotalSets(idx);
        const exercises = getExercises(block);

        // Non-exercise blocks
        if (block.type === 'timer' || block.type === 'recovery_selector') {
          return (
            <div key={idx} className={`rounded-xl border p-3 ${isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{block.name}</span>
                {isCompleted ? <Check size={16} className="text-emerald-400" /> : (
                  <button onClick={() => onCompleteBlock(idx)} className="text-[10px] text-orange-400 font-bold">Mark Done</button>
                )}
              </div>
            </div>
          );
        }

        return (
          <div key={idx} className={`rounded-xl border overflow-hidden transition-all ${
            isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' :
            isExpanded ? 'bg-zinc-800/50 border-zinc-700' :
            'bg-zinc-900 border-zinc-800'
          }`}>
            {/* Header */}
            <button
              onClick={() => !isCompleted && setExpandedBlock(isExpanded ? null : idx)}
              className="w-full flex items-center justify-between p-3 text-left"
              disabled={isCompleted}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isCompleted && <Check size={14} className="text-emerald-400 shrink-0" />}
                <div className="min-w-0">
                  <span className={`text-sm font-medium truncate block ${isCompleted ? 'text-emerald-400 line-through' : 'text-white'}`}>
                    {block.type === 'superset' ? exercises.map(e => e.name).join(' + ') : block.name || 'Exercise'}
                  </span>
                  {block.type === 'superset' && !isExpanded && (
                    <span className="text-[10px] text-zinc-600">Superset · {exercises.length} exercises</span>
                  )}
                </div>
                {!isCompleted && totalCompleted > 0 && (
                  <span className="text-[10px] text-orange-400 font-bold shrink-0">{totalCompleted}/{totalSets}</span>
                )}
              </div>
              {!isCompleted && (
                isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />
              )}
            </button>

            {/* Expanded — per-exercise set inputs */}
            {isExpanded && !isCompleted && (
              <div className="px-3 pb-3 space-y-3">
                {exercises.map((ex, exIdx) => {
                  const state = getExState(idx, ex.id, ex.sets);
                  const restSeconds = block.rest_seconds || 60;
                  return (
                    <div key={ex.id}>
                      {exercises.length > 1 && (
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">{ex.name} — {ex.sets}×{ex.repsPerSet}</div>
                      )}
                      <div className="space-y-1.5">
                        {Array.from({ length: ex.sets }).map((_, i) => {
                          const isDone = state.completed.includes(i);
                          return (
                            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${isDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                              <span className="text-[10px] text-zinc-500 w-8">S{i + 1}</span>
                              <input type="text" inputMode="decimal" placeholder="lbs" value={state.weights[i] || ''}
                                onChange={e => updateExState(idx, ex.id, ex.sets, prev => { const w = [...prev.weights]; w[i] = e.target.value; return { ...prev, weights: w }; })}
                                className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-white text-center focus:border-zinc-500 outline-none" />
                              <span className="text-zinc-600 text-[10px]">×</span>
                              <input type="text" inputMode="numeric" placeholder={ex.repsPerSet} value={state.reps[i] || ''}
                                onChange={e => updateExState(idx, ex.id, ex.sets, prev => { const r = [...prev.reps]; r[i] = e.target.value; return { ...prev, reps: r }; })}
                                className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-white text-center focus:border-zinc-500 outline-none" />
                              <button onClick={() => toggleSet(idx, ex.id, i, ex.sets, restSeconds)}
                                className={`ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                                {isDone && <Check size={12} className="text-black" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleComplete(idx)} disabled={totalCompleted === 0}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${totalCompleted === totalSets ? 'bg-orange-600 text-white' : totalCompleted > 0 ? 'bg-zinc-800 text-orange-400 border border-orange-500/30' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                    Complete Block
                  </button>
                  <button onClick={() => onSkipBlock(idx)} className="px-3 py-2 text-[10px] text-zinc-600 hover:text-red-400">Skip</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
