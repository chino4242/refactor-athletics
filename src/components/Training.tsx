"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
// Verified

import { type WorkoutSet, type HistoryItem, type CatalogItem } from '../services/api';
import { logTrainingAction, deleteHistoryItemAction } from '@/app/actions';
import ActiveWorkout from './ActiveWorkout'; // 👈 Imported
import Calculator from './Calculator';
import InfoTooltip from './common/InfoTooltip';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import TestingTimer from './TestingTimer';
import WeeklySchedule from './WeeklySchedule';
import ExerciseHistoryModal from './ExerciseHistoryModal'; // 👈 Imported

interface TrainingProps {
  userId: string;
  bodyweight: number;
  sex: string;
  age: number;
  initialHistory?: HistoryItem[];
  initialCatalog?: CatalogItem[];
  onLogComplete?: () => void;
}



interface QueuedExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
}

export default function Training({ userId, bodyweight, sex, age, initialHistory, initialCatalog, onLogComplete }: TrainingProps) {
  // --- STATE ---
  const [catalog, setCatalog] = useState<CatalogItem[]>(initialCatalog || []);
  const { currentTheme } = useTheme();

  // 🟢 NEW: Active Session Toggle State
  const [showActiveSession, setShowActiveSession] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // Track selected day
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory || []);
  const [showHistoryModal, setShowHistoryModal] = useState(false); // 🟢 NEW

  // Current Form State
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [sets, setSets] = useState<WorkoutSet[]>([{ weight: 0, reps: 0, distance: 0, duration: 0 }]);
  const [useMiles, setUseMiles] = useState(true); // Toggle for Distance Input

  // The Session "Shopping Cart"
  const [sessionQueue, setSessionQueue] = useState<QueuedExercise[]>([]);

  // Search / Dropdown
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ xp: number, count: number } | null>(null);
  const toast = useToast();



  // 🟢 NEW: Sync Server Props to State
  useEffect(() => {
    if (initialHistory) setHistory(initialHistory);
    if (initialCatalog) {
      setCatalog(initialCatalog);
      if (initialCatalog.length > 0 && !selectedExerciseId) {
        setSelectedExerciseId(initialCatalog[0].id);
        setSearchTerm(initialCatalog[0].name);
      }
    }
  }, [initialHistory, initialCatalog]);


  // --- 2. DROPDOWN LOGIC ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGroups = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};
    const filteredItems = catalog.filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()));

    filteredItems.forEach(ex => {
      const cat = ex.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ex);
    });

    const orderedKeys = ["Strength", "Bodyweight", "Cardio", "Conditioning", "Olympic", "Strongman", "Accessory", "Core", "Mobility"];
    const sortedGroups: Record<string, CatalogItem[]> = {};

    orderedKeys.forEach(key => { if (groups[key]) sortedGroups[key] = groups[key]; });
    Object.keys(groups).forEach(key => { if (!sortedGroups[key]) sortedGroups[key] = groups[key]; });

    return sortedGroups;
  }, [catalog, searchTerm]);

  // --- 3. INPUT HELPERS ---
  const currentExercise = catalog.find(e => e.id === selectedExerciseId);
  const type = currentExercise?.type || 'weight_reps';
  // 🟢 NEW: Check for Calories Unit
  const unit = currentExercise?.standards?.unit || currentExercise?.unit;
  const isCalories = unit === 'calories';
  const isWatts = unit === 'watts';

  const showWeight = type === 'weight_reps';
  const showReps = (type === 'weight_reps' || type === 'reps_only') && !isCalories && !isWatts;
  const showDist = type === 'distance_time';
  const showTime = type === 'distance_time' || type === 'duration';

  // --- HANDLERS ---
  const handleSelectExercise = (exercise: CatalogItem) => {
    setSelectedExerciseId(exercise.id);
    setSearchTerm(exercise.name);
    setIsDropdownOpen(false);
    setSets([{ weight: 0, reps: 0, distance: 0, duration: 0 }]); // Reset form
  };

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets([...sets, { ...lastSet }]);
  };

  const removeSet = (index: number) => {
    if (sets.length === 1) return;
    setSets(sets.filter((_, i) => i !== index));
  };

  const updateSet = (index: number, field: keyof WorkoutSet, value: number) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  // --- SESSION LOGIC ---
  const handleAddExercise = () => {
    if (!currentExercise) return;

    const newEntry: QueuedExercise = {
      id: crypto.randomUUID(),
      exerciseId: currentExercise.id,
      name: currentExercise.name,
      sets: [...sets]
    };

    setSessionQueue([...sessionQueue, newEntry]);
    setSets([{ weight: 0, reps: 0, distance: 0, duration: 0 }]);
  };

  const removeQueuedItem = (queueId: string) => {
    setSessionQueue(sessionQueue.filter(q => q.id !== queueId));
  };

  const handleFinishWorkout = async () => {
    if (!userId || sessionQueue.length === 0) return;
    setIsSubmitting(true);
    let totalXp = 0;
    try {
      for (const item of sessionQueue) {
        const result = await logTrainingAction(userId, item.exerciseId, bodyweight, sex, item.sets);
        totalXp += result.xp_earned;
      }
      setSuccessData({ xp: totalXp, count: sessionQueue.length });
      setSessionQueue([]);

      // Next.js Server Action automatically pushes standard revalidation on History
      if (onLogComplete) onLogComplete();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save some exercises. Please check your internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAfterSuccess = () => {
    setSuccessData(null);
    setSets([{ weight: 0, reps: 0, distance: 0, duration: 0 }]);
  };

  // --- RENDER ---
  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up flex flex-col gap-8 relative">

      {/* 🟢 THEME BANNER */}
      <div className="w-full relative bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
        <img
          src={`/themes/${currentTheme}/banner.png`}
          alt="Theme Banner"
          // Removed max-h constraint on desktop since container is max-w-3xl. 
          // Kept mobile constraint to save space.
          className="w-full h-auto block object-cover max-h-48 md:max-h-96"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent"></div>

        {/* 🟢 TESTING TIMER OVERLAY */}
        <TestingTimer variant="overlay" />
      </div>







      {successData && (
        <div className="max-w-md mx-auto mt-8 animate-fade-in-up">
          <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-green-500/5 blur-xl"></div>
            <div className="relative z-10">
              <div className="text-6xl mb-4">🔥</div>
              <h2 className="text-2xl font-black italic text-white mb-2">SESSION COMPLETE</h2>
              <p className="text-zinc-400 mb-6">You logged {successData.count} exercises.</p>
              <div className="bg-black/40 rounded-xl p-4 mb-6 border border-zinc-800">
                <div className="text-sm text-zinc-400 uppercase tracking-widest font-bold">Total Earned</div>
                <div className="text-4xl font-black text-green-400">+{successData.xp} XP</div>
              </div>
              <button onClick={resetAfterSuccess} className="bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-wider py-3 px-8 rounded-lg w-full transition transform hover:scale-105">
                Start New Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Training Form and Session Queue */}
      {!successData && (
        <>
          {/* 1. WEEKLY SCHEDULE / ACTIVE SESSION */}
          <div className="mb-8">
            {!showActiveSession ? (
              <WeeklySchedule
                onSelectDay={(date) => {
                  setSelectedDate(date);
                  setShowActiveSession(true);
                }}
                completedDates={[]}
              />
            ) : (
              <div className="relative animate-fade-in-up bg-zinc-900 rounded-3xl border border-zinc-700 shadow-2xl overflow-hidden">
                <button
                  onClick={() => {
                    setShowActiveSession(false);
                    setSelectedDate(null);
                  }}
                  className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition hover:rotate-90"
                  title="Close Session"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <ActiveWorkout
                  userId={userId}
                  initialDate={selectedDate}
                  onLogComplete={() => {
                    if (onLogComplete) onLogComplete();
                  }}
                />
              </div>
            )}
          </div>

          {/* 3. EXERCISE BUILDER CARD (Training Log) */}
          <div className="bg-zinc-800/50 border border-zinc-700 p-6 rounded-2xl shadow-xl backdrop-blur-sm relative" style={{ minHeight: '450px' }}>

            {/* HEADER */}
            <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black italic text-white tracking-tighter">TRAINING LOG</h2>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Build Your Session</p>
              </div>

              {/* SEARCHABLE DROPDOWN */}
              <div className="relative w-full md:w-72" ref={dropdownRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchTerm}
                      onClick={() => { setSearchTerm(''); setIsDropdownOpen(true); }}
                      onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                      placeholder="Search exercises..."
                      className="w-full bg-zinc-900 border border-zinc-600 text-white text-sm font-bold rounded-lg p-3 outline-none focus:border-orange-500 transition placeholder-zinc-600"
                    />
                    <div className="absolute right-3 top-3.5 pointer-events-none text-zinc-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
                    </div>
                  </div>

                  {/* HISTORY BUTTON */}
                  {currentExercise && (
                    <button
                      onClick={() => setShowHistoryModal(true)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white p-3.5 rounded-lg border border-zinc-600 transition text-lg"
                      title="View History"
                    >
                      📊
                    </button>
                  )}
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50 divide-y divide-zinc-800">
                    {Object.entries(filteredGroups).map(([category, items]) => (
                      <div key={category}>
                        <div className="sticky top-0 bg-zinc-950/90 backdrop-blur px-3 py-2 text-xs uppercase font-bold text-orange-500 tracking-wider border-b border-zinc-800">
                          {category}
                        </div>
                        {items.map((ex) => (
                          <div key={ex.id} onClick={() => handleSelectExercise(ex)} className="px-4 py-3.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors">
                            {ex.name}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                  <InfoTooltip text="Custom exercises award 'Grind XP' based on volume, but do not contribute to your Rank Levels." size={12} />
                  <span>Pro Tip: Only "Ranked" exercises contribute to your Power Level.</span>
                </div>
              </div>
            </div>

            {/* INPUTS */}
            <div className="space-y-3 mb-8">
              <div className="grid grid-cols-6 gap-2 text-xs text-zinc-500 uppercase font-bold tracking-wider px-2">
                <div className="col-span-1 text-center">Set</div>

                {/* DYNAMIC HEADER A: WEIGHT OR DISTANCE */}
                <div className="col-span-2 text-center flex flex-col items-center justify-center">
                  {showWeight ? 'Weight (lbs)' : showDist ? (
                    <button
                      onClick={() => setUseMiles(!useMiles)}
                      className="text-xs font-bold uppercase tracking-wider bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700 transition text-zinc-400 hover:text-white"
                    >
                      Distance ({useMiles ? 'Miles' : 'Meters'}) ⇄
                    </button>
                  ) : ''}
                </div>

                <div className="col-span-2 text-center">{isCalories ? 'Calories' : isWatts ? 'Watts' : showReps ? 'Reps' : showTime ? 'Time (mins)' : ''}</div>
                <div className="col-span-1 flex justify-end">
                  {sets.length > 1 && (
                    <button
                      onClick={() => {
                        const lastSet = sets[sets.length - 1];
                        setSets([...sets, { ...lastSet }]);
                      }}
                      className="text-xs text-zinc-500 hover:text-orange-500 font-bold uppercase tracking-wider transition-colors"
                      title="Copy last set"
                    >
                      Copy ↓
                    </button>
                  )}
                </div>
              </div>

              {sets.map((set, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
                  <div className="col-span-1 text-center font-mono font-bold text-zinc-600">#{i + 1}</div>

                  {/* INPUT 1: WEIGHT / DISTANCE */}
                  <div className="col-span-2">
                    {(showWeight || showDist) ? (
                      <input
                        type="number"
                        // Logic: If Distance & Miles, convert Meters->Miles for display. Else show raw.
                        value={
                          showDist
                            ? (set.distance ? (useMiles ? parseFloat((set.distance / 1609.34).toFixed(2)) : set.distance) : '')
                            : (set.weight || '')
                        }
                        placeholder={showDist ? (useMiles ? "Miles" : "Meters") : "e.g. 225"}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (showDist) {
                            // Logic: If Miles, convert Miles->Meters for storage.
                            if (isNaN(val)) {
                              updateSet(i, 'distance', 0);
                            } else {
                              const meters = useMiles ? val * 1609.34 : val;
                              updateSet(i, 'distance', meters);
                            }
                          } else {
                            updateSet(i, 'weight', isNaN(val) ? 0 : val);
                          }
                        }}
                        className="w-full bg-black border border-zinc-700 rounded p-2 text-center text-white font-bold focus:border-orange-500 outline-none"
                      />
                    ) : <div className="w-full h-full bg-zinc-900/30 rounded border border-transparent"></div>}
                  </div>

                  {/* INPUT 2: REPS / TIME / CALS / WATTS */}
                  <div className="col-span-2">
                    {showTime ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={set.duration ? Math.floor(set.duration) : ''}
                            placeholder="Min"
                            onChange={(e) => {
                              const newMins = parseFloat(e.target.value) || 0;
                              const currentSecs = Math.round(((set.duration || 0) - Math.floor(set.duration || 0)) * 60);
                              updateSet(i, 'duration', newMins + (currentSecs / 60));
                            }}
                            className="w-full bg-black border border-zinc-700 rounded p-2 text-center text-white font-bold focus:border-orange-500 outline-none"
                          />
                          <span className="absolute -bottom-3 left-0 right-0 text-[8px] text-zinc-600 font-bold uppercase text-center">Mins</span>
                        </div>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={set.duration ? Math.round(((set.duration - Math.floor(set.duration)) * 60)) || '' : ''}
                            placeholder="Sec"
                            onChange={(e) => {
                              const newSecs = parseFloat(e.target.value) || 0;
                              const currentMins = Math.floor(set.duration || 0);
                              updateSet(i, 'duration', currentMins + (newSecs / 60));
                            }}
                            className="w-full bg-black border border-zinc-700 rounded p-2 text-center text-white font-bold focus:border-orange-500 outline-none"
                          />
                          <span className="absolute -bottom-3 left-0 right-0 text-[8px] text-zinc-600 font-bold uppercase text-center">Secs</span>
                        </div>
                      </div>
                    ) : (showReps || isCalories || isWatts) ? (
                      <input
                        type="number"
                        value={showTime ? (set.duration || '') : (set.reps || '')}
                        placeholder={isCalories ? "Cals" : isWatts ? "Watts" : "e.g. 8"}
                        onChange={(e) => updateSet(i, showTime ? 'duration' : 'reps', parseFloat(e.target.value))}
                        className="w-full bg-black border border-zinc-700 rounded p-2 text-center text-white font-bold focus:border-orange-500 outline-none"
                      />
                    ) : <div className="w-full h-full bg-zinc-900/30 rounded border border-transparent"></div>}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {sets.length > 1 && (
                      <button onClick={() => removeSet(i)} className="text-zinc-600 hover:text-red-500 transition p-2">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ACTION: ADD TO QUEUE */}
            <div className="flex gap-4">
              <button onClick={addSet} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 rounded-lg text-sm uppercase tracking-wide transition border border-zinc-600">
                + Set
              </button>
              <button onClick={handleAddExercise} className="flex-[2] bg-zinc-100 hover:bg-white text-black font-black py-3 rounded-lg text-sm uppercase tracking-wide transition shadow-lg hover:scale-105">
                Add to Session ⬇
              </button>
            </div>
          </div>

          {/* 4. SESSION SUMMARY (THE CART) */}
          {sessionQueue.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black italic text-zinc-400 uppercase tracking-tighter">Current Session</h3>
                <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded font-bold">{sessionQueue.length} Exercises</span>
              </div>

              <div className="space-y-4 mb-8">
                {sessionQueue.map((item) => (
                  <div key={item.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-1">
                        {item.sets.length} Sets • {item.sets.reduce((acc, s) => acc + (s.reps || 0), 0)} Total Reps
                      </div>
                    </div>
                    <button onClick={() => removeQueuedItem(item.id)} className="text-zinc-600 hover:text-red-500 transition p-2">
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinishWorkout}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black py-4 rounded-xl text-lg uppercase tracking-widest shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-[1.01]"
              >
                {isSubmitting ? 'Saving Workout...' : 'Finish & Save Workout'}
              </button>
            </div>
          )}
        </>
      )}

      {/* 5. RANK CALCULATOR (Always Visible, No Banner) */}
      <div className="animate-fade-in-up pt-8 border-t border-zinc-800">
        <h2 className="text-2xl font-black italic text-zinc-500 uppercase tracking-tighter mb-6 text-center">Power Level Calculator</h2>
        <Calculator
          userId={userId}
          bodyweight={bodyweight}
          sex={sex}
          age={age}
          exercises={catalog}
          onCalculate={() => onLogComplete && onLogComplete()}
          hideBanner={true}
        />
      </div>

      {/* 6. HISTORY FEED - ALWAYS VISIBLE (or pushed down by success card) */}
      <HistoryFeed
        history={history}
        catalog={catalog}
        userId={userId}
        onRefresh={() => { }} // Server Action revalidates automatically
      />

      {/* 🟢 EXERCISE HISTORY MODAL */}
      {showHistoryModal && currentExercise && (
        <ExerciseHistoryModal
          exercise={currentExercise}
          history={history}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}

// 🟢 NEW: History Helper Component (Inline)
function HistoryFeed({ history, catalog, userId, onRefresh }: {
  history: HistoryItem[],
  catalog: CatalogItem[],
  userId: string,
  onRefresh: () => void
}) {
  const toast = useToast();
  // Changed from deletingId to itemToDelete to support Custom Modal
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);

  // Group by Date (Local Time)
  const grouped = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {};
    history.forEach(item => {
      // 🟢 FIX: Derive date locally to match user timezone, ignoring server UTC date
      const localDate = new Date(item.timestamp * 1000).toLocaleDateString('en-CA'); // YYYY-MM-DD

      if (!groups[localDate]) groups[localDate] = [];
      groups[localDate].push(item);
    });
    return groups;
  }, [history]);

  const requestDelete = (item: HistoryItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.timestamp) return;

    try {
      await deleteHistoryItemAction(userId, itemToDelete.timestamp);
      toast.success("Activity deleted.");
      onRefresh();
    } catch (e) {
      console.error("Delete failed", e);
      toast.error("Failed to delete activity.");
    } finally {
      setItemToDelete(null);
    }
  };

  if (history.length === 0) return null;

  return (
    <>
      <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl animate-fade-in-up mt-8">
        <h3 className="text-xl font-black italic text-zinc-500 uppercase tracking-tighter mb-4">Recent Activity</h3>

        <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0])) // 🟢 FIX: Sort by Date Descending
            .slice(0, 7)
            .map(([date, items]) => (
              <div key={date} className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl shadow-sm">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  {date}
                </div>

                <div className="space-y-2">
                  {items.map((item) => {
                    const exName = catalog.find(c => c.id === item.exercise_id)?.name || item.rank_name || item.exercise_id.replace(/_/g, ' ');
                    const isHabit = item.exercise_id.startsWith('habit_');
                    const isDeleting = itemToDelete?.timestamp === item.timestamp;

                    return (
                      <div key={item.timestamp} className={`flex justify-between items-center text-sm p-2 hover:bg-zinc-900 rounded-lg transition-colors group ${isDeleting ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-base group-hover:scale-110 transition-transform">{isHabit ? '🔹' : '🏋️‍♂️'}</span>
                          <div>
                            <div className="font-bold text-zinc-300 capitalize text-xs md:text-sm leading-tight">{exName}</div>
                            <div className="text-xs md:text-xs text-zinc-500 font-mono">
                              {item.value}
                              {item.description && <span className="text-zinc-600"> • {item.description}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {item.xp !== undefined && item.xp > 0 && (
                            <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">+{item.xp} XP</div>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => requestDelete(item)}
                            disabled={!!itemToDelete}
                            className="text-zinc-600 hover:text-red-500 transition px-3 py-2"
                            title="Delete Activity"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Activity?"
        message="Are you sure you want to delete this activity? This will remove the XP earned and cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </>
  );
}