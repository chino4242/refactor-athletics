"use client";

import { useState, useEffect, useMemo } from 'react';
import { getActiveWorkout, getWorkoutHistory, getWeeklySchedule, getHistory, getTrainingCatalog } from '../services/api';
import type { HistoryItem, CatalogItem } from '@/types';
import ExerciseHistoryModal from './ExerciseHistoryModal'; // 🟢 NEW
import { playCountdownBeep } from '../utils/audio';
import { Play, Pause, SkipForward, RotateCcw, Calendar, CheckCircle, Info, Timer, ChevronRight, ArrowLeftRight } from 'lucide-react';
import ChecklistView from './ChecklistView';

// Shared rest timer bar — fixed at top of viewport
function RestTimerBar({ restTime, totalRest, onSkip }: { restTime: number; totalRest: number; onSkip: () => void }) {
  const progress = totalRest > 0 ? ((totalRest - restTime) / totalRest) * 100 : 0;

  useEffect(() => {
    if (restTime === 0) {
      try { navigator.vibrate?.(200); } catch {}
    }
  }, [restTime]);

  if (restTime <= 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top-2">
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between shadow-lg shadow-blue-900/40">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-white animate-pulse" />
          <span className="text-xs font-bold text-white/80 uppercase">Rest</span>
        </div>
        <span className="text-xl font-mono font-black text-white">{Math.floor(restTime / 60)}:{(restTime % 60).toString().padStart(2, '0')}</span>
        <button onClick={onSkip} className="text-[10px] font-bold text-white/70 hover:text-white px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 transition">SKIP</button>
      </div>
      <div className="h-1 bg-blue-900">
        <div className="h-full bg-blue-300 transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
import { logWorkoutBlockAction, logTrainingAction } from '@/app/actions';
import { getProfile } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// --- SAFELIST CONSTANT REMOVED ---

import EquipmentVariantPicker, { getEquipmentVariants } from './EquipmentVariantPicker';
import WeightCalculator from './WeightCalculator';

// --- SUB-COMPONENT: EXERCISE VIEW ---
function ExerciseView({ block, blockIndex, onComplete, fullHistory, catalog, exerciseSwaps, onSwap }: any) {
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
  const [repsInputs, setRepsInputs] = useState<string[]>(() => {
    if (block.reps_list) return block.reps_list.map((r: number | null) => r != null ? String(r) : '');
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
    }
    return () => clearInterval(interval);
  }, [isResting, restTime]);

  const toggleSet = (setIndex: number) => {
    if (completedSets.includes(setIndex)) {
      setCompletedSets(completedSets.filter(s => s !== setIndex));
      setIsResting(false);
    } else {
      setCompletedSets([...completedSets, setIndex]);
      // Start rest timer if not the last set
      if (completedSets.length < totalSets - 1) {
        setRestTime(block.rest_seconds || 90);
        setIsResting(true);
      }
    }
  };

  const isAllComplete = completedSets.length === totalSets;
  const progress = (completedSets.length / totalSets) * 100;

  return (
    <div className="w-full max-w-md mx-auto h-[calc(100dvh-80px)] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative bg-zinc-900 border border-zinc-800">

      {/* 🟢 HISTORY MODAL */}
      {showHistoryModal && catalogItem && (
        <ExerciseHistoryModal
          exercise={catalogItem}
          history={fullHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* HEADER */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-6 z-10">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-orange-500 font-bold uppercase tracking-widest text-xs">
            Strength Block
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
            ? <>{block.sets} Sets × Max Reps • {block.rest_seconds || 90}s Rest</>
            : <>{block.sets} Sets × {block.reps_per_set} Reps • {block.rest_seconds || 90}s Rest</>
          }
        </p>

        {/* Plate Calculator — barbell/smith only */}
        {(() => {
          const equip = catalogItem?.required_equipment || [];
          const id = catalogItem?.id || '';
          if (!equip.includes('barbell') && !equip.includes('smith_machine') && !id.startsWith('smith_')) return null;
          return (
            <div className="mt-2">
              <WeightCalculator onUse={(w) => { for (let i = 0; i < (block.sets || 4); i++) updateWeight(i, String(w)); }} />
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
          const summary = sets.map((s: any) => s.weight ? `${s.weight}×${s.reps}` : `${s.reps} reps`).join(', ');

          // Progressive overload target
          let targetHint = null;
          if (catalogItem?.standards?.brackets && last.level !== undefined) {
            const sexKey = 'male'; // TODO: get from profile
            const brackets = catalogItem.standards.brackets[sexKey] || [];
            const ageBracket = brackets[0];
            const levels = ageBracket?.levels || [];
            const nextLevel = (last.level || 0) + 1;
            if (nextLevel < levels.length) {
              const nextThreshold = levels[nextLevel];
              const normFactor = catalogItem.normalization_factor || 1.0;
              const isXBW = catalogItem.standards.unit === 'xBW';
              const is5RM = (catalogItem.name || '').toLowerCase().includes('5rm');
              const bestWeight = Math.max(...sets.map((s: any) => s.weight || 0));
              const typicalReps = sets[0]?.reps || 10;

              // Reverse the comparison: threshold → actual weight needed
              // For xBW: threshold is in xBW units, multiply by bodyweight
              // Then reverse normalization and Epley
              let rawThreshold = isXBW ? nextThreshold * 180 : nextThreshold; // approximate bodyweight
              let targetWeight: number;
              if (is5RM) {
                targetWeight = rawThreshold / normFactor;
              } else {
                // Reverse Epley: weight = threshold / (1 + reps/30) / normFactor
                targetWeight = rawThreshold / (1 + typicalReps / 30) / normFactor;
              }
              targetWeight = Math.round(targetWeight / 5) * 5; // Round to nearest 5 lbs
              const diff = targetWeight - bestWeight;
              if (diff > 0 && diff < 100) {
                targetHint = { weight: targetWeight, diff, level: nextLevel };
              }
            }
          }

          return (
            <>
              <div className="mt-2 px-2 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                <span className="text-[10px] text-zinc-500">Last: </span>
                <span className="text-[10px] text-zinc-300 font-mono">{summary}</span>
              </div>
              {targetHint && (
                <div className="mt-1 px-2 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <span className="text-[10px] text-orange-400 font-bold">🎯 Hit {targetHint.weight} lbs (+{targetHint.diff}) to reach next rank</span>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

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
                  {!isRepsOnly && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Weight</span>
                    <div className="flex gap-1 items-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="lbs"
                        value={weights[i]}
                        onChange={(e) => updateWeight(i, e.target.value)}
                        className="bg-zinc-900 text-white border border-zinc-600 rounded p-1.5 w-16 text-center font-mono text-sm focus:border-orange-500 focus:outline-none"
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
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Reps</span>
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
                      className="bg-zinc-900 text-white border border-zinc-600 rounded p-1.5 w-16 text-center font-mono text-sm focus:border-orange-500 focus:outline-none"
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
      </div>

      {/* REST TIMER */}
      <RestTimerBar restTime={restTime} totalRest={block.rest_seconds || 90} onSkip={() => setIsResting(false)} />

      {/* FOOTER ACTION */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 shrink-0">
        <button
          onClick={() => {
            const exercisesPayload = [{
              name: catalogItem?.name || displayName,
              catalogId: catalogItem?.id,
              sets: completedSets.map(i => ({
                weight: parseFloat(weights[i] || '0'),
                reps: parseInt(repsInputs[i], 10) || 10
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

// --- SUB-COMPONENT: TIMER VIEW ---
function TimerView({ block, blockIndex, totalBlocks, onBlockComplete, onIntervalComplete }: any) {
  const [intervalIndex, setIntervalIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [outdoor, setOutdoor] = useState(false);
  const [showDistancePrompt, setShowDistancePrompt] = useState(false);
  const [distanceInput, setDistanceInput] = useState('');
  const [finalXp, setFinalXp] = useState(0);

  // Persist timer state for background resume
  const timerKey = `active_timer_${blockIndex}`;
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const intervalStartedAt = Date.now() - ((block.intervals[intervalIndex]?.seconds || 0) - timeLeft) * 1000;
      localStorage.setItem(timerKey, JSON.stringify({ intervalIndex, intervalStartedAt, earnedXp, blockIndex }));
    }
  }, [intervalIndex, isActive, timerKey]);

  // Restore timer state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(timerKey);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (state.blockIndex !== blockIndex) { localStorage.removeItem(timerKey); return; }
      const elapsed = Math.floor((Date.now() - state.intervalStartedAt) / 1000);
      let idx = state.intervalIndex;
      let remaining = (block.intervals[idx]?.seconds || 0) - elapsed;
      let xp = state.earnedXp || 0;
      // Auto-advance through completed intervals
      while (remaining <= 0 && idx < block.intervals.length - 1) {
        idx++;
        remaining += block.intervals[idx]?.seconds || 0;
      }
      if (idx < block.intervals.length && remaining > 0) {
        setIntervalIndex(idx);
        setTimeLeft(remaining);
        setEarnedXp(xp);
        setIsActive(true);
        setGetReady(0);
      } else {
        localStorage.removeItem(timerKey);
      }
    } catch { localStorage.removeItem(timerKey); }
  }, []);

  // Keep screen awake during tread block
  useEffect(() => {
    let wakeLock: any = null;
    const acquire = async () => {
      try { if ('wakeLock' in navigator) wakeLock = await (navigator as any).wakeLock.request('screen'); } catch {}
    };
    acquire();
    const onVisChange = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { wakeLock?.release(); document.removeEventListener('visibilitychange', onVisChange); };
  }, []);

  const speak = (text: string) => {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.1;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch {}
  };

  const currentInterval = block.intervals[intervalIndex];
  const nextInterval = block.intervals[intervalIndex + 1];
  const [getReady, setGetReady] = useState(5);

  // "GET READY" countdown before first interval
  useEffect(() => {
    if (getReady <= 0) return;
    if (getReady <= 3) playCountdownBeep();
    const t = setTimeout(() => setGetReady(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [getReady]);

  useEffect(() => {
    if (getReady > 0) return;
    if (currentInterval) {
      setTimeLeft(currentInterval.seconds);
      setIsActive(true);
      const zone = outdoor && currentInterval.outdoor_alternative ? currentInterval.outdoor_alternative : (currentInterval.zone || currentInterval.text || '');
      if (zone) speak(zone);
    }
  }, [intervalIndex, currentInterval, getReady]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      if (timeLeft <= 5) playCountdownBeep();
      if (timeLeft === 5 && nextInterval) {
        const next = nextInterval.zone || nextInterval.text || '';
        if (next) speak(`${next} in 5 seconds`);
      }
      interval = setInterval(() => { setTimeLeft((p) => p - 1); }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleNext();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleNext = () => {
    // 🟢 NEW: Log the completed interval immediately
    let earned = 0;
    if (currentInterval && onIntervalComplete) {
      // Calculate dynamic XP based on Intensity * Duration
      let rate = 5; // Default (Base/Recovery) - 5 XP/min
      const z = (currentInterval.zone || currentInterval.text || "").toLowerCase();

      if (z.includes("push") || z.includes("tempo") || z.includes("threshold")) rate = 12;
      else if (z.includes("all out") || z.includes("sprint") || z.includes("max")) rate = 20;
      else if (z.includes("long run") || z.includes("moderate")) rate = 8;

      // Minimum 1 XP if it's very short
      const durationMin = currentInterval.seconds / 60;
      earned = Math.ceil(Math.max(1, durationMin * rate));

      setEarnedXp(prev => prev + earned);
      onIntervalComplete(currentInterval, earned);
    }

    if (intervalIndex < block.intervals.length - 1) {
      setIntervalIndex((prev) => prev + 1);
    } else {
      setIsActive(false);
      localStorage.removeItem(timerKey);
      setFinalXp(earnedXp + earned);
      setShowDistancePrompt(true);
    }
  };

  const handleDistanceSubmit = () => {
    const distance = parseFloat(distanceInput) || 0;
    onBlockComplete(false, [], finalXp, distance);
    setShowDistancePrompt(false);
  };


  if (!currentInterval) return <div className="text-white p-8">Loading Interval...</div>;

  if (showDistancePrompt) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-5xl">🏁</div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight">Block Complete!</h2>
        <p className="text-sm text-zinc-400 text-center">How far did you go? (optional)</p>
        <div className="w-full max-w-[200px]">
          <span className="text-[9px] text-zinc-500 uppercase block text-center mb-1">Miles</span>
          <input
            type="text"
            inputMode="decimal"
            value={distanceInput}
            onChange={e => setDistanceInput(e.target.value)}
            placeholder="0.0"
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-center text-lg text-white font-mono focus:border-orange-500 outline-none"
          />
        </div>
        <div className="flex gap-3 w-full max-w-[280px]">
          <button onClick={handleDistanceSubmit} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition">
            {distanceInput ? 'Save & Continue' : 'Skip'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto h-[calc(100dvh-80px)] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative transition-colors duration-700 ${currentInterval.color}`}>

      {/* HEADER */}
      <div className="bg-black/20 p-6 backdrop-blur-sm shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-white/80 font-bold uppercase tracking-widest text-xs">
            {block.name}
          </h2>
          <div className="flex items-center gap-3">
            {earnedXp > 0 && <span className="text-xs font-bold text-yellow-400/90">XP Earned: {earnedXp}</span>}
            <button onClick={() => setOutdoor(o => !o)} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition ${outdoor ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-800/50 text-white/50 border border-white/10'}`}>
              {outdoor ? '🌳 Outdoor' : '🏃 Indoor'}
            </button>
          </div>
        </div>
        <div className="flex justify-between items-end mt-1">
          <h1 className="text-white text-3xl font-black italic">
            {outdoor && currentInterval.outdoor_alternative ? currentInterval.outdoor_alternative : currentInterval.zone}
          </h1>
          <span className="text-white/60 font-mono text-sm">
            {intervalIndex + 1} / {block.intervals.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {block.intervals.map((_: any, i: number) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < intervalIndex ? 'bg-white' : i === intervalIndex ? 'bg-white/80 animate-pulse' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>

      {/* CONTENT: GET READY / TIMER / CARD */}
      {getReady > 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <h3 className="text-white/60 font-bold uppercase tracking-widest text-sm mb-4">Get Ready</h3>
          <div className="text-[120px] font-black text-white leading-none font-mono animate-pulse">{getReady}</div>
        </div>
      ) : (
      <div key={intervalIndex} className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {currentInterval.type === 'card' ? (
          <div className="animate-in fade-in zoom-in duration-300">
            <h3 className="text-white/60 font-bold uppercase tracking-widest text-sm mb-4">
              Instruction
            </h3>
            <div className="text-3xl md:text-4xl font-black text-white leading-tight">
              {currentInterval.text || currentInterval.raw_text}
            </div>
          </div>
        ) : (
          <>
            {!outdoor && (() => {
              const txt = (currentInterval.note || '') + ' ' + (currentInterval.raw_text || '');
              const m = txt.match(/(\d+(?:\.\d+)?)\s*%/);
              return m ? (
                <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-1">
                  <span className="text-2xl font-black text-white">{m[1]}%</span>
                  <span className="text-[10px] text-white/60 uppercase font-bold">incline</span>
                </div>
              ) : null;
            })()}
            <div className={`text-[120px] font-black leading-none tracking-tighter drop-shadow-lg font-mono transition-colors duration-300 ${timeLeft <= 5 && timeLeft > 0 && isActive ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {isNaN(timeLeft) ? "--:--" :
                `${Math.floor(timeLeft / 60)}:${timeLeft % 60 < 10 ? '0' : ''}${timeLeft % 60}`
              }
            </div>
            <p className="text-white/90 text-lg font-medium mt-4 max-w-[90%] animate-pulse-slow">
              {outdoor && currentInterval.outdoor_alternative ? currentInterval.outdoor_alternative : (currentInterval.note || currentInterval.raw_text)}
            </p>
            {(() => {
              const remaining = timeLeft + block.intervals.slice(intervalIndex + 1).reduce((s: number, i: any) => s + (i.seconds || 0), 0);
              const mins = Math.floor(remaining / 60);
              const secs = remaining % 60;
              return <p className="text-white/50 text-sm font-mono mt-2">{mins}:{secs < 10 ? '0' : ''}{secs} remaining</p>;
            })()}
          </>
        )}
      </div>
      )}

      {/* FOOTER */}
      <div className="bg-black/30 p-4 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-1 rounded uppercase">Up Next</span>
          {nextInterval ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-bold text-white truncate">{nextInterval.zone || nextInterval.text || 'Next'}</span>
              {nextInterval.seconds && <span className="text-sm text-white/50 font-mono shrink-0">{Math.floor(nextInterval.seconds / 60)}:{nextInterval.seconds % 60 < 10 ? '0' : ''}{nextInterval.seconds % 60}</span>}
            </div>
          ) : (
            <span className="text-base font-bold text-white">Block Complete 🎉</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-2">
          {/* If Card, only show Next button (centered/expanded) */}
          {currentInterval.type === 'card' ? (
            <button onClick={handleNext} className="col-span-3 flex items-center justify-center bg-white text-black p-4 rounded-xl shadow-lg hover:scale-105 transition active:scale-95 font-bold uppercase tracking-widest">
              CONTINUE
            </button>
          ) : (
            <>
              <button aria-label="Restart Interval" onClick={() => { setTimeLeft(currentInterval.seconds || 0); setIsActive(true); }} className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl transition"><RotateCcw size={24} /></button>
              <button aria-label={isActive ? "Pause Timer" : "Resume Timer"} onClick={() => setIsActive(!isActive)} className="flex items-center justify-center bg-white text-black p-4 rounded-xl shadow-lg hover:scale-105 transition active:scale-95">{isActive ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" />}</button>
              <button aria-label="Next Interval" onClick={handleNext} className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl transition"><SkipForward size={24} /></button>
            </>
          )}
        </div>

        {/* Skip Block Button */}
        <div className="mt-4 text-center">
          <button onClick={() => onBlockComplete(true)} className="text-white/40 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors py-2">
            Skip Entire Block
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: SUPERSET VIEW ---
function SupersetView({ block, blockIndex, onComplete, fullHistory, catalog, exerciseSwaps, onSwap }: any) {
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
        setRestTime(90); // Default 90s for supersets
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
          {exercises.map((ex: any, i: number) => (
            <span key={i} className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full px-2 py-0.5">
              {ex.name}: <span className="font-bold">{ex.reps || '?'} reps</span>
            </span>
          ))}
        </div>
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
                        <EquipmentVariantPicker variants={exVariants} selectedId={catalogItem?.id || ''} onSelect={(item) => setVariantOverrides(prev => ({ ...prev, [exIdx]: item }))} />
                      </div>
                    )}
                    {setIdx === 0 && (() => {
                      const equip = catalogItem?.required_equipment || [];
                      const id = catalogItem?.id || '';
                      if (!equip.includes('barbell') && !equip.includes('smith_machine') && !id.startsWith('smith_')) return null;
                      return (
                        <div className="px-3 pb-2">
                          <WeightCalculator onUse={(w) => { for (let s = 0; s < totalSets; s++) updateWeight(exIdx, s, String(w)); }} />
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
      <RestTimerBar restTime={restTime} totalRest={block.rest_seconds || 60} onSkip={() => setIsResting(false)} />

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

// --- MAIN PARENT COMPONENT ---
// --- MAIN PARENT COMPONENT ---
interface ActiveWorkoutProps {
  userId: string;
  onLogComplete: () => void;
  initialDate?: string | null; // 🟢 NEW: Allow starting with a specific date
}

import ProtocolBriefing from './ProtocolBriefing';
import WorkoutReport from './WorkoutReport';
import EngineSelector from './EngineSelector';

export default function ActiveWorkout({ userId, onLogComplete, initialDate }: ActiveWorkoutProps) {
  const [blockIndex, setBlockIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [workoutData, setWorkoutData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId] = useState(() => uuidv4());

  // Theme-aware rank names
  const { currentTheme } = useTheme();
  const { isClassic } = useExperienceMode();
  const theme = THEMES[currentTheme] || THEMES.athlete;
  const getThemedRankName = (level: number): string => {
    if (isClassic) {
      const classicNames = ['Unranked', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'];
      return classicNames[level] || `Level ${level}`;
    }
    const rankKey = `level${level}`;
    const themed = theme.ranks?.[rankKey]?.name;
    if (themed) return themed.replace(/^Level \d+:\s*/, '');
    const defaults = ['Peasant', 'Rookie', 'Amateur', 'Contender', 'Pro', 'Champion', 'Legend'];
    return defaults[level] || 'Unknown';
  };

  // 🟢 NEW: Mission HUB State
  const [viewMode, setViewMode] = useState<'HUB' | 'WORKOUT'>('HUB');
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);

  // NEW: History State
  const [showLibrary, setShowLibrary] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);

  // Persist active workout indicator for banner on other pages
  useEffect(() => {
    if (isComplete) {
      localStorage.removeItem('active_workout');
    } else if (workoutData.length > 0) {
      localStorage.setItem('active_workout', JSON.stringify({ path: window.location.pathname, date: selectedDate || new Date().toLocaleDateString('en-CA') }));
    }
  }, [workoutData, isComplete, selectedDate]);
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);

  // Persist workout progress to localStorage
  const progressKey = `workout_progress_${selectedDate || new Date().toLocaleDateString('en-CA')}`;
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  // 🟢 NEW: Full History & Catalog for Drill-Down
  const [fullHistory, setFullHistory] = useState<HistoryItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  // User profile for rank calculations
  const [userProfile, setUserProfile] = useState<{ bodyweight: number; sex: string } | null>(null);

  // Block completion results & continue/stop prompt
  const [blockResults, setBlockResults] = useState<any[] | null>(null);
  const [showBlockComplete, setShowBlockComplete] = useState(false);
  const [engineChoice, setEngineChoice] = useState<Record<number, 'hiit' | 'zone2' | null>>({});

  // Persist and restore workout progress
  useEffect(() => {
    if (completedIndices.length > 0 || skippedIndices.length > 0 || blockIndex > 0) {
      localStorage.setItem(progressKey, JSON.stringify({ completedIndices, skippedIndices, blockIndex, viewMode, engineChoice, workoutData }));
    }
  }, [completedIndices, skippedIndices, blockIndex, viewMode, engineChoice, workoutData, progressKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(progressKey);
      if (saved) {
        const { completedIndices: ci, skippedIndices: si, blockIndex: bi, viewMode: vm, engineChoice: ec, workoutData: wd } = JSON.parse(saved);
        if (ci?.length) setCompletedIndices(prev => [...new Set([...prev, ...ci])]);
        if (si?.length) setSkippedIndices(prev => [...new Set([...prev, ...si])]);
        if (bi > 0) setBlockIndex(bi);
        if (ec) setEngineChoice(ec);
        if (wd?.length) setWorkoutData(wd);
      }
      // Only resume WORKOUT view if there's an active timer running
      const timerKeys = Object.keys(localStorage).filter(k => k.startsWith('active_timer_'));
      if (timerKeys.length > 0) {
        const timerState = JSON.parse(localStorage.getItem(timerKeys[0]) || '{}');
        if (timerState.blockIndex !== undefined) {
          setBlockIndex(timerState.blockIndex);
          setViewMode('WORKOUT');
        }
      }
    } catch {}
  }, [progressKey]);

  // HIIT vs Zone 2 recommendation
  const [didHiitYesterday, setDidHiitYesterday] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toLocaleDateString('en-CA');
    const sb = createClient();
    sb.from('workouts').select('id').eq('user_id', userId).eq('date', yStr)
      .like('exercise_id', 'block_%Tread%').limit(1)
      .then(({ data }) => { if (data?.length) setDidHiitYesterday(true); });
  }, [userId]);

  const engineRecommendation = useMemo((): 'hiit' | 'zone2' => {
    if (didHiitYesterday) return 'zone2';
    const day = new Date().getDay(); // 0=Sun
    // Mon(1)=HIIT, Tue(2)=Z2, Thu(4)=HIIT, Fri(5)=Z2, Sat(6)=Z2
    if (day === 1 || day === 4) return 'hiit';
    return 'zone2';
  }, [didHiitYesterday]);

  // Swap exercise state
  const [swapTarget, setSwapTarget] = useState<{ blockIdx: number; exIdx: number; name: string; swapGroup: string } | null>(null);
  const [exerciseSwaps, setExerciseSwaps] = useState<Record<string, { name: string; catalogItem: CatalogItem }>>({});

  // 🟢 NEW: Briefing State
  const [briefingData, setBriefingData] = useState<any[] | null>(null);
  const [briefingDate, setBriefingDate] = useState<string | null>(null);

  // 🟢 NEW: Computed Sections (ordered: Strength first, then Cardio, then Core)
  const sections = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return [];

    const SECTION_ORDER: Record<string, number> = {
      'Armor': 0, 'Strength Protocol': 0, 'Strength': 0,
      'Engine': 1, 'Cardio': 1,
      'Core Work': 2, 'Abdominal Protocol': 2, 'Core': 2,
      'Cooldown': 3, 'Recovery': 3,
    };

    const uniqueNames = Array.from(new Set(workoutData.map(b => b.section || 'General')));
    const mapped = uniqueNames.map(name => {
      const sectionBlocks = workoutData.map((b, i) => ({ ...b, globalIndex: i })).filter(b => (b.section || 'General') === name);
      const firstIndex = sectionBlocks[0].globalIndex;
      const indices = sectionBlocks.map(b => b.globalIndex);
      const isDone = indices.every(i => completedIndices.includes(i));

      return {
        name,
        firstIndex,
        count: sectionBlocks.length,
        indices,
        isDone,
        preview: sectionBlocks.flatMap(b => {
          if (b.exercises && Array.isArray(b.exercises)) return b.exercises.map((e: any) => e.name || e.text || '');
          if (b.intervals && Array.isArray(b.intervals)) return ['🏃 Treadmill'];
          return [b.name || ''];
        }).filter((n: string, i: number, arr: string[]) => n && arr.indexOf(n) === i).slice(0, 4)
      };
    });

    return mapped.sort((a, b) => (SECTION_ORDER[a.name] ?? 99) - (SECTION_ORDER[b.name] ?? 99));
  }, [workoutData, completedIndices]);

  // FETCH WORKOUT ON MOUNT
  useEffect(() => {
    loadWorkout(initialDate || undefined);
    loadHistory();
    loadSchedule();
  }, [initialDate]);

  // Restore completion state from today's logged workouts
  useEffect(() => {
    if (!workoutData.length || !fullHistory.length) return;

    const today = new Date().toLocaleDateString('en-CA');
    const todayLogs = fullHistory.filter(h => h.date === today && h.exercise_id);
    if (!todayLogs.length) return;

    const loggedIds = new Set(todayLogs.map(h => h.exercise_id?.toLowerCase()));

    const restored: number[] = [];
    workoutData.forEach((block, idx) => {
      if (completedIndices.includes(idx)) return;

      const blockName = (block.name || '').replace(/^\d+\.\s*/, '').toLowerCase().trim();
      const blockExId = (block.exercise_id || '').toLowerCase();

      if (block.type === 'checklist_exercise') {
        if (loggedIds.has(blockExId) || loggedIds.has(blockName) ||
            [...loggedIds].some(id => id.includes(blockName) || blockName.includes(id))) {
          restored.push(idx);
        }
      } else if (block.type === 'superset' && block.exercises) {
        const allLogged = block.exercises.every((ex: any) => {
          const exName = (ex.name || '').toLowerCase();
          return loggedIds.has(exName) || [...loggedIds].some(id => id.includes(exName) || exName.includes(id));
        });
        if (allLogged) restored.push(idx);
      } else if (block.type === 'timer') {
        const hasCardioLog = todayLogs.some(h =>
          (h.exercise_id || '').toLowerCase().includes('tread') ||
          (h.exercise_id || '').toLowerCase().includes('interval')
        );
        if (hasCardioLog) restored.push(idx);
      }
    });

    if (restored.length > 0) {
      setCompletedIndices(prev => [...new Set([...prev, ...restored])]);
    }
  }, [workoutData, fullHistory]);

  const loadSchedule = async () => {
    try {
      const data = await getWeeklySchedule();
      setWeeklySchedule(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadWorkout = async (date?: string) => {
    setIsLoading(true);
    try {
      // Skip API fetch if resuming from saved progress (has workout data already restored)
      const hasSavedProgress = localStorage.getItem(progressKey);
      if (hasSavedProgress) {
        try {
          const saved = JSON.parse(hasSavedProgress);
          if (saved.workoutData?.length) {
            setIsLoading(false);
            return;
          }
        } catch {}
      }

      const data = await getActiveWorkout(date);
      setWorkoutData(data || []);
      setSelectedDate(date || null);

      // Reset State
      setBlockIndex(0);
      setCompletedIndices([]);
      setSkippedIndices([]);

      // Decide View Mode
      const hasActiveTimer = Object.keys(localStorage).some(k => k.startsWith('active_timer_'));
      if (hasSavedProgress || hasActiveTimer) {
        // Will be restored by the progress restore effect
      } else {
        const uniqueSections = new Set((data || []).map((b: any) => b.section || 'General'));
        if (uniqueSections.size > 1) {
          setViewMode('HUB');
        } else {
          setViewMode('WORKOUT');
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const dates = await getWorkoutHistory();
      setWorkoutDates(dates);

      // 🟢 NEW: Fetch Full History & Catalog
      const h = await getHistory(userId);
      setFullHistory(h || []);
      const c = await getTrainingCatalog();
      setCatalog(c || []);
      const p = await getProfile(userId);
      if (p) setUserProfile({ bodyweight: p.bodyweight || 150, sex: p.sex || 'M' });

    } catch (err) {
      console.error(err);
    }
  };

  // 🟢 NEW: Handle Previewing a Workout
  const handlePreviewWorkout = async (date?: string) => {
    setShowLibrary(false); // Close Drawer
    setIsLoading(true);
    try {
      // Fetch the data but don't commit it to main state yet
      const data = await getActiveWorkout(date);
      // For "Today", data might vary but logic holds.
      setBriefingData(data || []);
      setBriefingDate(date || "Today");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBriefing = () => {
    if (briefingData) {
      setWorkoutData(briefingData);
      setSelectedDate(briefingDate === "Today" ? null : briefingDate);

      // Reset Flow
      setBlockIndex(0);
      setIsComplete(false);

      // If the first block is the summary list block, we might want to skip it 
      // since the briefing IS the summary. But user might want to check it off.
      // Let's leave it at 0 for now.

      setBriefingData(null); // Clear briefing to show main view
    }
  };


  if (isLoading) {
    return (
      <div className="text-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-zinc-500 font-medium">Loading Workflow...</p>
      </div>
    );
  }

  // 🟢 NEW: Show Briefing if Active
  if (briefingData) {
    return (
      <ProtocolBriefing
        workout={briefingData}
        date={briefingDate}
        onStart={handleStartBriefing}
        onCancel={() => setBriefingData(null)}
      />
    );
  }

  const currentBlock = workoutData[blockIndex];

  // Match workout exercise name to catalog item (fuzzy)
  const findCatalogMatch = (name: string) => {
    const n = name.toLowerCase().trim();
    // Exact name match first
    let match = catalog.find((c: any) => c.name.toLowerCase() === n);
    if (match) return match;
    // Catalog name contains exercise name (e.g., "Est. 1RM Bench Press" contains "Bench Press")
    match = catalog.find((c: any) => c.name.toLowerCase().includes(n));
    if (match) return match;
    // Exercise name contains catalog name
    match = catalog.find((c: any) => n.includes(c.name.toLowerCase()));
    return match || null;
  };

  // Check if exercise is a PR based on history
  const checkPR = (exerciseId: string, newRawValue: number) => {
    const prevBest = fullHistory
      .filter(h => h.exercise_id === exerciseId)
      .reduce((best, h) => Math.max(best, h.raw_value || 0), 0);
    return newRawValue > prevBest && prevBest > 0;
  };

  const handleBlockComplete = async (skipped: boolean = false, exercisesData: any[] = [], timerXp?: number, distance?: number) => {
    const isExerciseBlock = ['checklist_exercise', 'list', 'superset'].includes(currentBlock.type);

    if (skipped) {
      setSkippedIndices(prev => [...prev, blockIndex]);
    } else if (userId && currentBlock) {
      try {
        if (isExerciseBlock && exercisesData.length > 0 && userProfile) {
          const results: any[] = [];
          for (const ex of exercisesData) {
            if (!ex.sets || ex.sets.length === 0) continue;
            const catalogItem = ex.catalogId
              ? catalog.find((c: any) => c.id === ex.catalogId)
              : findCatalogMatch(ex.name);

            if (catalogItem) {
              try {
                const result = await logTrainingAction(
                  userId, catalogItem.id, userProfile.bodyweight, userProfile.sex, ex.sets, sessionId
                );
                const hasStandards = !!catalogItem.standards?.brackets;
                const isPR = checkPR(catalogItem.id, result.raw_value || 0);
                results.push({
                  name: ex.name, ...result,
                  hasStandards,
                  isPR,
                });
              } catch (e) {
                console.error(`Failed to log ${ex.name}:`, e);
                results.push({ name: ex.name, xp_earned: 0, level: 0, rank_name: null, hasStandards: false, isPR: false });
              }
            } else {
              // No catalog match — log as generic block exercise with default xp_factor of 1.0
              const setXp = ex.sets.reduce((sum: number, s: any) => sum + Math.floor((s.reps || 10) * 1.0), 0);
              await logWorkoutBlockAction(userId, ex.name, `${ex.sets.length} Sets`, setXp, 'Strength', ex.sets, sessionId);
              results.push({ name: ex.name, xp_earned: setXp, level: 0, rank_name: null, value: `${ex.sets.length} Sets`, hasStandards: false, isPR: false });
            }
          }
          setBlockResults(results);
          setShowBlockComplete(true);
          if (onLogComplete) onLogComplete();
          const newCompleted = [...completedIndices, blockIndex];
          setCompletedIndices(newCompleted);
          if (newCompleted.length === workoutData.length) { setIsComplete(true); localStorage.removeItem(progressKey); }
          return;
        } else if (!isExerciseBlock && currentBlock.xp_value > 0) {
          await logWorkoutBlockAction(
            userId, currentBlock.name,
            distance ? `${distance} mi` : (currentBlock.description || `${currentBlock.sets || 1} Sets`),
            currentBlock.xp_value,
            currentBlock.type === 'card' || currentBlock.name.includes('Tread') ? 'Cardio' : 'Strength',
            exercisesData,
            sessionId
          );
          if (onLogComplete) onLogComplete();
          // Show celebration for timer/treadmill blocks
          const displayXp = timerXp || currentBlock.xp_value;
          setBlockResults([{
            name: currentBlock.name,
            xp_earned: displayXp,
            level: 0,
            rank_name: null,
            hasStandards: false,
            isPR: false,
            value: distance ? `${distance} mi` : 'Complete',
          }]);
          setShowBlockComplete(true);
          const newCompleted = [...completedIndices, blockIndex];
          setCompletedIndices(newCompleted);
          if (newCompleted.length === workoutData.length) { setIsComplete(true); localStorage.removeItem(progressKey); }
          return;
        }
      } catch (e) {
        console.error("Failed to log block:", e);
      }
    }

    advanceToNextBlock();
  };

  const advanceToNextBlock = () => {
    const newCompleted = [...completedIndices, blockIndex];
    setCompletedIndices(newCompleted);

    if (newCompleted.length === workoutData.length) {
      setIsComplete(true);
      localStorage.removeItem(progressKey);
      return;
    }

    const nextBlockIndex = blockIndex + 1;
    if (nextBlockIndex < workoutData.length) {
      const currentSection = currentBlock.section || 'General';
      const nextSection = workoutData[nextBlockIndex].section || 'General';
      if (currentSection === nextSection) {
        setBlockIndex(nextBlockIndex);
      } else {
        setViewMode('HUB');
      }
    } else {
      setViewMode('HUB');
    }
  };

  const handleContinueAfterBlock = () => {
    setBlockResults(null);
    setShowBlockComplete(false);
    advanceToNextBlock();
  };

  const handleStopAfterBlock = () => {
    setBlockResults(null);
    setShowBlockComplete(false);
    setViewMode('HUB');
  };

  // Render correct view based on block type
  let mainView;

  // Zone 2 block generator
  const generateZone2Block = (minutes: number): any => ({
    name: `Zone 2 Steady State (${minutes} min)`,
    type: 'timer',
    section: 'Engine',
    xp_value: Math.floor(minutes * 6),
    intervals: Array.from({ length: Math.ceil(minutes / 10) }, (_, i) => {
      const remaining = minutes - i * 10;
      const chunkMin = Math.min(10, remaining);
      return {
        type: 'interval',
        seconds: chunkMin * 60,
        zone: 'Base Pace',
        color: 'bg-green-500',
        note: 'Zone 2 — conversational pace',
        raw_text: `${chunkMin} min Base (Zone 2)`,
      };
    }),
  });

  // RENDER: Block completion results with continue/stop
  if (showBlockComplete && blockResults) {
    const totalXp = blockResults.reduce((sum: number, r: any) => sum + (r.xp_earned || 0), 0);
    const completedCount = completedIndices.length;
    const totalBlocks = workoutData.length;
    const progressPct = Math.round((completedCount / totalBlocks) * 100);

    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center text-center px-4">
        {/* Progress ring */}
        <div className="relative w-20 h-20 mb-4">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#1c1c1e" strokeWidth="5" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#xp-grad)" strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
              strokeLinecap="round" className="transition-all duration-700" />
            <defs>
              <linearGradient id="xp-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black text-orange-400">+{totalXp}</span>
          </div>
        </div>

        <h1 className="text-xl font-black text-white mb-1">Block Complete</h1>
        <p className="text-xs text-zinc-500 mb-5">{completedCount} of {totalBlocks} blocks done</p>

        <div className="w-full space-y-1.5 mb-6">
          {blockResults.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/30">
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {r.name}
                  {r.isPR && <span className="ml-1.5 text-yellow-400 text-[10px]">🏆 PR</span>}
                </p>
                <p className="text-[11px] text-zinc-500">{r.value}</p>
                {r.next_threshold_lbs && r.next_rank_name && (
                  <p className="text-[10px] text-orange-400 font-semibold mt-0.5">🔥 {r.next_threshold_lbs} lbs to {getThemedRankName((r.level || 0) + 1)}</p>
                )}
              </div>
              {r.hasStandards && r.level > 0 ? (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ml-2 ${
                  r.level >= 4 ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' :
                  r.level >= 2 ? 'bg-zinc-700/80 text-zinc-300 border border-zinc-600/30' :
                  'bg-zinc-800 text-zinc-400 border border-zinc-700/30'
                }`}>
                  {getThemedRankName(r.level || 0)}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600 shrink-0 ml-2">+{r.xp_earned} XP</span>
              )}
            </div>
          ))}
        </div>

        <div className="w-full space-y-2">
          <button
            onClick={handleContinueAfterBlock}
            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold uppercase tracking-wider text-sm rounded-xl hover:from-orange-500 hover:to-red-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-600/20"
          >
            Next Exercise →
          </button>
          <button
            onClick={handleStopAfterBlock}
            className="w-full py-3 text-zinc-500 font-medium text-sm rounded-xl hover:text-white transition"
          >
            Stop Workout
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <WorkoutReport
        sessionId={sessionId}
        userId={userId}
        onExit={() => window.location.reload()}
      />
    );
  }

  // RENDER: MISSION HUB
  if (viewMode === 'HUB') {
    // Calculate overall progress
    const totalBlocks = workoutData.length;
    const completedCount = completedIndices.length;
    const overallProgress = Math.round((completedCount / totalBlocks) * 100) || 0;

    return (
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="mb-5 px-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-0.5">Today&apos;s Workout</h2>
              <h1 className="text-xl font-black text-white">{workoutData[0]?.name?.split(' - ')[0] || selectedDate || "Today"}</h1>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">{overallProgress}%</span>
              <p className="text-[10px] text-zinc-500">{completedCount} of {totalBlocks} blocks done</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 rounded-full" style={{ width: `${overallProgress}%` }} />
          </div>
          {/* Next up CTA */}
          {completedCount < totalBlocks && (() => {
            const nextIdx = workoutData.findIndex((_: any, i: number) => !completedIndices.includes(i) && !skippedIndices.includes(i));
            if (nextIdx < 0) return null;
            const next = workoutData[nextIdx];
            return (
              <button
                onClick={() => { setBlockIndex(nextIdx); setViewMode('WORKOUT'); }}
                className="mt-3 w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-4 py-3 flex items-center justify-between transition-colors"
              >
                <div className="text-left">
                  <span className="text-[10px] text-white/60 uppercase font-bold">Next Up</span>
                  <p className="text-sm font-bold">{(next.name || next.type).replace(/^\d+\.\s*/, '')}</p>
                </div>
                <span className="text-sm font-bold">Start →</span>
              </button>
            );
          })()}
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {sections.map((section: any, idx: number) => {
            const isExpanded = expandedSection === idx;
            const sectionDoneCount = section.indices.filter((i: number) => completedIndices.includes(i)).length;

            return (
              <div key={idx} className={`rounded-xl border transition-all overflow-hidden ${
                section.isDone ? 'bg-zinc-900/30 border-zinc-800/50' :
                isExpanded ? 'bg-zinc-900 border-zinc-700 shadow-lg shadow-black/20' :
                'bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700'
              }`}>
                <button
                  className="w-full p-4 text-left flex items-center gap-3"
                  onClick={() => setExpandedSection(isExpanded ? null : idx)}
                >
                  {/* Status indicator */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    section.isDone ? 'bg-emerald-500/15' : 'bg-zinc-800'
                  }`}>
                    {section.isDone
                      ? <CheckCircle size={16} className="text-emerald-400" />
                      : <span className="text-xs font-bold text-zinc-400">{idx + 1}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold ${section.isDone ? 'text-emerald-400' : 'text-white'}`}>
                      {section.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {sectionDoneCount}/{section.count} blocks {section.isDone ? '✓' : ''}
                      {!section.isDone && (() => {
                        const sectionBlocks = section.indices.map((i: number) => workoutData[i]);
                        const estMins = sectionBlocks.reduce((s: number, b: any) => {
                          if (b.type === 'timer' && b.intervals) return s + b.intervals.reduce((t: number, i: any) => t + (i.seconds || 0), 0) / 60;
                          if (b.type === 'checklist_exercise') return s + (b.sets || 3) * ((b.rest_seconds || 60) + 30) / 60;
                          if (b.type === 'superset') return s + (b.sets || 3) * ((b.rest_seconds || 60) + 45) / 60;
                          return s;
                        }, 0);
                        const totalXp = sectionBlocks.reduce((s: number, b: any) => s + (b.xp_value || 0), 0);
                        return <span> · ~{Math.round(estMins)} min · {totalXp} XP</span>;
                      })()}
                    </p>
                  </div>

                  <ChevronRight size={16} className={`text-zinc-600 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-800/50">
                    <div className="py-3 space-y-2">
                      {section.indices.map((bIdx: number) => {
                        const block = workoutData[bIdx];
                        const isDone = completedIndices.includes(bIdx);
                        const isSkipped = skippedIndices.includes(bIdx);

                        return (
                          <div key={bIdx} className="flex items-center gap-2.5 text-sm">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSkipped ? 'bg-zinc-700' : isDone ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                            <div className="flex-1 min-w-0">
                              <span className={`${isDone ? 'text-zinc-500 line-through' : isSkipped ? 'text-zinc-600 italic' : 'text-zinc-300'}`}>
                                {block.name || block.type}
                              </span>
                              {!isDone && !isSkipped && (
                                <div className="text-[9px] text-zinc-600 mt-0.5">
                                  {block.type === 'checklist_exercise' && block.sets && (
                                    <span>{block.sets}×{block.target_duration_seconds ? `${block.target_duration_seconds}s` : (block.reps_per_set || '?')} {block.rest_seconds ? `· ${block.rest_seconds}s rest` : ''}</span>
                                  )}
                                  {block.type === 'superset' && block.exercises && (
                                    <span>{block.sets || 3} rounds · {block.exercises.length} exercises</span>
                                  )}
                                  {block.type === 'timer' && block.intervals && (
                                    <span>{Math.round(block.intervals.reduce((s: number, i: any) => s + (i.seconds || 0), 0) / 60)} min</span>
                                  )}
                                  {block.tips?.[0] && <span className="ml-1 italic">— {block.tips[0].substring(0, 40)}{block.tips[0].length > 40 ? '...' : ''}</span>}
                                </div>
                              )}
                            </div>
                            {isSkipped && <span className="text-[9px] text-zinc-600 border border-zinc-700 px-1 rounded">Skip</span>}
                            {!isDone && !isSkipped && block.xp_value > 0 && (
                              <span className="text-[9px] text-zinc-700 font-mono shrink-0">{block.xp_value}xp</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        const firstUnfinished = section.indices.find((i: number) => !completedIndices.includes(i));
                        const targetIndex = firstUnfinished !== undefined ? firstUnfinished : section.firstIndex;
                        setBlockIndex(targetIndex);
                        setViewMode('WORKOUT');
                      }}
                      className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-600/20 mt-1"
                    >
                      <Play size={14} fill="currentColor" />
                      {section.isDone ? 'Revisit' : 'Begin'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render correct view based on block type

  // Handle Granular Interval Logging
  const handleIntervalComplete = async (intervalData: any, xpShare: number) => {
    if (!userId || !currentBlock) return;

    try {
      await logWorkoutBlockAction(
        userId,
        `${currentBlock.name} - ${intervalData.zone || "Interval"}`,
        intervalData.text || intervalData.raw_text || "Interval",
        xpShare,
        'Cardio',
        undefined,
        sessionId
      );
      // Refresh parent history
      if (onLogComplete) onLogComplete();
    } catch (e) {
      console.error("Failed to log interval XP", e);
    }
  };

  if (!currentBlock) {
    mainView = (
      <div className="text-white text-center p-8 flex flex-col items-center justify-center h-[400px]">
        <div className="bg-zinc-800 p-4 rounded-full mb-4">
          <Info size={32} className="text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">No Active Workout</h2>
        <p className="text-zinc-400 mb-6 max-w-xs mx-auto">
          We couldn't find a workout for today. Check the library to load a past protocol.
        </p>
        <button
          onClick={() => setShowLibrary(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all"
        >
          Open Library
        </button>
      </div>
    );
  } else if (currentBlock.type === 'checklist_exercise') {
    mainView = (
      <ExerciseView
        key={blockIndex} // vital for resetting state on new exercise
        block={currentBlock}
        blockIndex={blockIndex}
        fullHistory={fullHistory}
        catalog={catalog}
        exerciseSwaps={exerciseSwaps}
        onSwap={(exIdx: number, name: string, swapGroup: string) => setSwapTarget({ blockIdx: blockIndex, exIdx, name, swapGroup })}
        onComplete={handleBlockComplete}
      />
    );
  } else if (currentBlock.type === 'list') {
    mainView = (
      <ChecklistView
        key={blockIndex}
        block={currentBlock}
        blockIndex={blockIndex}
        totalBlocks={workoutData.length}
        onComplete={handleBlockComplete}
      />
    );
  } else if (currentBlock.type === 'superset') {
    mainView = (
      <SupersetView
        key={blockIndex}
        block={currentBlock}
        blockIndex={blockIndex}
        fullHistory={fullHistory}
        catalog={catalog}
        exerciseSwaps={exerciseSwaps}
        onSwap={(exIdx: number, name: string, swapGroup: string) => setSwapTarget({ blockIdx: blockIndex, exIdx, name, swapGroup })}
        onComplete={handleBlockComplete}
      />
    )
  } else {
    // Timer block — show engine selector if user hasn't chosen yet
    const choice = engineChoice[blockIndex];
    if (choice === null || choice === undefined) {
      mainView = (
        <EngineSelector
          key={`engine-${blockIndex}`}
          recommendation={engineRecommendation}
          onSelect={(type, duration) => {
            setEngineChoice(prev => ({ ...prev, [blockIndex]: type }));
            if (type === 'zone2' && duration) {
              const zone2Block = generateZone2Block(duration);
              const newData = [...workoutData];
              newData[blockIndex] = { ...zone2Block, section: currentBlock.section };
              setWorkoutData(newData);
            }
          }}
        />
      );
    } else {
      const activeBlock = workoutData[blockIndex];
      mainView = (
        <TimerView
          key={blockIndex}
          block={activeBlock}
          blockIndex={blockIndex}
          totalBlocks={workoutData.length}
          onBlockComplete={handleBlockComplete}
          onIntervalComplete={handleIntervalComplete}
        />
      );
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Workout Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          onClick={() => viewMode === 'WORKOUT' ? setViewMode('HUB') : undefined}
          className={`text-left ${viewMode === 'WORKOUT' ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            {viewMode === 'WORKOUT' && <span className="text-zinc-500 text-sm">‹</span>}
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
              Block {completedIndices.length + 1} of {workoutData.length} · Today&apos;s Workout
            </span>
          </div>
        </button>
      </div>

      {mainView}

      {/* End Workout — always available */}
      {viewMode === 'WORKOUT' && (
        <div className="mt-3 text-center">
          <button
            onClick={() => {
              if (window.confirm('End workout early? Completed blocks are already saved.')) {
                setIsComplete(true);
                localStorage.removeItem(progressKey);
              }
            }}
            className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors py-2"
          >
            End Workout
          </button>
        </div>
      )}

      {/* Library Drawer */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4 min-h-screen" onClick={() => setShowLibrary(false)}>
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden border border-zinc-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-700 shrink-0">
              <h2 className="text-2xl font-black italic text-white">Workout Library</h2>
              <p className="text-zinc-400 text-sm mt-1">Select a past workout</p>
            </div>

            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {/* TABS */}
              <div className="flex p-1 bg-zinc-800 rounded-xl mb-4">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition ${activeTab === 'schedule' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Weekly Schedule
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition ${activeTab === 'history' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Past History
                </button>
              </div>

              {activeTab === 'schedule' ? (
                /* SCHEDULE VIEW */
                <div className="space-y-2">
                  {weeklySchedule.map((day) => (
                    <button
                      key={day.day}
                      onClick={() => handlePreviewWorkout(day.day)}
                      className="w-full p-4 rounded-xl text-left bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-bold capitalize text-white opacity-100">{day.day}</div>
                        <ChevronRight size={16} className="opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 truncate">{day.title}</div>
                    </button>
                  ))}
                </div>
              ) : (
                /* HISTORY VIEW */
                <div className="space-y-2">
                  {/* "Today" option */}
                  <button
                    onClick={() => handlePreviewWorkout()}
                    className={`w-full p-4 rounded-xl text-left transition ${(!selectedDate && !briefingData)
                      ? 'bg-orange-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                  >
                    <div className="font-bold">Today</div>
                    <div className="text-xs opacity-70">Latest workout</div>
                  </button>

                  {/* Historical workouts */}
                  {workoutDates.map((date) => {
                    const isSelected = selectedDate === date;
                    return (
                      <button
                        key={date}
                        onClick={() => handlePreviewWorkout(date)}
                        className={`w-full p-4 rounded-xl text-left transition ${isSelected
                          ? 'bg-orange-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                      >
                        <div className="font-bold">{date}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Swap Exercise Picker */}
      {swapTarget && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setSwapTarget(null)}>
          <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl w-full max-w-lg max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Swap Exercise</h3>
                <p className="text-[10px] text-zinc-500">Replacing: {swapTarget.name}</p>
              </div>
              <button onClick={() => setSwapTarget(null)} className="text-zinc-500 hover:text-white text-xs font-bold px-3 py-1 rounded bg-zinc-800">✕</button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1">
              {catalog
                .filter(c => c.swap_group === swapTarget.swapGroup && c.name.toLowerCase() !== swapTarget.name.toLowerCase())
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      const key = `${swapTarget.blockIdx}-${swapTarget.exIdx}`;
                      setExerciseSwaps(prev => ({ ...prev, [key]: { name: c.name, catalogItem: c } }));
                      setSwapTarget(null);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition flex items-center justify-between"
                  >
                    <span className="text-sm text-white">{c.name}</span>
                    {c.required_equipment && c.required_equipment.length > 0 && (
                      <span className="text-[9px] text-zinc-600">{c.required_equipment.join(', ')}</span>
                    )}
                  </button>
                ))}
              {catalog.filter(c => c.swap_group === swapTarget.swapGroup && c.name.toLowerCase() !== swapTarget.name.toLowerCase()).length === 0 && (
                <p className="text-center text-zinc-500 text-xs py-4">No alternatives available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}