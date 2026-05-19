'use client';

import { useState, useEffect, useMemo } from 'react';
import { getToday } from '@/utils/date';
import { getActiveWorkout, getWorkoutHistory, getWeeklySchedule, getHistory, getTrainingCatalog, getProfile } from '@/services/api';
import { logWorkoutBlockAction, logTrainingAction } from '@/app/actions';
import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import type { HistoryItem, CatalogItem } from '@/types';

interface UseWorkoutSessionProps {
  userId: string;
  onLogComplete: () => void;
  initialDate?: string | null;
}

export function useWorkoutSession({ userId, onLogComplete, initialDate }: UseWorkoutSessionProps) {
  const [blockIndex, setBlockIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [workoutData, setWorkoutData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId] = useState(() => uuidv4());

  const [viewMode, setViewMode] = useState<'HUB' | 'WORKOUT'>('HUB');
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);

  const [showLibrary, setShowLibrary] = useState(false);
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  const [fullHistory, setFullHistory] = useState<HistoryItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [userProfile, setUserProfile] = useState<{ bodyweight: number; sex: string } | null>(null);

  const [blockResults, setBlockResults] = useState<any[] | null>(null);
  const [showBlockComplete, setShowBlockComplete] = useState(false);
  const [sectionCompleteIdx, setSectionCompleteIdx] = useState<number | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [engineChoice, setEngineChoice] = useState<Record<number, 'hiit' | 'zone2' | null>>({});

  const [swapTarget, setSwapTarget] = useState<{ blockIdx: number; exIdx: number; name: string; swapGroup: string } | null>(null);
  const [exerciseSwaps, setExerciseSwaps] = useState<Record<string, { name: string; catalogItem: CatalogItem }>>({});

  const [briefingData, setBriefingData] = useState<any[] | null>(null);
  const [briefingDate, setBriefingDate] = useState<string | null>(null);

  const [didHiitYesterday, setDidHiitYesterday] = useState(false);

  const progressKey = `workout_progress_${selectedDate || getToday()}`;
  const currentBlock = workoutData[blockIndex];

  // --- Effects ---

  // Persist active workout banner indicator
  useEffect(() => {
    if (isComplete) {
      localStorage.removeItem('active_workout');
    } else if (workoutData.length > 0) {
      localStorage.setItem('active_workout', JSON.stringify({ path: window.location.pathname, date: selectedDate || getToday() }));
    }
  }, [workoutData, isComplete, selectedDate]);

  // Persist workout progress
  useEffect(() => {
    if (completedIndices.length > 0 || skippedIndices.length > 0 || blockIndex > 0) {
      localStorage.setItem(progressKey, JSON.stringify({ completedIndices, skippedIndices, blockIndex, viewMode, engineChoice, workoutData }));
    }
  }, [completedIndices, skippedIndices, blockIndex, viewMode, engineChoice, workoutData, progressKey]);

  // Restore progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(progressKey);
      if (saved) {
        const { completedIndices: ci, skippedIndices: si, blockIndex: bi, engineChoice: ec, workoutData: wd } = JSON.parse(saved);
        if (ci?.length) setCompletedIndices(prev => [...new Set([...prev, ...ci])]);
        if (si?.length) setSkippedIndices(prev => [...new Set([...prev, ...si])]);
        if (bi > 0) setBlockIndex(bi);
        if (ec) setEngineChoice(ec);
        if (wd?.length) setWorkoutData(wd);
      }
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

  // HIIT vs Zone 2 check
  useEffect(() => {
    if (!userId) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toLocaleDateString('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    const sb = createClient();
    sb.from('workouts').select('id').eq('user_id', userId).eq('date', yStr)
      .like('exercise_id', 'block_%Tread%').limit(1)
      .then(({ data }: any) => { if (data?.length) setDidHiitYesterday(true); });
  }, [userId]);

  // Fetch on mount
  useEffect(() => {
    loadWorkout(initialDate || undefined);
    loadHistory();
    loadSchedule();
  }, [initialDate]);

  // Restore completion state from today's logged workouts
  useEffect(() => {
    if (!workoutData.length || !fullHistory.length) return;
    const today = getToday();
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
    if (restored.length > 0) setCompletedIndices(prev => [...new Set([...prev, ...restored])]);
  }, [workoutData, fullHistory]);

  // --- Computed ---

  const engineRecommendation = useMemo((): 'hiit' | 'zone2' => {
    if (didHiitYesterday) return 'zone2';
    const day = new Date().getDay();
    if (day === 1 || day === 4) return 'hiit';
    return 'zone2';
  }, [didHiitYesterday]);

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
        name, firstIndex, count: sectionBlocks.length, indices, isDone,
        preview: sectionBlocks.flatMap(b => {
          if (b.exercises && Array.isArray(b.exercises)) return b.exercises.map((e: any) => e.name || e.text || '');
          if (b.intervals && Array.isArray(b.intervals)) return ['🏃 Treadmill'];
          return [b.name || ''];
        }).filter((n: string, i: number, arr: string[]) => n && arr.indexOf(n) === i).slice(0, 4)
      };
    });
    return mapped.sort((a, b) => (SECTION_ORDER[a.name] ?? 99) - (SECTION_ORDER[b.name] ?? 99));
  }, [workoutData, completedIndices]);

  // --- Loaders ---

  const loadSchedule = async () => {
    try { const data = await getWeeklySchedule(); setWeeklySchedule(data || []); } catch {}
  };

  const loadWorkout = async (date?: string) => {
    setIsLoading(true);
    try {
      const hasSavedProgress = localStorage.getItem(progressKey);
      if (hasSavedProgress) {
        try {
          const saved = JSON.parse(hasSavedProgress);
          if (saved.workoutData?.length > 0 && saved.workoutData[0]?.type) { setIsLoading(false); return; }
        } catch {}
        localStorage.removeItem(progressKey);
      }

      const data = await getActiveWorkout(date);
      setWorkoutData(data || []);
      setSelectedDate(date || null);

      let dbCompleted: number[] = [];
      try {
        if (data?.length && userId) {
          const supabase = createClient();
          const todayStr = (date || getToday());
          const { data: todayWorkouts } = await supabase.from('workouts').select('exercise_id').eq('user_id', userId).eq('date', todayStr);
          if (todayWorkouts?.length) {
            const loggedIds = new Set(todayWorkouts.map((w: any) => w.exercise_id));
            data.forEach((block: any, idx: number) => {
              if (block.exercise_id && loggedIds.has(block.exercise_id)) dbCompleted.push(idx);
              if (block.exercises) {
                const allLogged = block.exercises.every((ex: any) => {
                  const exId = ex.exercise_id || ex.name?.toLowerCase().replace(/\s+/g, '_');
                  return exId && loggedIds.has(exId);
                });
                if (allLogged) dbCompleted.push(idx);
              }
            });
          }
        }
      } catch {}

      setBlockIndex(0);
      setCompletedIndices(dbCompleted);
      setSkippedIndices([]);

      const hasActiveTimer = Object.keys(localStorage).some(k => k.startsWith('active_timer_'));
      if (dbCompleted.length > 0) {
        localStorage.removeItem(progressKey);
        setViewMode('HUB');
      } else if (!hasSavedProgress && !hasActiveTimer) {
        const uniqueSections = new Set((data || []).map((b: any) => b.section || 'General'));
        setViewMode(uniqueSections.size > 1 ? 'HUB' : 'WORKOUT');
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const loadHistory = async () => {
    try {
      const dates = await getWorkoutHistory();
      setWorkoutDates(dates);
      const h = await getHistory(userId);
      setFullHistory(h || []);
      const c = await getTrainingCatalog();
      setCatalog(c || []);
      const p = await getProfile(userId);
      if (p) setUserProfile({ bodyweight: p.bodyweight || 150, sex: p.sex || 'M' });
    } catch {}
  };

  // --- Handlers ---

  const handlePreviewWorkout = async (date?: string) => {
    setShowLibrary(false);
    setIsLoading(true);
    try {
      const data = await getActiveWorkout(date);
      setBriefingData(data || []);
      setBriefingDate(date || "Today");
    } catch {} finally { setIsLoading(false); }
  };

  const handleStartBriefing = () => {
    if (briefingData) {
      setWorkoutData(briefingData);
      setSelectedDate(briefingDate === "Today" ? null : briefingDate);
      setBlockIndex(0);
      setIsComplete(false);
      setBriefingData(null);
    }
  };

  const findCatalogMatch = (name: string) => {
    const n = name.toLowerCase().trim();
    let match = catalog.find((c: any) => c.name.toLowerCase() === n);
    if (match) return match;
    match = catalog.find((c: any) => c.name.toLowerCase().includes(n));
    if (match) return match;
    match = catalog.find((c: any) => n.includes(c.name.toLowerCase()));
    return match || null;
  };

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
                const result = await logTrainingAction(userId, catalogItem.id, userProfile.bodyweight, userProfile.sex, ex.sets, sessionId);
                const hasStandards = !!catalogItem.standards?.brackets;
                const isPR = checkPR(catalogItem.id, result.raw_value || 0);
                results.push({ name: ex.name, ...result, hasStandards, isPR });
              } catch (e) {
                results.push({ name: ex.name, xp_earned: 0, level: 0, rank_name: null, hasStandards: false, isPR: false });
              }
            } else {
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
          await logWorkoutBlockAction(userId, currentBlock.name, distance ? `${distance} mi` : (currentBlock.description || `${currentBlock.sets || 1} Sets`), currentBlock.xp_value, currentBlock.type === 'card' || currentBlock.name.includes('Tread') ? 'Cardio' : 'Strength', exercisesData, sessionId);
          if (onLogComplete) onLogComplete();
          const displayXp = timerXp || currentBlock.xp_value;
          setBlockResults([{ name: currentBlock.name, xp_earned: displayXp, level: 0, rank_name: null, hasStandards: false, isPR: false, value: distance ? `${distance} mi` : 'Complete' }]);
          setShowBlockComplete(true);
          const newCompleted = [...completedIndices, blockIndex];
          setCompletedIndices(newCompleted);
          if (newCompleted.length === workoutData.length) { setIsComplete(true); localStorage.removeItem(progressKey); }
          return;
        }
      } catch (e) { console.error("Failed to log block:", e); }
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
        const sectionIndices = workoutData.map((b, i) => ({ section: b.section || 'General', i })).filter(b => b.section === currentSection).map(b => b.i);
        const allDone = sectionIndices.every(i => completedIndices.includes(i) || skippedIndices.includes(i));
        if (allDone) setSectionCompleteIdx(sections.findIndex(s => s.indices.includes(blockIndex)));
        setViewMode('HUB');
      }
    } else {
      const currentSection = currentBlock.section || 'General';
      const sectionIndices = workoutData.map((b, i) => ({ section: b.section || 'General', i })).filter(b => b.section === currentSection).map(b => b.i);
      const allDone = sectionIndices.every(i => completedIndices.includes(i) || skippedIndices.includes(i));
      if (allDone) setSectionCompleteIdx(sections.findIndex(s => s.indices.includes(blockIndex)));
      setViewMode('HUB');
    }
  };

  const handleContinueAfterBlock = () => { setBlockResults(null); setShowBlockComplete(false); advanceToNextBlock(); };
  const handleStopAfterBlock = () => { setBlockResults(null); setShowBlockComplete(false); setViewMode('HUB'); };

  const handleIntervalComplete = async (intervalData: any, xpShare: number) => {
    if (!userId || !currentBlock) return;
    try {
      await logWorkoutBlockAction(userId, `${currentBlock.name} - ${intervalData.zone || "Interval"}`, intervalData.text || intervalData.raw_text || "Interval", xpShare, 'Cardio', undefined, sessionId);
      if (onLogComplete) onLogComplete();
    } catch {}
  };

  const generateZone2Block = (minutes: number): any => ({
    name: `Zone 2 Steady State (${minutes} min)`,
    type: 'timer',
    section: 'Engine',
    xp_value: Math.floor(minutes * 6),
    intervals: Array.from({ length: Math.ceil(minutes / 10) }, (_, i) => {
      const remaining = minutes - i * 10;
      const chunkMin = Math.min(10, remaining);
      return { type: 'interval', seconds: chunkMin * 60, zone: 'Comfortable', color: 'bg-green-500', note: 'Easy pace — conversational', raw_text: `${chunkMin} min Comfortable` };
    }),
  });

  return {
    // State
    blockIndex, setBlockIndex,
    isComplete, setIsComplete,
    workoutData, setWorkoutData,
    isLoading,
    sessionId,
    viewMode, setViewMode,
    completedIndices,
    skippedIndices,
    showLibrary, setShowLibrary,
    workoutDates,
    selectedDate,
    weeklySchedule,
    activeTab, setActiveTab,
    fullHistory,
    catalog,
    userProfile,
    blockResults,
    showBlockComplete,
    sectionCompleteIdx, setSectionCompleteIdx,
    showEndConfirm, setShowEndConfirm,
    engineChoice, setEngineChoice,
    swapTarget, setSwapTarget,
    exerciseSwaps, setExerciseSwaps,
    briefingData, setBriefingData,
    briefingDate,
    progressKey,
    currentBlock,

    // Computed
    sections,
    engineRecommendation,

    // Handlers
    handleBlockComplete,
    handleContinueAfterBlock,
    handleStopAfterBlock,
    handlePreviewWorkout,
    handleStartBriefing,
    handleIntervalComplete,
    generateZone2Block,
  };
}
