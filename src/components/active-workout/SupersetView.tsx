'use client';

import { useState, useEffect, useMemo } from 'react';
import { CatalogItem, HistoryItem } from '@/types';
import ExerciseHistoryModal from '../ExerciseHistoryModal';
import { playCountdownBeep } from '../../utils/audio';
import EquipmentVariantPicker, { getEquipmentVariants } from '../EquipmentVariantPicker';
import WeightCalculator from '../WeightCalculator';
import RestTimerBar from './RestTimerBar';
import { Info, ArrowLeftRight, CheckCircle, Calendar } from 'lucide-react';
import { EXERCISE_CUES } from '@/data/exerciseCues';

export default function SupersetView({ block, blockIndex, onComplete, fullHistory, catalog, exerciseSwaps, onSwap, userProfile }: any) {
  const [completedSets, setCompletedSets] = useState<Record<number, number[]>>({});
  const [weights, setWeights] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const exs = block.exercises || [];
    const sets = block.sets || 3;
    exs.forEach((ex: any, exIdx: number) => {
      const exName = (ex.name || '').toLowerCase();
      const logs = (fullHistory || [])
        .filter((h: any) => (h.exercise_id || '').toLowerCase().includes(exName) || exName.includes((h.exercise_id || '').toLowerCase()))
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      if (logs.length > 0) {
        const lastSets = logs[0].details || logs[0].data || [];
        const lastWeight = lastSets[0]?.weight;
        if (lastWeight) {
          for (let s = 0; s < sets; s++) initial[`${exIdx}-${s}`] = String(lastWeight);
        }
      }
    });
    return initial;
  });
  const [reps, setReps] = useState<Record<string, string>>({});

  const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<CatalogItem | null>(null);

  // Equipment variant overrides per exercise index
  const [variantOverrides, setVariantOverrides] = useState<Record<number, CatalogItem>>({});

  // Rest Timer State
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const exercises = block.exercises || [];
  const totalSets = block.sets || 3;

  // Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (isResting && restTime > 0) {
      if (restTime === 10) {
        try {
          if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance('10 seconds');
            u.rate = 1.1; u.volume = 1;
            speechSynthesis.speak(u);
          }
        } catch {}
      }
      if (restTime <= 5) playCountdownBeep();
      interval = setInterval(() => setRestTime((p) => p - 1), 1000);
    } else if (restTime === 0 && isResting) {
      setIsResting(false);
      playCountdownBeep();
    }
    return () => clearInterval(interval);
  }, [isResting, restTime]);

  const toggleSet = (exIdx: number, setIdx: number) => {
    const currentCompleted = completedSets[exIdx] || [];
    let newCompleted;

    const wasCompleted = currentCompleted.includes(setIdx);

    if (wasCompleted) {
      newCompleted = currentCompleted.filter(s => s !== setIdx);
      setIsResting(false); // Cancel rest if untoggling
    } else {
      newCompleted = [...currentCompleted, setIdx];
    }

    const newCompletedSets = {
      ...completedSets,
      [exIdx]: newCompleted
    };

    setCompletedSets(newCompletedSets);

    // CHECK ROUND COMPLETION
    // Only if we just marked it as complete (not untoggled)
    if (!wasCompleted) {
      // Check if ALL exercises have 'setIdx' in their completed list
      const isRoundComplete = exercises.every((_: any, i: number) => {
        const finished = (i === exIdx) ? newCompleted : (newCompletedSets[i] || []);
        return finished.includes(setIdx);
      });

      // Start Rest Timer if Round is Complete AND it's not the last round
      if (isRoundComplete && setIdx < totalSets - 1) {
        setRestTime(block.rest_seconds || 60); // Supersets default 60s
        setIsResting(true);
      }
    }
  };

  const updateWeight = (exIdx: number, setIdx: number, val: string) => {
    setWeights({
      ...weights,
      [`${exIdx}-${setIdx}`]: val
    });
  };

  // Calculate Overall Progress
  const totalSlots = exercises.length * totalSets;
  const totalCompleted = Object.values(completedSets).reduce((acc, curr) => acc + curr.length, 0);
  const progress = (totalCompleted / totalSlots) * 100;
  const isAllComplete = totalCompleted === totalSlots;

  return (
    <div className="w-full max-w-md mx-auto h-[calc(100dvh-80px)] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative bg-zinc-900 border border-zinc-800">

      {/* 🟢 HISTORY MODAL */}
      {selectedExerciseForHistory && (
        <ExerciseHistoryModal
          exercise={selectedExerciseForHistory}
          history={fullHistory}
          onClose={() => setSelectedExerciseForHistory(null)}
        />
      )}

      {/* HEADER */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-6 z-10">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-purple-500 font-bold uppercase tracking-widest text-xs">
            Superset Block
          </h2>
          <div className="bg-purple-500/10 text-purple-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-purple-500/20">
            <span>+{block.xp_value} XP</span>
          </div>
        </div>
        <h1 className="text-white text-2xl font-black italic leading-tight">
          {block.name.replace(/^\d+\.\s*/, '').replace(/Superset\s*/i, '').replace(/[()]/g, '')}
        </h1>
        <p className="text-zinc-400 text-sm mt-1 font-mono">
          {block.sets} Rounds × {exercises.length} Exercises • {block.rest_seconds || 90}s Rest
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {exercises.map((ex: any, i: number) => {
            const done = (completedSets[i] || []).length >= (block.sets || 3);
            const currentRound = Math.min(...exercises.map((_: any, ei: number) => (completedSets[ei] || []).length));
            const isNext = !done && (completedSets[i] || []).length === currentRound;
            return (
              <span key={i} className={`text-xs rounded-full px-2 py-0.5 border transition-all ${
                done ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                isNext ? 'bg-orange-500/15 text-orange-300 border-orange-500/30 ring-1 ring-orange-500/20' :
                'bg-purple-500/10 text-purple-300 border-purple-500/20'
              }`}>
                {isNext && '→ '}{ex.name}: <span className="font-bold">{ex.reps || '?'} reps</span>
              </span>
            );
          })}
        </div>
        {/* Form cues */}
        {exercises.some((ex: any) => EXERCISE_CUES[ex.exercise_id]) && (
          <div className="mt-3 space-y-1.5">
            {exercises.map((ex: any, i: number) => {
              const cueData = EXERCISE_CUES[ex.exercise_id];
              if (!cueData) return null;
              return (
                <div key={i} className="flex items-start gap-2 bg-zinc-800/50 rounded-lg px-2.5 py-1.5">
                  <span className="text-[10px] text-purple-400 font-bold shrink-0">{ex.name}:</span>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">{cueData.cue}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Tips */}
        {block.tips && block.tips.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-900/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
              <Info size={14} />
              <span>Coaches Tips</span>
            </div>
            <ul className="space-y-1">
              {block.tips.map((tip: string, i: number) => (
                <li key={i} className="text-blue-100/80 text-sm flex gap-2">
                  <span className="text-blue-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Last time hints */}
        {exercises.length > 0 && fullHistory && (
          <div className="space-y-1">
            {exercises.map((ex: any, exIdx: number) => {
              const swapKey = `${blockIndex}-${exIdx}`;
              const swap = exerciseSwaps?.[swapKey];
              const name = swap?.name || ex.name;
              const catItem = variantOverrides[exIdx] || swap?.catalogItem || catalog?.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
              const exId = catItem?.id;
              if (!exId) return null;
              const logs = fullHistory
                .filter((h: any) => h.exercise_id === exId && (h.details?.length > 0 || h.data?.length > 0))
                .sort((a: any, b: any) => b.timestamp - a.timestamp);
              if (logs.length === 0) return null;
              const sets = logs[0].details || logs[0].data || [];
              const summary = sets.map((s: any) => s.weight ? `${s.weight}×${s.reps}` : `${s.reps} reps`).join(', ');
              return (
                <div key={exIdx} className="px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                  <span className="text-[10px] text-zinc-500">{name}: </span>
                  <span className="text-[10px] text-zinc-300 font-mono">{summary}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ROUNDS LIST (Group by Set Index) */}
        {Array.from({ length: totalSets }).map((_, setIdx) => {
          // Check if this round is fully done for styling
          const isRoundDone = exercises.every((_: any, exIdx: number) =>
            (completedSets[exIdx] || []).includes(setIdx)
          );

          return (
            <div key={setIdx} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isRoundDone ? 'bg-zinc-900/50 border-purple-900/30' : 'bg-black/20 border-zinc-800'}`}>

              {/* Round Header */}
              <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <h3 className={`font-black italic uppercase tracking-wider ${isRoundDone ? 'text-purple-500' : 'text-zinc-400'}`}>
                  Round {setIdx + 1}
                </h3>
                {isRoundDone && <CheckCircle size={14} className="text-purple-500" />}
              </div>

              {/* Exercises in this Round */}
              <div className="space-y-2 p-3">
                {exercises.map((ex: any, exIdx: number) => {
                  const isDone = (completedSets[exIdx] || []).includes(setIdx);
                  const weightKey = `${exIdx}-${setIdx}`;
                  const repsKey = `${exIdx}-${setIdx}`;
                  const targetReps = ex.reps_list ? ex.reps_list[setIdx] : null;
                  const defaultReps = targetReps != null ? String(targetReps) : '';

                  // Find catalog item (with variant override)
                  const swapKey = `${blockIndex}-${exIdx}`;
                  const swap = exerciseSwaps?.[swapKey];
                  const displayName = swap?.name || ex.name;
                  const defaultCatalogItem = catalog?.find((c: any) => c.name.toLowerCase() === displayName.toLowerCase());
                  const catalogItem = variantOverrides[exIdx] || swap?.catalogItem || defaultCatalogItem;
                  const exVariants = getEquipmentVariants(displayName, catalog || [], ex.exercise_id);
                  const swapGroup = catalogItem?.swap_group || defaultCatalogItem?.swap_group;
                  const exIsRepsOnly = catalogItem?.type === 'reps_only' || catalogItem?.standards?.unit?.toLowerCase() === 'reps';

                  return (
                    <div key={exIdx} className={`rounded-xl border transition-all ${isDone ? 'bg-green-500/10 border-green-500/40' : 'bg-zinc-800 border-zinc-700'}`}>
                    <div className={`flex items-center gap-3 p-3`}>

                      {/* Weight + Reps Inputs */}
                      <div className="flex gap-1 shrink-0">
                        {!exIsRepsOnly && (
                        <div className="flex flex-col w-12">
                          <span className="text-[8px] text-zinc-600 text-center mb-0.5">LBS</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="—"
                            value={weights[weightKey] || ''}
                            onChange={(e) => updateWeight(exIdx, setIdx, e.target.value)}
                            className="bg-zinc-900 text-white border border-zinc-600 rounded px-1 py-1 text-center text-xs w-full focus:outline-none focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        )}
                        <div className="flex flex-col w-10">
                          <span className="text-[8px] text-zinc-600 text-center mb-0.5">REPS</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={defaultReps || '?'}
                            value={reps[repsKey] ?? defaultReps}
                            onChange={(e) => setReps(prev => ({ ...prev, [repsKey]: e.target.value }))}
                            className="bg-zinc-900 text-white border border-zinc-600 rounded px-1 py-1 text-center text-xs w-full focus:outline-none focus:border-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Clickable Area */}
                      <button
                        onClick={() => toggleSet(exIdx, setIdx)}
                        className="flex-1 flex items-center justify-between text-left"
                      >
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm leading-tight ${isDone ? 'text-zinc-400 line-through' : 'text-white'}`}>
                            {displayName}
                          </span>
                          <span className="text-[10px] text-purple-400 font-mono mt-0.5">
                            {ex.reps_list?.[setIdx] != null ? `${ex.reps_list[setIdx]} reps` : ex.reps && ex.reps !== '10' ? `${ex.reps} reps` : ''}
                          </span>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-zinc-500 hover:border-white'
                          }`}>
                          {isDone && <CheckCircle size={12} className="text-black" />}
                        </div>
                      </button>

                      {/* Swap button */}
                      {swapGroup && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSwap(exIdx, displayName, swapGroup);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-orange-400 rounded hover:bg-zinc-700/50"
                          title="Swap exercise"
                        >
                          <ArrowLeftRight size={14} />
                        </button>
                      )}

                      {/* 🟢 HISTORY ICON (Small) */}
                      {catalogItem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExerciseForHistory(catalogItem);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-700/50"
                        >
                          <Calendar size={14} />
                        </button>
                      )}

                    </div>
                    {setIdx === 0 && exVariants.length > 0 && (
                      <div className="px-3 pb-2">
                        <EquipmentVariantPicker variants={exVariants} selectedId={catalogItem?.id || ''} onSelect={(item: any) => setVariantOverrides(prev => ({ ...prev, [exIdx]: item }))} />
                      </div>
                    )}
                    {setIdx === 0 && (() => {
                      const equip = catalogItem?.required_equipment || [];
                      const id = catalogItem?.id || '';
                      if (!equip.includes('barbell') && !equip.includes('smith_machine') && !id.startsWith('smith_') && !id.includes('barbell')) return null;
                      return (
                        <div className="px-3 pb-2">
                          <WeightCalculator onUse={(w) => { setWeights(prev => { const next = { ...prev }; for (let s = 0; s < totalSets; s++) next[`${exIdx}-${s}`] = String(w); return next; }); }} />
                        </div>
                      );
                    })()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>

      {/* REST TIMER */}
      <RestTimerBar restTime={restTime} totalRest={block.rest_seconds || 60} onSkip={() => { setRestTime(0); setIsResting(false); }} />

      {/* FOOTER ACTION */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 shrink-0">
        <button
          onClick={() => {
            // Construct detailed payload for Superset
            // exercises is a list of exercise objects
            const exercisesPayload = exercises.map((ex: any, exIdx: number) => {
              const setsData = [];
              for (let i = 0; i < totalSets; i++) {
                if ((completedSets[exIdx] || []).includes(i)) {
                  const repsKey = `${exIdx}-${i}`;
                  const targetReps = ex.reps_list ? ex.reps_list[i] : null;
                  const enteredReps = reps[repsKey] ?? (targetReps != null ? String(targetReps) : '');
                  setsData.push({
                    weight: parseFloat(weights[`${exIdx}-${i}`] || '0'),
                    reps: parseInt(enteredReps, 10) || 10
                  });
                }
              }
              const swapKey = `${blockIndex}-${exIdx}`;
              const swap = exerciseSwaps?.[swapKey];
              const override = variantOverrides[exIdx];
              const displayName = swap?.name || ex.name;
              const catalogMatch = override || swap?.catalogItem || catalog?.find((c: any) => c.name.toLowerCase() === displayName.toLowerCase());
              return { name: catalogMatch?.name || displayName, catalogId: catalogMatch?.id, sets: setsData };
            });
            onComplete(false, exercisesPayload);
          }}
          disabled={!isAllComplete}
          className={`w-full font-bold py-4 rounded-xl uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${isAllComplete
            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 hover:scale-[1.02]'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
        >
          {isAllComplete ? 'Complete Superset →' : `${totalCompleted}/${totalSlots} Sets Done`}
        </button>

        {/* Skip Button */}
        <div className="mt-3 text-center">
          <button onClick={() => onComplete(true)} className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-red-500 transition-colors px-4 py-2">
            Skip Superset (No XP)
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-800 mt-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

    </div>
  );
}
