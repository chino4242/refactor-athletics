'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CatalogItem, HistoryItem } from '@/types';
import ExerciseHistoryModal from '../ExerciseHistoryModal';
import { playCountdownBeep } from '../../utils/audio';
import EquipmentVariantPicker, { getEquipmentVariants } from '../EquipmentVariantPicker';
import WeightCalculator from '../WeightCalculator';
import RestTimerBar from './RestTimerBar';
import { Info, ArrowLeftRight, Calendar, CheckCircle, Play, Square } from 'lucide-react';
import { EXERCISE_CUES } from '@/data/exerciseCues';

function DurationSetTimer({ setIndex, targetSeconds, isDone, onComplete }: { setIndex: number; targetSeconds: number; isDone: boolean; onComplete: (actualSecs: number) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(isDone);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= targetSeconds) {
          setRunning(false);
          setFinished(true);
          import('@/utils/haptics').then(m => m.haptic('heavy'));
          onComplete(next);
        }
        if (next === targetSeconds - 3) playCountdownBeep();
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, targetSeconds]);

  const progress = Math.min((elapsed / targetSeconds) * 100, 100);
  const remaining = Math.max(targetSeconds - elapsed, 0);

  if (finished || isDone) {
    return (
      <div className="w-full p-4 rounded-xl border bg-green-500/10 border-green-500/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle size={16} className="text-black" />
          </div>
          <div>
            <span className="text-green-400 font-bold font-mono">SET {setIndex + 1}</span>
            <span className="text-green-400/70 text-xs ml-2">{elapsed || targetSeconds}s</span>
          </div>
        </div>
      </div>
    );
  }

  if (!running && elapsed === 0) {
    return (
      <button
        onClick={() => setRunning(true)}
        className="w-full p-5 rounded-xl border border-zinc-700 bg-zinc-800 hover:border-zinc-600/50 transition-all flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center group-hover:bg-orange-500/30 transition">
            <Play size={18} className="text-orange-400 ml-0.5" />
          </div>
          <div className="text-left">
            <div className="text-white font-bold font-mono">SET {setIndex + 1}</div>
            <div className="text-zinc-500 text-xs">{targetSeconds}s hold — tap to start</div>
          </div>
        </div>
      </button>
    );
  }

  // Running state
  return (
    <div className="w-full rounded-xl border border-orange-500/50 bg-zinc-800 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-700">
        <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-black font-mono text-white tabular-nums">
            {remaining}
          </div>
          <div className="text-left">
            <div className="text-orange-400 font-bold text-xs uppercase tracking-wider">Set {setIndex + 1}</div>
            <div className="text-zinc-500 text-[10px]">{elapsed}s / {targetSeconds}s</div>
          </div>
        </div>
        <button
          onClick={() => { setRunning(false); setFinished(true); onComplete(elapsed); }}
          className="p-3 rounded-full bg-zinc-700 hover:bg-zinc-600 transition"
          title="Stop early"
        >
          <Square size={16} className="text-zinc-300" />
        </button>
      </div>
    </div>
  );
}

