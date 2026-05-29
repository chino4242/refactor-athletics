'use client';

import { useState } from 'react';
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
  const [blockSets, setBlockSets] = useState<Record<number, { completed: number[]; weights: string[]; reps: string[] }>>({});
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);

  // Rest timer
  useState(() => {
    const interval = setInterval(() => {
      if (isResting) setRestTime(prev => prev > 0 ? prev - 1 : (setIsResting(false), 0));
    }, 1000);
    return () => clearInterval(interval);
  });

  const getBlockState = (idx: number) => {
    const block = workoutData[idx];
    const totalSets = block.sets || block.exercises?.length || 1;
    if (!blockSets[idx]) return { completed: [] as number[], weights: Array(totalSets).fill('') as string[], reps: Array(totalSets).fill('') as string[] };
    return blockSets[idx];
  };

  const toggleSet = (blockIdx: number, setIdx: number) => {
    const block = workoutData[blockIdx];
    const totalSets = block.sets || 1;
    const state = getBlockState(blockIdx);
    const newCompleted = state.completed.includes(setIdx)
      ? state.completed.filter(s => s !== setIdx)
      : [...state.completed, setIdx];

    setBlockSets(prev => ({ ...prev, [blockIdx]: { ...state, completed: newCompleted } }));

    // Fire rest timer if not last set
    if (!state.completed.includes(setIdx) && newCompleted.length < totalSets) {
      const rest = block.rest_seconds || 60;
      setRestTime(rest);
      setIsResting(true);
    }
  };

  const updateWeight = (blockIdx: number, setIdx: number, val: string) => {
    const state = getBlockState(blockIdx);
    const weights = [...state.weights];
    weights[setIdx] = val;
    setBlockSets(prev => ({ ...prev, [blockIdx]: { ...state, weights } }));
  };

  const updateReps = (blockIdx: number, setIdx: number, val: string) => {
    const state = getBlockState(blockIdx);
    const reps = [...state.reps];
    reps[setIdx] = val;
    setBlockSets(prev => ({ ...prev, [blockIdx]: { ...state, reps } }));
  };

  const handleComplete = (blockIdx: number) => {
    const block = workoutData[blockIdx];
    const state = getBlockState(blockIdx);
    const isDuration = !!block.target_duration_seconds || (typeof block.reps_per_set === 'string' && block.reps_per_set.includes('s'));

    const exercisesPayload = [{
      name: block.name,
      catalogId: block.exercise_id,
      sets: state.completed.map(i => ({
        weight: isDuration ? 0 : parseFloat(state.weights[i] || '0'),
        ...(isDuration
          ? { duration: parseInt(state.reps[i], 10) || parseInt(String(block.target_duration_seconds || block.reps_per_set), 10) || 0 }
          : { reps: parseInt(state.reps[i], 10) || parseInt(String(block.reps_per_set), 10) || 10 }),
      })),
    }];

    onCompleteBlock(blockIdx, exercisesPayload);
    setExpandedBlock(null);
  };

  return (
    <div className="space-y-2 pb-4">
      <RestTimerBar restTime={restTime} totalRest={60} onSkip={() => { setRestTime(0); setIsResting(false); }} />

      {workoutData.map((block, idx) => {
        const isCompleted = completedIndices.includes(block._globalIdx ?? idx);
        const isExpanded = expandedBlock === idx;
        const totalSets = block.sets || 1;
        const state = getBlockState(idx);
        const setsCompleted = state.completed.length;

        // Skip non-exercise blocks (timers, recovery selectors)
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
            {/* Header — always visible */}
            <button
              onClick={() => !isCompleted && setExpandedBlock(isExpanded ? null : idx)}
              className="w-full flex items-center justify-between p-3 text-left"
              disabled={isCompleted}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isCompleted && <Check size={14} className="text-emerald-400 shrink-0" />}
                <span className={`text-sm font-medium truncate ${isCompleted ? 'text-emerald-400 line-through' : 'text-white'}`}>
                  {block.name || 'Exercise'}
                </span>
                {!isCompleted && setsCompleted > 0 && (
                  <span className="text-[10px] text-orange-400 font-bold">{setsCompleted}/{totalSets}</span>
                )}
              </div>
              {!isCompleted && (
                isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />
              )}
            </button>

            {/* Expanded — set inputs */}
            {isExpanded && !isCompleted && (
              <div className="px-3 pb-3 space-y-2">
                {Array.from({ length: totalSets }).map((_, i) => {
                  const isDone = state.completed.includes(i);
                  return (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${isDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                      <span className="text-[10px] text-zinc-500 w-8">S{i + 1}</span>
                      <input type="text" inputMode="decimal" placeholder="lbs" value={state.weights[i] || ''}
                        onChange={e => updateWeight(idx, i, e.target.value)}
                        className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-white text-center focus:border-orange-500 outline-none" />
                      <span className="text-zinc-600 text-[10px]">×</span>
                      <input type="text" inputMode="numeric" placeholder={String(block.reps_per_set || '10')} value={state.reps[i] || ''}
                        onChange={e => updateReps(idx, i, e.target.value)}
                        className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-white text-center focus:border-orange-500 outline-none" />
                      <button onClick={() => toggleSet(idx, i)}
                        className={`ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                        {isDone && <Check size={12} className="text-black" />}
                      </button>
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleComplete(idx)} disabled={setsCompleted === 0}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${setsCompleted === totalSets ? 'bg-orange-600 text-white' : setsCompleted > 0 ? 'bg-zinc-800 text-orange-400 border border-orange-500/30' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
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
