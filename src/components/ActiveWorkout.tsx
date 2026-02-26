"use client";

import { useState, useEffect, useMemo } from 'react';
import { getActiveWorkout, getWorkoutHistory, getWeeklySchedule, getHistory, getTrainingCatalog } from '../services/api';
import type { HistoryItem, CatalogItem } from '@/types';
import ExerciseHistoryModal from './ExerciseHistoryModal'; // 🟢 NEW
import { playCountdownBeep } from '../utils/audio';
import { Play, Pause, SkipForward, RotateCcw, Calendar, CheckCircle, Info, Timer, ChevronRight } from 'lucide-react';
import ChecklistView from './ChecklistView';
import { logWorkoutBlockAction } from '@/app/actions';

// --- SAFELIST CONSTANT REMOVED ---

// --- SUB-COMPONENT: EXERCISE VIEW ---
function ExerciseView({ block, onComplete, fullHistory, catalog }: any) {
  const [completedSets, setCompletedSets] = useState<number[]>([]);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const totalSets = block.sets || 1;
  const [weights, setWeights] = useState<string[]>(Array(totalSets).fill(''));

  const [showHistoryModal, setShowHistoryModal] = useState(false); // 🟢 NEW

  // Find Catalog Item
  const catalogItem = useMemo(() => {
    if (!catalog || catalog.length === 0) return null;
    return catalog.find((c: any) => c.name.toLowerCase() === block.name.toLowerCase());
  }, [catalog, block.name]);

  const updateWeight = (index: number, val: string) => {
    const newWeights = [...weights];
    newWeights[index] = val;
    setWeights(newWeights);
  };

  useEffect(() => {
    let interval: any = null;
    if (isResting && restTime > 0) {
      if (restTime <= 5) playCountdownBeep();
      interval = setInterval(() => setRestTime((p) => p - 1), 1000);
    } else if (restTime === 0 && isResting) {
      setIsResting(false);
      // Optional: Play sound or vibrate here
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
    <div className="w-full max-w-md mx-auto h-[80vh] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative bg-zinc-900 border border-zinc-800">

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
          <h1 className="text-white text-2xl font-black italic leading-tight">
            {block.name}
          </h1>

          {/* 🟢 HISTORY BUTTON */}
          {catalogItem && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-2 rounded-lg border border-zinc-700 transition"
              title="View History"
            >
              <Calendar size={20} />
            </button>
          )}
        </div>

        <p className="text-zinc-400 text-sm mt-1 font-mono">
          {block.sets} Sets × {block.reps_per_set} Reps • {block.rest_seconds || 90}s Rest
        </p>
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
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group ${isDone
                  ? 'bg-green-500/10 border-green-500/50 text-green-500'
                  : 'bg-zinc-800 border-zinc-700'
                  }`}
              >
                {/* Weight Input */}
                <div className="flex flex-col mr-4">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Weight</span>
                  <input
                    type="text"
                    placeholder="lbs"
                    value={weights[i]}
                    onChange={(e) => updateWeight(i, e.target.value)}
                    className="bg-zinc-900 text-white border border-zinc-600 rounded p-2 w-20 text-center font-mono text-sm focus:border-orange-500 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <button
                  onClick={() => toggleSet(i)}
                  className="flex-1 flex items-center justify-between text-left"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className={`font-bold font-mono ${isDone ? 'line-through opacity-70' : 'text-zinc-300 group-hover:text-white'}`}>
                      SET {i + 1}
                    </span>
                    {setReps && (
                      <span className={`text-xs ${isDone ? 'opacity-60' : 'text-zinc-500'}`}>
                        {setReps} Reps
                      </span>
                    )}
                  </div>

                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-zinc-500 group-hover:border-zinc-400'
                    }`}>
                    {isDone && <CheckCircle size={16} className="text-black" />}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* REST TIMER OVERLAY */}
      {isResting && (
        <div className="absolute inset-x-0 bottom-[100px] mx-6 bg-black/80 backdrop-blur-md rounded-2xl border border-zinc-700 p-4 flex items-center justify-between animate-in slide-in-from-bottom-4 shadow-2xl z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 animate-pulse">
              <Timer size={20} />
            </div>
            <div>
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Resting</div>
              <div className="text-white font-mono text-xl font-bold">
                0:{restTime < 10 ? '0' : ''}{restTime}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsResting(false)}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg transition"
          >
            SKIP
          </button>
        </div>
      )}

      {/* FOOTER ACTION */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 shrink-0">
        <button
          onClick={() => {
            // Construct detailed payload
            const exercisesPayload = [{
              name: block.name,
              sets: completedSets.map(i => ({
                weight: parseFloat(weights[i] || '0'), // Default 0 if empty
                reps: block.reps_list ? block.reps_list[i] : (typeof block.reps_per_set === 'number' ? block.reps_per_set : 0) // Try to resolve reps
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

  const currentInterval = block.intervals[intervalIndex];
  const nextInterval = block.intervals[intervalIndex + 1];

  useEffect(() => {
    if (currentInterval) {
      setTimeLeft(currentInterval.seconds);
      setIsActive(true);
    }
  }, [intervalIndex, currentInterval]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      if (timeLeft <= 5) playCountdownBeep();
      interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      handleNext();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleNext = () => {
    // 🟢 NEW: Log the completed interval immediately
    if (currentInterval && onIntervalComplete) {
      // Calculate dynamic XP based on Intensity * Duration
      let rate = 5; // Default (Base/Recovery) - 5 XP/min
      const z = (currentInterval.zone || currentInterval.text || "").toLowerCase();

      if (z.includes("push") || z.includes("tempo") || z.includes("threshold")) rate = 12;
      else if (z.includes("all out") || z.includes("sprint") || z.includes("max")) rate = 20;
      else if (z.includes("long run") || z.includes("moderate")) rate = 8;

      // Minimum 1 XP if it's very short
      const durationMin = currentInterval.seconds / 60;
      const earned = Math.ceil(Math.max(1, durationMin * rate));

      onIntervalComplete(currentInterval, earned);
    }

    if (intervalIndex < block.intervals.length - 1) {
      setIntervalIndex((prev) => prev + 1);
    } else {
      setIsActive(false);
      onBlockComplete();
    }
  };


  if (!currentInterval) return <div className="text-white p-8">Loading Interval...</div>;

  return (
    <div className={`w-full max-w-md mx-auto h-[80vh] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative transition-colors duration-700 ${currentInterval.color}`}>

      {/* HEADER */}
      <div className="bg-black/20 p-6 backdrop-blur-sm shrink-0">
        <h2 className="text-white/80 font-bold uppercase tracking-widest text-xs">
          {block.name}
        </h2>
        <div className="flex justify-between items-end mt-1">
          <h1 className="text-white text-3xl font-black italic">
            {currentInterval.zone}
          </h1>
          <span className="text-white/60 font-mono text-sm">
            Block {blockIndex + 1} / {totalBlocks}
          </span>
        </div>
      </div>

      {/* CONTENT: TIMER OR CARD */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10 transition-all">
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
            <div className="text-[120px] font-black text-white leading-none tracking-tighter drop-shadow-lg font-mono">
              {isNaN(timeLeft) ? "--:--" :
                `${Math.floor(timeLeft / 60)}:${timeLeft % 60 < 10 ? '0' : ''}${timeLeft % 60}`
              }
            </div>
            <p className="text-white/90 text-lg font-medium mt-4 max-w-[90%] animate-pulse-slow">
              {currentInterval.note || currentInterval.raw_text}
            </p>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="bg-black/30 p-4 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-1 rounded uppercase">Up Next</span>
          <span className="text-sm text-white/80 truncate">
            {nextInterval ? (nextInterval.raw_text || nextInterval.text) : "Block Complete"}
          </span>
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
function SupersetView({ block, onComplete, fullHistory, catalog }: any) {
  // State to track completion of each set for each exercise
  // Structure: { "exercise_index": [completed_set_indices] }
  const [completedSets, setCompletedSets] = useState<Record<number, number[]>>({});
  const [weights, setWeights] = useState<Record<string, string>>({}); // Key: "exIdx-setIdx"

  // 🟢 NEW: Active History Modal
  const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<CatalogItem | null>(null);

  // Rest Timer State
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const exercises = block.exercises || [];
  const totalSets = block.sets || 3;

  // Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (isResting && restTime > 0) {
      if (restTime <= 5) playCountdownBeep();
      interval = setInterval(() => setRestTime((p) => p - 1), 1000);
    } else if (restTime === 0 && isResting) {
      setIsResting(false);
      playCountdownBeep(); // Play final beep
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
    <div className="w-full max-w-md mx-auto h-[80vh] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative bg-zinc-900 border border-zinc-800">

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
          {block.sets} Rounds × {exercises.length} Exercises
        </p>
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

                  // Find catalog item
                  const catalogItem = catalog?.find((c: any) => c.name.toLowerCase() === ex.name.toLowerCase());

                  return (
                    <div key={exIdx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDone ? 'bg-green-500/10 border-green-500/40' : 'bg-zinc-800 border-zinc-700'
                      }`}>

                      {/* Weight Input */}
                      <div className="flex flex-col w-12">
                        <input
                          type="text"
                          placeholder="lbs"
                          value={weights[weightKey] || ''}
                          onChange={(e) => updateWeight(exIdx, setIdx, e.target.value)}
                          className="bg-zinc-900 text-white border border-zinc-600 rounded px-1 py-1 text-center text-xs w-full focus:outline-none focus:border-purple-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Clickable Area */}
                      <button
                        onClick={() => toggleSet(exIdx, setIdx)}
                        className="flex-1 flex items-center justify-between text-left"
                      >
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm leading-tight ${isDone ? 'text-zinc-400 line-through' : 'text-white'}`}>
                            {ex.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {ex.reps} Reps
                          </span>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500' : 'border-zinc-500 hover:border-white'
                          }`}>
                          {isDone && <CheckCircle size={12} className="text-black" />}
                        </div>
                      </button>

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
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>

      {/* REST TIMER OVERLAY */}
      {isResting && (
        <div className="absolute inset-x-0 bottom-[100px] mx-6 bg-purple-900/90 backdrop-blur-md rounded-2xl border border-purple-500/50 p-4 flex items-center justify-between animate-in slide-in-from-bottom-4 shadow-2xl z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white animate-pulse">
              <Timer size={20} />
            </div>
            <div>
              <div className="text-purple-200 text-xs font-bold uppercase tracking-wider">Next Round</div>
              <div className="text-white font-mono text-xl font-bold">
                0:{restTime < 10 ? '0' : ''}{restTime}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsResting(false)}
            className="text-xs bg-black/40 hover:bg-black/60 text-white px-3 py-2 rounded-lg transition uppercase font-bold tracking-wider"
          >
            SKIP
          </button>
        </div>
      )}

      {/* FOOTER ACTION */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 shrink-0">
        <button
          onClick={() => {
            // Construct detailed payload for Superset
            // exercises is a list of exercise objects
            const exercisesPayload = exercises.map((ex: any, exIdx: number) => {
              // sets for this exercise
              const setsData = [];
              for (let i = 0; i < totalSets; i++) {
                if ((completedSets[exIdx] || []).includes(i)) {
                  setsData.push({
                    weight: parseFloat(weights[`${exIdx}-${i}`] || '0'),
                    reps: ex.reps // Assuming fixed reps per exercise in superset for now
                  });
                }
              }
              return {
                name: ex.name,
                sets: setsData
              };
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

export default function ActiveWorkout({ userId, onLogComplete, initialDate }: ActiveWorkoutProps) {
  const [blockIndex, setBlockIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [workoutData, setWorkoutData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🟢 NEW: Mission HUB State
  const [viewMode, setViewMode] = useState<'HUB' | 'WORKOUT'>('HUB');
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);

  // NEW: History State
  const [showLibrary, setShowLibrary] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  // 🟢 NEW: Full History & Catalog for Drill-Down
  const [fullHistory, setFullHistory] = useState<HistoryItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  // 🟢 NEW: Briefing State
  const [briefingData, setBriefingData] = useState<any[] | null>(null);
  const [briefingDate, setBriefingDate] = useState<string | null>(null);

  // 🟢 NEW: Computed Sections
  const sections = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return [];

    const uniqueNames = Array.from(new Set(workoutData.map(b => b.section || 'General')));
    return uniqueNames.map(name => {
      const sectionBlocks = workoutData.map((b, i) => ({ ...b, globalIndex: i })).filter(b => (b.section || 'General') === name);
      const firstIndex = sectionBlocks[0].globalIndex;
      const indices = sectionBlocks.map(b => b.globalIndex);
      const isDone = indices.every(i => completedIndices.includes(i));

      return {
        name,
        firstIndex,
        count: sectionBlocks.length,
        indices,
        isDone
      };
    });
  }, [workoutData, completedIndices]);

  // FETCH WORKOUT ON MOUNT
  useEffect(() => {
    loadWorkout(initialDate || undefined);
    loadHistory();
    loadSchedule();
  }, [initialDate]);

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
      const data = await getActiveWorkout(date);
      setWorkoutData(data || []);
      setSelectedDate(date || null);

      // Reset State
      setBlockIndex(0);
      setCompletedIndices([]);
      setSkippedIndices([]);

      // Decide View Mode
      // If we confirm it has multiple sections, go to HUB. Else START immediately?
      // Actually, let's always default to HUB if sections > 1 for that "Mission" feel.
      // But we need to wait for data to know.
      // We'll set it in the effect below or here.
      const uniqueSections = new Set((data || []).map((b: any) => b.section || 'General'));
      if (uniqueSections.size > 1) {
        setViewMode('HUB');
      } else {
        setViewMode('WORKOUT');
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

  const handleBlockComplete = async (skipped: boolean = false, exercisesData: any[] = []) => {
    // 1. Submit XP if applicable (AND NOT SKIPPED)
    // 🟢 CHANGED: Prevent duplicate XP for timer/interval blocks which award XP incrementally
    const isIncremental = !['checklist_exercise', 'list', 'superset'].includes(currentBlock.type);

    if (!skipped && userId && currentBlock && currentBlock.xp_value > 0 && !isIncremental) {
      try {
        console.log(`Submitting XP for block: ${currentBlock.name} (${currentBlock.xp_value} XP)`);
        await logWorkoutBlockAction(
          userId,
          currentBlock.name,
          currentBlock.description || `${currentBlock.sets || 1} Sets`, // Details
          currentBlock.xp_value,
          currentBlock.type === 'card' || currentBlock.name.includes('Tread') ? 'Cardio' : 'Strength',
          exercisesData // <--- Pass Detailed Data
        );

        // Notify Parent (Training.tsx) to refresh stats
        if (onLogComplete) onLogComplete();

      } catch (e) {
        console.error("Failed to log block XP", e);
      }
    } else if (skipped) {
      console.log("Block skipped. No XP awarded.");
      setSkippedIndices(prev => [...prev, blockIndex]);
    }

    // 2. Mark as Complete locally
    const newCompleted = [...completedIndices, blockIndex];
    setCompletedIndices(newCompleted);

    // Check Global Completion
    if (newCompleted.length === workoutData.length) {
      setIsComplete(true);
      return;
    }

    // 3. Advance Logic
    const nextBlockIndex = blockIndex + 1;

    // Check if next block exists
    if (nextBlockIndex < workoutData.length) {
      // Check if next block is in same section
      const currentSection = currentBlock.section || 'General';
      const nextSection = workoutData[nextBlockIndex].section || 'General';

      if (currentSection === nextSection) {
        setBlockIndex(nextBlockIndex);
      } else {
        // Section Complete! Return to Hub.
        setViewMode('HUB');
        // Allow user to see they finished it? Maybe toast?
      }
    } else {
      // End of linear list, return to Hub
      setViewMode('HUB');
    }
  };

  // Debug logging
  console.log('ActiveWorkout Debug:', {
    blockIndex,
    totalBlocks: workoutData.length
  });
  // Render correct view based on block type
  let mainView;

  // (Empty check handled in main view logic below)



  if (isComplete) {
    return (
      <div className="w-full max-w-md mx-auto h-[600px] bg-zinc-900 rounded-3xl flex flex-col items-center justify-center text-center p-8 border border-green-500/30">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-4xl font-black italic text-white mb-2">WORKOUT COMPLETE</h1>
        <p className="text-zinc-400 mb-8">Excellent work today.</p>
        <button onClick={() => window.location.reload()} className="bg-white text-black font-bold py-3 px-8 rounded-xl uppercase tracking-wider">
          Exit
        </button>
      </div>
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
        <div className="mb-6 bg-zinc-900/50 backdrop-blur p-6 rounded-2xl border border-zinc-800 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-2">Daily Protocol</h2>
            <h1 className="text-3xl font-black italic text-white mb-2">{selectedDate || "Today's Plan"}</h1>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
            </div>
            <p className="text-zinc-400 text-xs font-mono">{completedCount} / {totalBlocks} Blocks Complete</p>
          </div>
        </div>

        {/* Sections List */}
        <div className="space-y-4">
          {sections.map((section: any, idx: number) => {
            const isExpanded = expandedSection === idx;

            return (
              <div
                key={idx}
                className={`w-full rounded-2xl border transition-all duration-300 overflow-hidden ${section.isDone
                  ? 'bg-zinc-900/30 border-green-900/30 opacity-60 hover:opacity-100'
                  : 'bg-zinc-900 border-zinc-700'
                  } ${isExpanded ? 'border-orange-500 shadow-lg shadow-orange-900/20' : 'hover:border-zinc-500'}`}
              >
                {/* Main Card Header (Clickable for Expand) */}
                <button
                  className="w-full p-6 text-left flex justify-between items-center"
                  onClick={() => setExpandedSection(isExpanded ? null : idx)}
                >
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                      Section {idx + 1}
                    </div>
                    <h3 className={`text-xl font-black italic ${section.isDone ? 'text-green-500' : 'text-white'}`}>
                      {section.name}
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1 font-mono">
                      {section.count} Blocks
                    </p>
                  </div>

                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                    {section.isDone
                      ? <CheckCircle size={24} className="text-green-500" />
                      : <ChevronRight size={24} className="text-zinc-600" />
                    }
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-0 border-t border-zinc-800/50 bg-black/20">

                    {/* List of Blocks */}
                    <div className="py-4 space-y-4">
                      {section.indices.map((blockIndex: number) => {
                        const block = workoutData[blockIndex];
                        const isComplete = completedIndices.includes(blockIndex);
                        const isSkipped = skippedIndices.includes(blockIndex); // Check for skip

                        // Determine detail items to show
                        let details: string[] = [];
                        if (block.exercises && Array.isArray(block.exercises)) {
                          details = block.exercises.map((e: any) => e.name || e.text || "Exercise").slice(0, 5);
                        } else if (block.intervals && Array.isArray(block.intervals)) {
                          // Summarize intervals? "30 sec base", etc.
                          details = block.intervals
                            .filter((i: any) => i.type === 'interval')
                            .map((i: any) => i.raw_text || i.zone)
                            .slice(0, 6);
                        }

                        return (
                          <div key={blockIndex} className="text-sm text-zinc-400">
                            {/* Block Title */}
                            <div className="flex items-center gap-3 mb-1">
                              <div className={`w-2 h-2 rounded-full ${isSkipped ? 'bg-zinc-700' : isComplete ? 'bg-green-500' : 'bg-zinc-600'}`}></div>
                              <span className={`font-bold ${isSkipped ? 'text-zinc-500 font-normal italic' : isComplete ? 'text-green-500 line-through' : 'text-white'}`}>
                                {block.name || block.type}
                                {isSkipped && <span className="text-[10px] ml-2 text-zinc-600 not-italic uppercase tracking-wider border border-zinc-700 px-1 rounded">Skipped</span>}
                              </span>
                            </div>

                            {/* Inner Details (Exercises) */}
                            {details.length > 0 && (
                              <ul className="pl-5 space-y-1 mt-1 border-l-2 border-zinc-800 ml-1">
                                {details.map((detail, dIdx) => (
                                  <li key={dIdx} className="text-xs text-zinc-500">
                                    {detail}
                                  </li>
                                ))}
                                {(block.exercises?.length > 5 || block.intervals?.length > 6) && (
                                  <li className="text-xs text-zinc-600 italic">...and more</li>
                                )}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Start Button */}
                    <button
                      onClick={() => {
                        const firstUnfinished = section.indices.find((i: number) => !completedIndices.includes(i));
                        const targetIndex = firstUnfinished !== undefined ? firstUnfinished : section.firstIndex;

                        setBlockIndex(targetIndex);
                        setViewMode('WORKOUT');
                      }}
                      className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black uppercase text-lg rounded-xl flex items-center justify-center gap-2 transition-colors mt-2"
                    >
                      <Play size={20} fill="currentColor" />
                      {section.isDone ? 'Revisit Section' : 'Begin Section'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Library / Back */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowLibrary(true)}
            className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition"
          >
            View All Protocols
          </button>
        </div>
      </div>
    );
  }

  // Render correct view based on block type

  // 🟢 NEW: Handle Granular Interval Logging
  const handleIntervalComplete = async (intervalData: any, xpShare: number) => {
    if (!userId || !currentBlock) return;

    try {
      console.log(`Submitting Interval XP: ${intervalData.zone || intervalData.text} (${xpShare} XP)`);
      await logWorkoutBlockAction(
        userId,
        `${currentBlock.name} - ${intervalData.zone || "Interval"}`, // "Treadmill Warmup - Push Pace"
        intervalData.text || intervalData.raw_text || "Interval",
        xpShare,
        'Cardio'
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
        fullHistory={fullHistory}
        catalog={catalog}
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
        fullHistory={fullHistory}
        catalog={catalog}
        onComplete={handleBlockComplete}
      />
    )
  } else {
    mainView = (
      <TimerView
        key={blockIndex}
        block={currentBlock}
        blockIndex={blockIndex}
        totalBlocks={workoutData.length}
        onBlockComplete={handleBlockComplete}
        onIntervalComplete={handleIntervalComplete} // 🟢 NEW
      />
    );
  }

  return (
    <div className="relative w-full">
      {/* Workout Header with Library Button */}
      <div className="mb-4 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm p-4 rounded-2xl border border-zinc-800 max-w-md mx-auto">
        <div onClick={() => viewMode === 'WORKOUT' && setViewMode('HUB')} className={viewMode === 'WORKOUT' ? "cursor-pointer" : ""}>
          <h2 className="text-orange-500 font-bold uppercase tracking-widest text-xs flex items-center gap-1">
            {viewMode === 'WORKOUT' && <span className="text-[10px]">◀</span>} Active Workout
          </h2>
          <p className="text-white font-bold text-lg">
            {selectedDate || "Today's Protocol"}
          </p>
        </div>
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
          aria-label="Workout Library"
        >
          <Calendar size={24} />
        </button>
      </div>

      {mainView}

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
    </div>
  );
}