export default function ExerciseView({ block, blockIndex, onComplete, fullHistory, catalog, exerciseSwaps, onSwap, userProfile }: any) {
  // Smart rest time based on exercise type
  const smartRest = (() => {
    if (block.rest_seconds) return block.rest_seconds;
    const section = (block.section || '').toLowerCase();
    if (section.includes('core')) return 30;
    if (section.includes('warmup') || section.includes('cooldown')) return 30;
    const name = (block.name || '').toLowerCase();
    const isCompound = ['squat', 'bench', 'deadlift', 'overhead press', 'ohp', 'barbell row', 'clean', 'snatch'].some(c => name.includes(c));
    if (isCompound) return 90;
    return 60;
  })();
  const [completedSets, setCompletedSets] = useState<number[]>([]);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const totalSets = block.sets || 1;
  const [weights, setWeights] = useState<string[]>(() => {
    // Auto-fill from last session
    if (!fullHistory || !catalog) return Array(totalSets).fill('');
    const exId = block.exercise_id || '';
    const name = (block.name || '').replace(/^\d+\.\s*/, '').toLowerCase().trim();
    const logs = (fullHistory || [])
      .filter((h: any) => {
        const hId = (h.exercise_id || '').toLowerCase();
        return hId === exId.toLowerCase() || hId.includes(name) || name.includes(hId);
      })
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
    if (logs.length > 0) {
      const lastSets = logs[0].details || logs[0].data || [];
      if (lastSets.length > 0 && lastSets[0].weight) {
        return Array(totalSets).fill(String(lastSets[0].weight));
      }
    }
    return Array(totalSets).fill('');
  });
  const isDurationExercise = (typeof block.reps_per_set === 'string' && block.reps_per_set.includes('s')) || !!block.target_duration_seconds;
  const [repsInputs, setRepsInputs] = useState<string[]>(() => {
    if (block.reps_list) return block.reps_list.map((r: number | null) => r != null ? String(r) : '');
    if (isDurationExercise) {
      const secs = block.target_duration_seconds || parseInt(String(block.reps_per_set), 10) || 30;
      return Array(totalSets).fill(String(secs));
    }
    const parsed = parseInt(String(block.reps_per_set), 10);
    return Array(totalSets).fill(parsed > 0 ? String(parsed) : '');
  });

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Find Catalog Item
  const swapKey = `${blockIndex}-0`;
  const swap = exerciseSwaps?.[swapKey];
  const displayName = swap?.name || block.name;
  const defaultCatalogItem = useMemo(() => {
    if (!catalog || catalog.length === 0) return null;
    return catalog.find((c: any) => c.name.toLowerCase() === displayName.toLowerCase());
  }, [catalog, displayName]);

  const [overrideCatalogItem, setOverrideCatalogItem] = useState<CatalogItem | null>(null);
  const catalogItem = overrideCatalogItem || swap?.catalogItem || defaultCatalogItem;
  const swapGroup = catalogItem?.swap_group || defaultCatalogItem?.swap_group;

  const variants = useMemo(() => getEquipmentVariants(displayName, catalog || [], block.exercise_id), [displayName, catalog, block.exercise_id]);
  const isRepsOnly = catalogItem?.type === 'reps_only' || catalogItem?.standards?.unit?.toLowerCase() === 'reps';

  const updateWeight = (index: number, val: string) => {
    const newWeights = [...weights];
    newWeights[index] = val;
    // Carry forward to subsequent empty sets
    if (val) {
      for (let i = index + 1; i < newWeights.length; i++) {
        if (!newWeights[i]) newWeights[i] = val;
      }
    }
    setWeights(newWeights);
  };

  const restStartRef = useRef<number>(0);
  const restDurationRef = useRef<number>(0);
  const lastAnnouncedSecond = useRef<number>(-1);

  useEffect(() => {
    if (!isResting || restTime <= 0) {
      if (restTime === 0 && isResting) setIsResting(false);
      return;
    }
    // Record when rest started (only on fresh start, not re-renders)
    if (restStartRef.current === 0) {
      restStartRef.current = Date.now();
      restDurationRef.current = restTime;
      lastAnnouncedSecond.current = -1;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - restStartRef.current) / 1000);
      const remaining = Math.max(0, restDurationRef.current - elapsed);
      setRestTime(remaining);

      // Only fire audio once per second (tick runs 4x/sec)
      if (remaining !== lastAnnouncedSecond.current) {
        lastAnnouncedSecond.current = remaining;
        if (remaining === 10) {
          try {
            if ('speechSynthesis' in window) {
              speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance('10 seconds');
              u.rate = 1.1; u.volume = 1;
              speechSynthesis.speak(u);
            }
          } catch {}
        }
        if (remaining <= 5 && remaining > 0) playCountdownBeep();
      }
      if (remaining === 0) setIsResting(false);
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isResting]);

  const toggleSet = (setIndex: number) => {
    if (completedSets.includes(setIndex)) {
      setCompletedSets(completedSets.filter(s => s !== setIndex));
      setIsResting(false);
    } else {
      setCompletedSets([...completedSets, setIndex]);
      import('@/utils/haptics').then(m => m.haptic('medium'));
      // Start rest timer if not the last set
      if (completedSets.length < totalSets - 1) {
        setRestTime(block.rest_seconds || smartRest);
        restStartRef.current = 0;
        setIsResting(true);
      }
    }
  };

  const isAllComplete = completedSets.length === totalSets;
  const progress = (completedSets.length / totalSets) * 100;

  return (
    <div className="w-full max-w-md mx-auto min-h-[400px] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative bg-zinc-900 border border-zinc-800">

      {/* 🟢 HISTORY MODAL */}
      {showHistoryModal && catalogItem && (
        <ExerciseHistoryModal
          exercise={catalogItem}
          history={fullHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* HEADER */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 z-10">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-orange-500 font-bold uppercase tracking-widest text-xs">
            {(block.section || '').toLowerCase().includes('core') ? 'Core Block' : 'Strength Block'}
          </h2>
          <div className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-orange-500/20">
            <span>+{block.xp_value} XP</span>
          </div>
        </div>

        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <h1 className="text-white text-2xl font-black italic leading-tight flex-1">
              {displayName}
            </h1>
            {swapGroup && (
              <button
                onClick={() => onSwap(0, displayName, swapGroup)}
                className="p-2 text-zinc-500 hover:text-orange-400 rounded-lg hover:bg-zinc-800/50"
                title="Swap exercise"
              >
                <ArrowLeftRight size={16} />
              </button>
            )}
          </div>

          {/* 🟢 HISTORY BUTTON */}
          {catalogItem && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-2.5 rounded-lg border border-zinc-700 transition"
              title="View History"
            >
              <Calendar size={22} />
            </button>
          )}
        </div>

        {variants.length > 0 && (
          <div className="mt-2">
            <EquipmentVariantPicker variants={variants} selectedId={catalogItem?.id || ''} onSelect={setOverrideCatalogItem} />
          </div>
        )}

        <p className="text-zinc-400 text-sm mt-1 font-mono">
          {isRepsOnly
            ? <>{block.sets} Sets × Max Reps • {smartRest}s Rest</>
            : isDurationExercise
            ? <>{block.sets} Sets × {block.target_duration_seconds || parseInt(String(block.reps_per_set), 10)}s Hold • {smartRest}s Rest</>
            : <>{block.sets} Sets × {block.reps_per_set} Reps • {smartRest}s Rest</>
          }
        </p>

        {/* Form cue */}
        {(() => {
          const exId = catalogItem?.id || block.exercise_id || '';
          const cueData = EXERCISE_CUES[exId];
          if (!cueData) return null;
          return (
            <div className="mt-2 flex items-start gap-2 bg-zinc-800/50 rounded-lg px-3 py-2">
              <Info size={12} className="text-zinc-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-400 leading-relaxed">{cueData.cue}</p>
                {cueData.video_url ? (
                  <a href={cueData.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-400 font-bold mt-1 inline-block">📹 Watch form video</a>
                ) : (
                  <a href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(catalogItem?.name || displayName)}+form`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-600 hover:text-orange-400 mt-1 inline-block">🔍 Search form video</a>
                )}
              </div>
            </div>
          );
        })()}

        {/* Plate Calculator — barbell/smith only */}
        {(() => {
          const equip = catalogItem?.required_equipment || [];
          const id = catalogItem?.id || '';
          if (!equip.includes('barbell') && !equip.includes('smith_machine') && !id.startsWith('smith_') && !id.includes('barbell')) return null;
          return (
            <div className="mt-2">
              <WeightCalculator onUse={(w) => { setWeights(prev => prev.map(() => String(w))); }} />
            </div>
          );
        })()}

        {/* Last time hint */}
        {(() => {
          const exId = catalogItem?.id || block.exercise_id;
          if (!exId || !fullHistory) return null;
          const logs = fullHistory
            .filter((h: any) => h.exercise_id === exId && (h.details?.length > 0 || h.data?.length > 0))
            .sort((a: any, b: any) => b.timestamp - a.timestamp);
          if (logs.length === 0) return null;
          const last = logs[0];
          const sets = last.details || last.data || [];
          const summary = sets.map((s: any) => {
            if (s.duration) return `${s.duration}s`;
            if (s.weight) return `${s.weight}×${s.reps}`;
            if (s.reps) return `${s.reps} reps`;
            return null;
          }).filter(Boolean).join(', ');

          // Progressive overload target
          let targetHint = null;
          if (catalogItem?.standards?.brackets && last.level !== undefined) {
            const sexKey = (userProfile?.sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
            const brackets = catalogItem.standards.brackets[sexKey] || [];
            const userAge = userProfile?.age || 25;
            const ageBracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max) || brackets[0];
            const levels = ageBracket?.levels || [];
            const nextLevel = (last.level || 0) + 1;
            if (nextLevel < levels.length) {
              const nextThreshold = levels[nextLevel];
              const normFactor = catalogItem.normalization_factor || 1.0;
              const isXBW = catalogItem.standards.unit === 'xBW';
              const bw = userProfile?.bodyweight || 180;

              // Compute target Epley value needed
              const rawNeeded = isXBW ? nextThreshold * bw : nextThreshold;
              const targetEpley = rawNeeded / normFactor;

              // Generate concrete weight×reps combos
              const repOptions = [3, 5, 8, 10];
              const targets: string[] = [];
              for (const r of repOptions) {
                const w = Math.ceil(targetEpley / (1 + r / 30) / 5) * 5;
                if (w > 0 && w < 1000) targets.push(`${w}×${r}`);
              }

              if (targets.length > 0) {
                targetHint = { targets: [...new Set(targets)].slice(0, 3) };
              }
            }
          }

          return (
            <>
              {summary && (
              <div className="mt-2 px-2 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                <span className="text-[10px] text-zinc-500">Last: </span>
                <span className="text-[10px] text-zinc-300 font-mono">{summary}</span>
              </div>
              )}
              {targetHint && !isDurationExercise && (
                <div className="mt-1 px-2 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <span className="text-[10px] text-orange-400 font-bold">🎯 Hit {targetHint.targets.join(' or ')} to rank up</span>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Tips / Instructions */}
        {block.tips && block.tips.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-900/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
              <Info size={14} />
              <span>Coaches Tips</span>
            </div>
            <ul className="space-y-2">
              {block.tips.map((tip: any, i: number) => (
                <li key={i} className="text-blue-100/80 text-sm leading-relaxed flex gap-2">
                  <span className="text-blue-500">•</span>
                  {typeof tip === 'string' ? tip : tip.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SETS LIST */}
        <div className="space-y-3">
          {Array.from({ length: totalSets }).map((_, i) => {
            const isDone = completedSets.includes(i);
            const setReps = (block.reps_list && block.reps_list[i])
              ? block.reps_list[i]
              : ((typeof block.reps_per_set === 'number' || (typeof block.reps_per_set === 'string' && !block.reps_per_set.includes('/'))) ? block.reps_per_set : null);

            // Duration exercise: show timer UI
            if (isDurationExercise) {
              const targetSecs = parseInt(repsInputs[i] || '60', 10) || 60;
              return (
                <DurationSetTimer
                  key={i}
                  setIndex={i}
                  targetSeconds={targetSecs}
                  isDone={isDone}
                  onComplete={(actualSecs) => {
                    const next = [...repsInputs];
                    next[i] = String(actualSecs);
                    setRepsInputs(next);
                    toggleSet(i);
                  }}
                />
              );
            }

            return (
              <div
                key={i}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group ${isDone
                  ? 'bg-green-500/10 border-green-500/50 text-green-500'
                  : 'bg-zinc-800 border-zinc-700'
                  }`}
              >
                {/* Weight + Reps Inputs */}
                <div className="flex flex-col mr-3 gap-1.5">
                  {!isRepsOnly && !isDurationExercise && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Weight</span>
                    <div className="flex gap-1 items-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={weights[i] ? 'lbs' : ((() => {
                          const exId = catalogItem?.id || block.exercise_id || '';
                          const log = fullHistory?.find((h: any) => h.exercise_id === exId);
                          const lastW = (log?.details || log?.data || [])[0]?.weight;
                          return lastW ? `${lastW}` : 'lbs';
                        })())}
                        value={weights[i]}
                        onChange={(e) => updateWeight(i, e.target.value)}
                        className="bg-zinc-900 text-white border border-zinc-600 rounded p-1.5 w-16 text-center font-mono text-sm focus:border-zinc-500 focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateWeight(i, String(parseFloat(weights[i] || '0') + 5));
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold px-1.5 py-0.5 rounded transition-all"
                        >
                          +5
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateWeight(i, String(Math.max(0, parseFloat(weights[i] || '0') - 5)));
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold px-1.5 py-0.5 rounded transition-all"
                        >
                          -5
                        </button>
                      </div>
                    </div>
                  </div>
                  )}
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">{isDurationExercise ? 'Sec' : 'Reps'}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={repsInputs[i] || '?'}
                      value={repsInputs[i]}
                      onChange={(e) => {
                        const next = [...repsInputs];
                        next[i] = e.target.value;
                        setRepsInputs(next);
                      }}
                      className="bg-zinc-900 text-white border border-zinc-600 rounded p-1.5 w-16 text-center font-mono text-sm focus:border-zinc-500 focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <button
                  onClick={() => toggleSet(i)}
                  className="flex-1 flex items-center justify-between text-left"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className={`font-bold font-mono ${isDone ? 'line-through opacity-70' : 'text-zinc-300 group-hover:text-white'}`}>
                      SET {i + 1}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => toggleSet(i)}
                  className="ml-3 flex-shrink-0"
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-zinc-500 group-hover:border-zinc-400'
                    }`}>
                    {isDone && <CheckCircle size={16} className="text-black" />}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Live rank estimate */}
        {!isRepsOnly && catalogItem?.standards?.brackets && completedSets.length > 0 && (() => {
          const age = userProfile?.age || 25;
          const sex = (userProfile?.sex || 'male').toLowerCase();
          const bw = userProfile?.bodyweight || 180;
          const sexKey = sex === 'female' ? 'female' : 'male';
          const brackets = catalogItem.standards.brackets[sexKey];
          if (!brackets?.length) return null;
          const bracket = brackets.find((b: any) => age >= b.min && age <= b.max) || brackets[0];
          if (!bracket?.levels) return null;
          const normFactor = catalogItem.normalization_factor || 1;
          const unit = catalogItem.standards.unit || 'lbs';
          const isXBW = unit === 'xBW';
          const scoring = catalogItem.standards.scoring || 'higher_is_better';
          const isLowerBetter = scoring === 'lower_is_better';
          const isWeightedPullup = catalogItem.id === 'weighted_pullup' || catalogItem.id === 'five_rm_weighted_pull_up';

          // Compute best value from completed sets
          const completedData = completedSets.map((i: number) => ({
            weight: parseFloat(weights[i] || '0'),
            reps: parseInt(repsInputs[i], 10) || 10,
            duration: parseFloat(weights[i] || '0'), // for timed exercises, weight field holds seconds
          })).filter((s: any) => s.weight > 0 || s.duration > 0);
          if (completedData.length === 0) return null;

          let normalized: number;
          let estimatedStrength: number; // The raw estimated 1RM in lbs
          if (isLowerBetter) {
            // Timed exercises: use best (lowest) duration
            normalized = Math.min(...completedData.map((s: any) => s.duration));
            estimatedStrength = normalized;
          } else {
            const bestEpley = Math.max(...completedData.map((s: any) => s.weight * (1 + Math.min(s.reps, 100) / 30)));
            estimatedStrength = Math.round(bestEpley * normFactor);
            normalized = bestEpley * normFactor;
            if (isWeightedPullup) { normalized += bw; estimatedStrength += bw; }
            if (isXBW && bw > 0) normalized = normalized / bw;
          }

          // Find current level from this session
          let currentLevel = 0;
          for (let i = 0; i < bracket.levels.length; i++) {
            const passes = isLowerBetter ? normalized <= bracket.levels[i] : normalized >= bracket.levels[i];
            if (passes) currentLevel = i + 1;
          }

          if (currentLevel >= 5) return (
            <div className="mx-4 mb-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <span className="text-[11px] font-bold text-emerald-400">⚡ Max rank on this exercise!</span>
              {!isLowerBetter && <div className="text-[10px] text-zinc-500 mt-0.5">Estimated Strength: {estimatedStrength} lbs</div>}
            </div>
          );

          const nextThreshold = bracket.levels[currentLevel];

          // Compute concrete targets: weight×reps combos that would hit nextThreshold
          let targets: string[] = [];
          if (!isLowerBetter) {
            const rawNeeded = isXBW ? nextThreshold * bw : nextThreshold;
            const targetEpley = rawNeeded / normFactor;
            // Generate a few weight×reps options
            const repOptions = [3, 5, 8, 10];
            for (const r of repOptions) {
              const w = Math.ceil(targetEpley / (1 + r / 30) / 5) * 5;
              if (w > 0 && w < 1000) targets.push(`${w}×${r}`);
            }
            // Deduplicate and limit to 3
            targets = [...new Set(targets)].slice(0, 3);
          }

          let gap: number;
          let gapLabel: string;
          if (isLowerBetter) {
            gap = Math.round(normalized - nextThreshold); // how many seconds you need to shave
            gapLabel = `${gap}s to next rank`;
          } else {
            const rawNeeded = isXBW ? nextThreshold * bw : nextThreshold;
            const weightNeeded = Math.ceil(rawNeeded / normFactor);
            const currentBest = Math.round(normalized * (isXBW ? bw : 1) / normFactor);
            gap = weightNeeded - currentBest;
            gapLabel = `${gap} lbs to next rank`;
          }

          if (gap <= 0) return (
            <div className="mx-4 mb-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center">
              <span className="text-[11px] font-bold text-orange-400">⚡ You&apos;re in range for the next rank!</span>
              {!isLowerBetter && <div className="text-[10px] text-zinc-500 mt-0.5">Estimated Strength: {estimatedStrength} lbs</div>}
            </div>
          );

          return (
            <div className={`mx-4 mb-2 px-3 py-2 rounded-xl text-center ${gap <= 15 ? 'bg-orange-500/10 border border-orange-500/20 animate-pulse' : gap <= 30 ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-zinc-800/50 border border-zinc-700/30'}`}>
              {!isLowerBetter && (
                <div className="text-[10px] text-zinc-500 mb-0.5">Estimated Strength: <span className="font-bold text-zinc-300">{estimatedStrength} lbs</span></div>
              )}
              <span className={`text-[11px] font-bold ${gap <= 15 ? 'text-orange-400' : gap <= 30 ? 'text-orange-400' : 'text-zinc-400'}`}>
                {gap <= 15 ? '🔥' : '🎯'} {gapLabel}
              </span>
              {targets.length > 0 && (
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Hit {targets.join(' or ')} to rank up
                </div>
              )}
            </div>
          );
        })()}
      </div>
      <RestTimerBar restTime={restTime} totalRest={smartRest} onSkip={() => { setRestTime(0); setIsResting(false); }} />

      {/* FOOTER ACTION */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 shrink-0">
        <button
          onClick={() => {
            const exercisesPayload = [{
              name: catalogItem?.name || displayName,
              catalogId: catalogItem?.id,
              sets: completedSets.map(i => ({
                weight: isDurationExercise ? 0 : parseFloat(weights[i] || '0'),
                ...(isDurationExercise
                  ? { duration: parseInt(repsInputs[i], 10) || 0 }
                  : { reps: parseInt(repsInputs[i], 10) || 10 })
              }))
            }];
            onComplete(false, exercisesPayload);
          }}
          disabled={!isAllComplete}
          className={`w-full font-bold py-4 rounded-xl uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${isAllComplete
            ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 hover:scale-[1.02]'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
        >
          {isAllComplete ? 'Complete Block →' : `${completedSets.length}/${totalSets} Sets Done`}
        </button>

        {/* Skip Button */}
        <div className="mt-3 text-center">
          <button
            onClick={() => onComplete(true)}
            className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-red-500 transition-colors px-4 py-2"
          >
            Skip Exercise (No XP)
          </button>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-800 mt-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
