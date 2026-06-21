"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import { getThemeIdentity } from '@/data/v2themes';
import { PixelBar } from './PixelBox';
import { getActiveWorkout, getTrainingCatalog, getProfile } from '@/services/api';
import { getHistory } from '@/services/api';
import { logTrainingAction } from '@/app/actions';
import { v4 as uuidv4 } from 'uuid';
import type { CatalogItem, HistoryItem } from '@/types';

interface BattleViewProps {
  userId: string;
  onComplete: () => void;
  flexibleMode?: boolean;
  filter?: string;
  singleExercise?: string;
  overrideDay?: string;
}

interface BattleCard {
  id: string;
  name: string;
  exerciseId: string;
  type: 'lifting' | 'duration' | 'cardio';
  totalSets: number;
  completedSets: number;
  targetReps: number;
  targetSeconds?: number;
  intervals?: { zone: string; seconds: number; color: string; note?: string }[];
  exercises?: { name: string; exerciseId: string; targetReps: number }[];
  defeated: boolean;
  poofing: boolean;
  section?: string;
  catalogItem?: CatalogItem;
  lastWeight?: number;
  bestValue?: number;
  lastThree?: number[];
  currentLevel?: number;
  threatLevel?: 'guardian' | 'trickster' | 'titan' | 'spark';
}

interface SetLog {
  weight: number;
  reps: number;
  duration?: number;
}

interface VictoryData {
  totalXp: number;
  exercisesDefeated: number;
  duration: string;
  rankUps: { name: string; from: number; to: number }[];
}

export default function BattleView({ userId, onComplete, flexibleMode, filter, singleExercise, overrideDay }: BattleViewProps) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const carouselRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(uuidv4());
  const startTime = useRef(Date.now());

  const [cards, setCards] = useState<BattleCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [victory, setVictory] = useState<VictoryData | null>(null);

  // Per-card input state
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [restSeconds, setRestSeconds] = useState(0);
  const [restMax, setRestMax] = useState(60);
  const [isResting, setIsResting] = useState(false);
  const [lastAttack, setLastAttack] = useState<{ cardId: string; exerciseId: string; weight: string; reps: string; subIdx?: number; isSuperset?: boolean } | null>(null);
  const [defeatedOverlay, setDefeatedOverlay] = useState<{ name: string; xp: number; lastThree: number[]; isPr: boolean } | null>(null);
  const [prFlash, setPrFlash] = useState(false);
  const [userBodyweight, setUserBodyweight] = useState(180);
  const [userSex, setUserSex] = useState('male');
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  const BATTLE_STATE_KEY = 'battle_session';

  // Persist battle state on every card update
  useEffect(() => {
    if (cards.length === 0) return;
    const state = {
      date: new Date().toLocaleDateString('en-CA'),
      sessionId: sessionId.current,
      startTime: startTime.current,
      cards: cards.map(c => ({ id: c.id, exerciseId: c.exerciseId, name: c.name, completedSets: c.completedSets, totalSets: c.totalSets, defeated: c.defeated })),
    };
    localStorage.setItem(BATTLE_STATE_KEY, JSON.stringify(state));
  }, [cards]);

  // Clear on victory
  useEffect(() => {
    if (victory) localStorage.removeItem(BATTLE_STATE_KEY);
  }, [victory]);

  // Drain any pending sets from failed network attempts
  useEffect(() => {
    (async () => {
      const pending = JSON.parse(localStorage.getItem('pending_sets') || '[]');
      if (!pending.length) return;
      const remaining: any[] = [];
      for (const p of pending) {
        try {
          await logTrainingAction(p.userId, p.exerciseId, p.bodyweight, p.sex, p.sets, p.sessionId, Math.floor(p.ts / 1000));
        } catch { remaining.push(p); }
      }
      if (remaining.length) localStorage.setItem('pending_sets', JSON.stringify(remaining));
      else localStorage.removeItem('pending_sets');
    })();
  }, []);

  // Load workout data
  useEffect(() => {
    // Clear stale battle session when entering single-exercise mode
    if (singleExercise) {
      localStorage.removeItem(BATTLE_STATE_KEY);
    }

    (async () => {
      try {
        const localDay = overrideDay || new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const [workout, catalog, profile, history] = await Promise.all([
          singleExercise ? Promise.resolve([]) : getActiveWorkout(localDay),
          getTrainingCatalog(),
          getProfile(userId),
          getHistory(userId),
        ]);

        const blocks: any[] = workout || [];
        console.log('[BattleView] Raw blocks from API:', blocks.map((b: any) => ({ type: b.type, name: b.name, section: b.section })));
        const catalogMap = new Map((catalog || []).map((c: CatalogItem) => [c.id, c]));
        const historyArr = (history || []) as HistoryItem[];

        if (profile) {
          setUserBodyweight(profile.bodyweight || 180);
          setUserSex(profile.sex || 'male');
        }
        setCatalogItems(catalog || []);

        const battleCards: BattleCard[] = blocks
          .filter((b: any) => b.type === 'checklist_exercise' || b.type === 'superset' || b.type === 'timer' || b.type === 'list')
          .flatMap((b: any) => {
            const exId = b.exercise_id || '';
            const catItem = catalogMap.get(exId);

            // Timer blocks
            if (b.type === 'timer') {
              // Mobility circuits: split into individual exercise cards
              if (b._isMobility && b.intervals?.length > 0) {
                return b.intervals.map((interval: any) => ({
                  id: uuidv4(),
                  name: interval.zone || interval.raw_text || 'Hold',
                  exerciseId: (interval.zone || '').toLowerCase().replace(/\s+/g, '_'),
                  type: 'duration' as const,
                  totalSets: 1,
                  completedSets: 0,
                  targetReps: 0,
                  targetSeconds: interval.seconds || 30,
                  defeated: false,
                  poofing: false,
                  section: b.section,
                  catalogItem: undefined,
                  lastWeight: 0,
                }));
              }
              // Treadmill / cardio: ONE card with intervals array
              return [{
                id: uuidv4(),
                name: b.name || 'Cardio Block',
                exerciseId: 'cardio_block',
                type: 'cardio' as const,
                totalSets: 1,
                completedSets: 0,
                targetReps: 0,
                targetSeconds: (b.intervals || []).reduce((s: number, i: any) => s + (i.seconds || 0), 0),
                intervals: (b.intervals || []).map((i: any) => ({ zone: i.zone || 'Go', seconds: i.seconds || 30, color: i.color || 'bg-green-500', note: i.note || null })),
                defeated: false,
                poofing: false,
                section: b.section,
                catalogItem: undefined,
                lastWeight: 0,
              }];
            }

            // List blocks (checklists like warmup/cooldown routines)
            if (b.type === 'list') {
              return [{
                id: uuidv4(),
                name: b.name || 'Checklist',
                exerciseId: exId || 'checklist',
                type: 'duration' as const,
                totalSets: 1,
                completedSets: 0,
                targetReps: 0,
                targetSeconds: (b.items?.length || 3) * 30,
                defeated: false,
                poofing: false,
                section: b.section,
                catalogItem: catItem,
                lastWeight: 0,
              }];
            }

            const isDuration = (typeof b.reps_per_set === 'string' && b.reps_per_set.includes('s')) || !!b.target_duration_seconds;

            // Supersets: one card with exercises array
            if (b.type === 'superset' && b.exercises?.length) {
              return [{
                id: uuidv4(),
                name: b.name || 'Superset',
                exerciseId: b.exercises[0]?.exercise_id || '',
                type: 'lifting' as const,
                totalSets: b.sets || 3,
                completedSets: 0,
                targetReps: parseInt(String(b.exercises[0]?.reps), 10) || 8,
                defeated: false,
                poofing: false,
                section: b.section,
                catalogItem: catItem,
                lastWeight: 0,
                exercises: b.exercises.map((ex: any) => ({
                  name: ex.name || ex.exercise_id?.replace(/_/g, ' ') || 'Exercise',
                  exerciseId: ex.exercise_id || '',
                  targetReps: parseInt(String(ex.reps), 10) || 8,
                })),
              }];
            }

            const lastLog = historyArr
              .filter((h: any) => (h.exercise_id || '').toLowerCase() === exId.toLowerCase())
              .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))[0];
            const lastWeight = lastLog?.data?.[0]?.weight || 0;
            const currentLevel = Math.max(...historyArr.filter((h: any) => (h.exercise_id || '').toLowerCase() === exId.toLowerCase()).map((h: any) => h.level || 0), 0);
            const exHistory = historyArr.filter((h: any) => (h.exercise_id || '').toLowerCase() === exId.toLowerCase()).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
            const bestValue = Math.max(...exHistory.map((h: any) => h.raw_value || 0), 0);
            const lastThree = exHistory.slice(0, 3).map((h: any) => h.raw_value || 0).reverse();

            return [{
              id: uuidv4(),
              name: b.name || exId.replace(/_/g, ' '),
              exerciseId: exId,
              type: isDuration ? 'duration' : 'lifting',
              totalSets: b.sets || b.target_sets || 3,
              completedSets: 0,
              targetReps: isDuration ? 0 : (parseInt(String(b.reps_per_set), 10) || parseInt(String(b.target_reps), 10) || 8),
              targetSeconds: isDuration ? (b.target_duration_seconds || parseInt(String(b.reps_per_set), 10) || 30) : undefined,
              defeated: false,
              poofing: false,
              section: b.section,
              catalogItem: catItem,
              lastWeight,
              currentLevel,
              bestValue,
              lastThree,
            }];
          });

        // Filter by session type if specified
        let filteredCards = battleCards;
        if (filter === 'strength') {
          filteredCards = battleCards.filter(c => c.type === 'lifting');
        } else if (filter === 'cardio') {
          filteredCards = battleCards.filter(c => c.type === 'cardio' || c.exerciseId === 'cardio_block');
        } else if (filter === 'core') {
          const coreKeywords = ['plank', 'crunch', 'sit_up', 'v_up', 'flutter', 'ab', 'core', 'dead_bug', 'russian_twist', 'leg_raise'];
          filteredCards = battleCards.filter(c => coreKeywords.some(k => c.exerciseId.includes(k) || c.name.toLowerCase().includes(k)));
        }

        // Assign threat levels (combat mode only)
        const threats: ('guardian' | 'trickster' | 'titan' | 'spark')[] = ['guardian', 'trickster', 'titan', 'spark'];
        const cardsWithThreats = filteredCards.map(c => ({
          ...c,
          threatLevel: currentTheme !== 'athlete' ? threats[Math.floor(Math.random() * threats.length)] : undefined,
        }));
        setCards(cardsWithThreats);

        // Generate session bounties (3 random micro-achievements)
        if (currentTheme !== 'athlete' && battleCards.length > 0) {
          const bountyPool = [
            { id: 'perfect', label: '⚡ Land a Perfect Strike' },
            { id: 'noskip', label: '⏱ Complete without skipping rest' },
            { id: 'allsets', label: '💪 Finish every exercise' },
            { id: 'fast', label: '⚡ Defeat an enemy in under 3 min' },
          ];
          const shuffled = bountyPool.sort(() => Math.random() - 0.5).slice(0, 3);
          setBounties(shuffled.map(b => ({ ...b, done: false })));
        }
        
        // Restore saved session (resume battle) — skip for single exercise mode
        try {
          const saved = !singleExercise ? localStorage.getItem('battle_session') : null;
          if (saved) {
            const state = JSON.parse(saved);
            if (state.date === new Date().toLocaleDateString('en-CA') && state.cards?.length) {
              const savedMap = new Map(state.cards.map((c: any) => [c.exerciseId, c] as [string, any]));
              const restored = battleCards.map(card => {
                const prev: any = savedMap.get(card.exerciseId);
                if (prev && prev.defeated) return { ...card, completedSets: prev.completedSets, defeated: true, poofing: false };
                if (prev && prev.completedSets > 0) return { ...card, completedSets: prev.completedSets };
                return card;
              });
              setCards(restored);
              sessionId.current = state.sessionId || sessionId.current;
              startTime.current = state.startTime || startTime.current;
              // Jump to first alive card
              const firstAlive = restored.findIndex(c => !c.defeated);
              if (firstAlive >= 0) {
                const aliveIdx = restored.filter(c => !c.defeated).indexOf(restored[firstAlive]);
                setActiveIndex(aliveIdx >= 0 ? 0 : 0);
              }
            }
          }
        } catch {}

        if (battleCards.length > 0 && battleCards[0].lastWeight) {
          setWeight(String(battleCards[0].lastWeight));
          setReps(String(battleCards[0].targetReps));
        }

        // Flexible mode: if no scheduled workout, create cards from catalog
        if (battleCards.length === 0 && (flexibleMode || singleExercise) && catalog?.length) {
          let items = catalog;
          if (singleExercise) {
            items = catalog.filter((c: CatalogItem) => c.id === singleExercise);
            // Fallback: try partial match on ID or name
            if (!items.length) items = catalog.filter((c: CatalogItem) => c.id.includes(singleExercise) || c.name?.toLowerCase().includes(singleExercise.replace(/_/g, ' ')));
            // Last resort: create a card from the exercise ID itself
            if (!items.length) items = [{ id: singleExercise, name: singleExercise.replace(/_/g, ' '), category: '', standards: null } as any];
          } else if (filter === 'cardio') {
            items = catalog.filter((c: CatalogItem) => (c.category || '').toLowerCase().includes('cardio') || (c.category || '').toLowerCase().includes('endurance')).slice(0, 8);
          } else if (filter === 'strength') {
            items = catalog.filter((c: CatalogItem) => !((c.category || '').toLowerCase().includes('cardio'))).slice(0, 8);
          } else {
            items = catalog.slice(0, 8);
          }
          const flexCards: BattleCard[] = items.map((c: CatalogItem) => {
            const isHold = ['plank', 'dead_hang', 'l_sit', 'deep_squat_hold'].some(k => c.id.includes(k));
            const isRun = ['run_1_mile', 'run_400m', 'run_5k', 'run_2_mile'].some(k => c.id === k);
            return {
            id: uuidv4(),
            name: c.name || c.id.replace(/_/g, ' '),
            exerciseId: c.id,
            type: isHold ? 'duration' as const : 'lifting' as const,
            totalSets: (isHold || isRun) ? 1 : 3,
            completedSets: 0,
            targetReps: (isHold || isRun) ? 0 : 8,
            targetSeconds: isHold ? 60 : undefined,
            defeated: false,
            poofing: false,
            catalogItem: c,
            lastWeight: 0,
          }; });
          setCards(flexCards);
        }
      } catch {
        setCards([]);
      }
      setLoading(false);
    })();
  }, [userId]);

  // Rest timer
  useEffect(() => {
    if (!isResting || restSeconds <= 0) {
      if (isResting && restSeconds <= 0) setIsResting(false);
      return;
    }
    const t = setTimeout(() => setRestSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isResting, restSeconds]);

  // Scroll to active card
  const scrollToCard = useCallback((idx: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  // Handle snap scroll to detect active card
  const handleScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.children[0]?.clientWidth || 300;
    const gap = 12;
    const idx = Math.round(scrollLeft / (cardWidth + gap));
    const aliveCards = cards.filter(c => !c.defeated);
    if (idx !== activeIndex && idx < aliveCards.length) {
      setActiveIndex(idx);
      const card = aliveCards[idx];
      if (card) {
        setWeight(card.lastWeight ? String(card.lastWeight) : '');
        setReps(String(card.targetReps || ''));
        setIsResting(false);
        setRestSeconds(0);
      }
    }
  }, [cards, activeIndex]);

  // Track which sub-exercise we're on for supersets
  const [subExerciseIdx, setSubExerciseIdx] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [rankUpToast, setRankUpToast] = useState<{ name: string; level: number; rankName: string; nextThreshold?: string } | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [xpPop, setXpPop] = useState<number | null>(null);
  const [comboCount, setComboCount] = useState(0);
  const [perfectStrike, setPerfectStrike] = useState(false);
  const [restEvent, setRestEvent] = useState<string | null>(null);
  const [bounties, setBounties] = useState<{ id: string; label: string; done: boolean }[]>([]);
  const [bountyPop, setBountyPop] = useState<string | null>(null);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const showExerciseHistory = async (exerciseId: string) => {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const { data } = await supabase.from('workouts').select('date, sets, raw_value, level')
      .eq('user_id', userId).eq('exercise_id', exerciseId)
      .order('timestamp', { ascending: false }).limit(5);
    setHistoryData(data || []);
    setHistoryExercise(exerciseId);
  };

  const logAttack = async () => {
    const aliveCards = cards.filter(c => !c.defeated);
    const card = aliveCards[activeIndex];
    if (!card || isResting) return;

    // Haptic feedback
    import('@/utils/haptics').then(m => m.haptic('medium'));

    const w = Number(weight) || 0;
    const r = Number(reps) || 0;

    // Determine which exercise to log
    const isSuperset = card.exercises && card.exercises.length > 1;
    const exerciseId = isSuperset
      ? card.exercises![subExerciseIdx % card.exercises!.length].exerciseId
      : card.exerciseId;

    // Log to database (with retry on failure)
    const isRunExercise = ['run_1_mile', 'run_400m', 'run_5k', 'run_2_mile'].some(k => exerciseId === k || exerciseId.includes(k));
    const sets = isRunExercise ? [{ weight: 0, reps: 0, duration: (Number(weight) || 0) * 60 + (Number(reps) || 0) }] : [{ weight: w, reps: r }];
    try {
      const result: any = await logTrainingAction(
        userId,
        exerciseId,
        userBodyweight,
        userSex,
        sets,
        sessionId.current,
      );
      // Show rank-up celebration if level increased
      if (result?.level > 0 && result?.level > (result?.previous_level || 0)) {
        setRankUpToast({ name: card.name, level: result.level, rankName: result.rank_name || '', nextThreshold: result.next_threshold || '' });
        setTimeout(() => setRankUpToast(null), 3500);
      }
      // Track session XP + floating number
      if (result?.xp_earned > 0) {
        setSessionXp(prev => prev + result.xp_earned);
        setXpPop(result.xp_earned);
        setTimeout(() => setXpPop(null), 900);
      }
      // PR detection — compare raw weight to historical best
      if (w > 0 && w > (card.bestValue || 0)) {
        setPrFlash(true);
        setTimeout(() => setPrFlash(false), 1500);
        // Mark PR for defeat overlay
        if (card.completedSets + 1 >= card.totalSets) {
          setDefeatedOverlay(prev => prev ? { ...prev, isPr: true } : prev);
        }
      }
      // Perfect Strike (15% chance, 30% if beat last weight)
      if (currentTheme !== 'athlete') {
        const beatLastWeight = w > (card.lastWeight || 0);
        const critChance = beatLastWeight ? 0.3 : 0.15;
        if (Math.random() < critChance) {
          setPerfectStrike(true);
          setTimeout(() => setPerfectStrike(false), 1500);
          // Check bounty
          setBounties(prev => prev.map(b => b.id === 'perfect' && !b.done ? { ...b, done: true } : b));
        }
      }
    } catch {
      // Queue for retry on next open
      const pending = JSON.parse(localStorage.getItem('pending_sets') || '[]');
      pending.push({ userId, exerciseId, bodyweight: userBodyweight, sex: userSex, sets: [{ weight: w, reps: r }], sessionId: sessionId.current, ts: Date.now() });
      localStorage.setItem('pending_sets', JSON.stringify(pending));
    }

    // Track for undo
    setLastAttack({ cardId: card.id, exerciseId, weight: String(w), reps: String(r), subIdx: isSuperset ? subExerciseIdx : undefined, isSuperset: !!isSuperset });

    // Superset: advance to next sub-exercise, only count a "set" when all exercises in the superset are done
    if (isSuperset) {
      const nextSub = subExerciseIdx + 1;
      if (nextSub < card.exercises!.length) {
        // More exercises in this round — advance sub, no rest yet
        setSubExerciseIdx(nextSub);
        setReps(String(card.exercises![nextSub].targetReps || 8));
        return;
      }
      // All exercises done for this round — count as 1 set complete
      setSubExerciseIdx(0);
      setReps(String(card.exercises![0].targetReps || 8));
    }

    // Update card state (1 full set complete)
    const newCompleted = card.completedSets + 1;
    const isDefeated = newCompleted >= card.totalSets;

    if (isDefeated) {
      // Show defeat overlay — card marks defeated when user taps to continue
      setDefeatedOverlay({
        name: card.name,
        xp: sessionXp,
        lastThree: card.lastThree || [],
        isPr: false, // will be set by PR detection below
      });
    }

    setCards(prev => prev.map(c => {
      if (c.id !== card.id) return c;
      return { ...c, completedSets: newCompleted, defeated: isDefeated, poofing: isDefeated };
    }));

    // Start rest (if not final set) — 500ms reward delay first
    setComboCount(prev => {
      const next = prev + 1;
      if (next === 5) setBounties(b => b.map(x => x.id === 'combo5' && !x.done ? { ...x, done: true } : x));
      if (next === 10) setBounties(b => b.map(x => x.id === 'combo10' && !x.done ? { ...x, done: true } : x));
      return next;
    });
    if (newCompleted < card.totalSets) {
      const isCompound = ['squat', 'bench', 'deadlift', 'press', 'row'].some(n => card.name.toLowerCase().includes(n));
      const duration = isCompound ? 90 : 60;
      setRestMax(duration);
      setTimeout(() => {
        setRestSeconds(duration); setIsResting(true);
        // Rest mini-event (30% chance, combat mode only)
        if (currentTheme !== 'athlete' && Math.random() < 0.3) {
          const events = [
            `Think you can do that again?`,
            `Your best today: ${w} lbs × ${r} reps`,
            `${comboCount}x combo — keep it going`,
            `⚡ ${aliveCards.length - 1} enemies remain`,
            `You've earned ⚡${sessionXp} XP so far`,
            `Breathe. Then strike harder.`,
          ];
          setRestEvent(events[Math.floor(Math.random() * events.length)]);
        } else { setRestEvent(null); }
      }, 500);
    } else {
      // Card defeated — check if all done
      setTimeout(() => {
        setCards(prev => {
          const updated = prev.map(c => c.id === card.id ? { ...c, poofing: false } : c);
          const remaining = updated.filter(c => !c.defeated);
          if (remaining.length === 0) {
            const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
            const min = Math.floor(elapsed / 60);
            const sec = elapsed % 60;
            // Query actual XP from this session
            (async () => {
              try {
                const { createClient } = await import('@/utils/supabase/client');
                const supabase = createClient();
                const { data: sessionWorkouts } = await supabase.from('workouts').select('xp, level, exercise_id').eq('user_id', userId).eq('session_id', sessionId.current);
                const totalXp = (sessionWorkouts || []).reduce((sum: number, w: any) => sum + (w.xp || 0), 0);
                const rankUps = (sessionWorkouts || []).filter((w: any) => w.level > 0).reduce((acc: any[], w: any) => {
                  if (!acc.find((a: any) => a.name === w.exercise_id)) acc.push({ name: w.exercise_id.replace(/_/g, ' '), from: 0, to: w.level });
                  return acc;
                }, []);
                setVictory({ totalXp, exercisesDefeated: updated.length, duration: `${min}:${String(sec).padStart(2, '0')}`, rankUps });
              } catch {
                setVictory({ totalXp: updated.reduce((sum, c) => sum + c.completedSets * 50, 0), exercisesDefeated: updated.length, duration: `${min}:${String(sec).padStart(2, '0')}`, rankUps: [] });
              }
            })();
          } else {
            // Move to next alive card
            const newIdx = Math.min(activeIndex, remaining.length - 1);
            setActiveIndex(newIdx);
            const next = remaining[newIdx];
            if (next) {
              setWeight(next.lastWeight ? String(next.lastWeight) : '');
              setReps(String(next.targetReps || ''));
            }
          }
          return updated;
        });
      }, 600); // Wait for poof animation
    }
  };

  const logDurationAttack = async (seconds: number, targetCardId?: string) => {
    const aliveCards = cards.filter(c => !c.defeated);
    const card = targetCardId ? cards.find(c => c.id === targetCardId) : aliveCards[activeIndex];
    if (!card) return;

    try {
      await logTrainingAction(
        userId,
        card.exerciseId,
        userBodyweight,
        userSex,
        [{ weight: 0, reps: 0, duration: seconds }],
        sessionId.current,
      );
    } catch {
      const pending = JSON.parse(localStorage.getItem('pending_sets') || '[]');
      pending.push({ userId, exerciseId: card.exerciseId, bodyweight: userBodyweight, sex: userSex, sets: [{ weight: 0, reps: 0, duration: seconds }], sessionId: sessionId.current, ts: Date.now() });
      localStorage.setItem('pending_sets', JSON.stringify(pending));
    }

    setCards(prev => prev.map(c => {
      if (c.id !== card.id) return c;
      const newCompleted = c.completedSets + 1;
      return { ...c, completedSets: newCompleted, defeated: newCompleted >= c.totalSets, poofing: newCompleted >= c.totalSets };
    }));
  };

  const undoLastAttack = async () => {
    if (!lastAttack) return;
    const { cardId, exerciseId, weight: prevW, reps: prevR, isSuperset: wasSuperSet } = lastAttack;

    // Delete the most recent workout row for this exercise+session
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: rows } = await supabase.from('workouts')
        .select('id')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .eq('session_id', sessionId.current)
        .order('timestamp', { ascending: false })
        .limit(1);
      if (rows?.length) await supabase.from('workouts').delete().eq('id', rows[0].id);
    } catch {}

    // Decrement completedSets (un-defeat if needed)
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const newCompleted = Math.max(0, c.completedSets - 1);
      return { ...c, completedSets: newCompleted, defeated: false, poofing: false };
    }));

    // For supersets: reset subExerciseIdx to the last exercise in the round
    if (wasSuperSet) {
      const card = cards.find(c => c.id === cardId);
      const lastSubIdx = (card?.exercises?.length || 1) - 1;
      setSubExerciseIdx(lastSubIdx);
    }

    // Restore inputs and stop rest
    setWeight(prevW);
    setReps(prevR);
    setIsResting(false);
    setRestSeconds(0);
    setLastAttack(null);
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <p className={`text-[10px] ${colors.secondary} animate-pulse`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ENTERING BATTLE...
        </p>
      </div>
    );
  }

  if (victory) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center px-4 py-8">
        <p className={`text-[14px] ${colors.secondary} mb-4 tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {currentTheme !== 'athlete' ? '⚔ VICTORY ⚔' : '✓ WORKOUT COMPLETE'}
        </p>

        <div className={`w-full max-w-sm border-2 ${colors.primary} bg-zinc-900 p-5 space-y-4`} style={{ boxShadow: colors.glow }}>
          {/* Hero stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl text-white font-bold">{victory.totalXp}</p>
              <p className="text-[9px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>XP</p>
            </div>
            <div>
              <p className="text-xl text-white font-bold">{victory.exercisesDefeated}</p>
              <p className="text-[9px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{currentTheme !== 'athlete' ? 'DEFEATED' : 'DONE'}</p>
            </div>
            <div>
              <p className="text-xl text-white font-bold">{victory.duration}</p>
              <p className="text-[9px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>TIME</p>
            </div>
          </div>

          {/* Rank-ups */}
          {victory.rankUps.length > 0 && (
            <div className="border-t border-zinc-800 pt-3 space-y-1">
              <p className={`text-[10px] ${colors.secondary} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>⚡ RANKS EARNED</p>
              {victory.rankUps.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-200">{r.name}</span>
                  <span className={`text-[10px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>LV{r.from}→LV{r.to}</span>
                </div>
              ))}
            </div>
          )}

          {/* Session stats */}
          <div className="border-t border-zinc-800 pt-3 grid grid-cols-2 gap-2">
            {comboCount >= 3 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-amber-400">🔥</span>
                <span className="text-[10px] text-zinc-300">{comboCount}x combo</span>
              </div>
            )}
            {bounties.filter(b => b.done).length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-amber-400">🏆</span>
                <span className="text-[10px] text-zinc-300">{bounties.filter(b => b.done).length} bounties</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-500">📊</span>
              <span className="text-[10px] text-zinc-300">{cards.reduce((s, c) => s + c.completedSets, 0)} total sets</span>
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          className={`mt-6 px-6 py-3 border-2 ${colors.primary} bg-zinc-800 text-white hover:bg-zinc-700 transition-colors`}
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          <span className="text-[10px]">▸ RETURN TO BASE</span>
        </button>
      </div>
    );
  }

  const aliveCards = cards.filter(c => !c.defeated);
  const currentCard = aliveCards[activeIndex];

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 text-xs mb-4">No workout loaded</p>
          <button onClick={onComplete} className={`text-[10px] px-4 py-2 border ${colors.border} bg-zinc-800 text-white`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ▸ BACK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      <style>{`
        @keyframes defeatBurst {
          0% { transform: scale(0.5); opacity: 0; }
          40% { transform: scale(1.3); opacity: 0.9; }
          100% { transform: scale(1.0); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes xpFloat {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
      {/* Arena backdrop */}
      <img
        src={`/themes/${currentTheme}/v2/banner.png`}
        alt=""
        className="fixed bottom-0 left-0 right-0 w-full h-[40vh] object-cover object-bottom pointer-events-none opacity-[0.07]"
        style={{ imageRendering: 'pixelated', maskImage: 'linear-gradient(transparent 0%, black 30%, black 70%, transparent 100%)' }}
      />

      {/* Top bar: close button */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <button onClick={() => setShowEndConfirm(true)} className="text-zinc-600 text-xs">✕</button>
        <span className="text-[8px] text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {currentTheme !== 'athlete' ? 'BATTLE' : 'WORKOUT'}
        </span>
        <div className="w-4" />
      </div>

      {/* Compact status bar */}
      <div className="mx-4 mb-2 flex items-center justify-between px-3 py-1.5 border border-zinc-800 bg-zinc-900/80 rounded-sm">
        {sessionXp > 0 ? (
          <span className={`text-[10px] ${colors.secondary} font-bold`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ⚡{sessionXp}
          </span>
        ) : <span />}
        <div className="flex items-center gap-2">
          <div className="flex h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`${colors.barFill} transition-all duration-500`} style={{ width: `${(cards.filter(c => c.defeated).length / cards.length) * 100}%` }} />
          </div>
          <span className="text-[9px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {cards.filter(c => c.defeated).length}/{cards.length}
          </span>
        </div>
      </div>

      {/* Session Bounties (meaningful labels) */}
      {bounties.length > 0 && (
        <div className="flex items-center justify-center gap-3 mb-2 px-4">
          {bounties.map(b => (
            <span key={b.id} className={`text-[8px] ${b.done ? 'text-amber-400' : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {b.done ? '✓' : '○'} {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Carousel */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex-1 flex items-start overflow-x-auto snap-x snap-mandatory gap-3 px-4 pt-2 pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {aliveCards.map((card, idx) => (
          <div
            key={card.id}
            className={`snap-center shrink-0 w-[calc(100vw-3rem)] max-w-sm transition-all duration-300 relative ${card.poofing ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
            style={idx === activeIndex && !card.poofing ? { boxShadow: aliveCards.length === 1 && cards.filter(c => c.defeated).length > 0 ? colors.glow.replace('0.15', '0.3').replace('0.05', '0.1') : colors.glow } : undefined}
          >
            {/* Defeat burst */}
            {card.poofing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none bg-black/40">
                <span className="text-4xl" style={{ animation: 'defeatBurst 600ms ease-out forwards' }}>{getThemeIdentity(currentTheme).emoji}</span>
                <span className="text-[12px] text-white mt-2 tracking-widest" style={{ fontFamily: "var(--font-pixel), monospace", animation: 'defeatBurst 600ms ease-out 100ms forwards', opacity: 0 }}>{currentTheme !== 'athlete' ? 'DEFEATED' : '✓ DONE'}</span>
              </div>
            )}
            {/* Floating XP pop */}
            {idx === activeIndex && xpPop && (
              <div className="absolute top-2 right-3 z-10 pointer-events-none">
                <span className={`text-sm font-bold ${perfectStrike ? 'text-amber-300 text-lg' : colors.secondary}`} style={{ animation: 'xpFloat 800ms ease-out forwards', fontFamily: "var(--font-pixel), monospace" }}>
                  {perfectStrike ? `⚡ +${xpPop} PERFECT` : `+${xpPop}`}
                </span>
              </div>
            )}
            {card.type === 'duration' ? (
              <DurationCard
                card={card}
                isActive={idx === activeIndex}
                colors={colors}
                currentTheme={currentTheme}
                onComplete={logDurationAttack}
              />
            ) : card.type === 'cardio' ? (
              <CardioCard
                card={card}
                isActive={idx === activeIndex}
                colors={colors}
                onComplete={logDurationAttack}
              />
            ) : (
              <LiftingCard
                card={card}
                isActive={idx === activeIndex}
                colors={colors}
                currentTheme={currentTheme}
                weight={idx === activeIndex ? weight : ''}
                reps={idx === activeIndex ? reps : ''}
                onWeightChange={setWeight}
                onRepsChange={setReps}
                isResting={idx === activeIndex && isResting}
                restSeconds={idx === activeIndex ? restSeconds : 0}
                restMax={restMax}
                onLogAttack={logAttack}
                onSkipRest={() => { setIsResting(false); setRestSeconds(0); }}
                subExerciseIdx={idx === activeIndex ? subExerciseIdx : 0}
                catalog={catalogItems}
                onSwap={(newExId, newName) => {
                  setCards(prev => prev.map(c => c.id === card.id ? { ...c, exerciseId: newExId, name: newName } : c));
                }}
                restEvent={idx === activeIndex ? restEvent : null}
                onShowHistory={showExerciseHistory}
                onUndo={undoLastAttack}
                canUndo={idx === activeIndex && isResting && !!lastAttack}
                prFlash={idx === activeIndex && prFlash}
              />
            )}
          </div>
        ))}
      </div>

      {/* Progress trail + dot indicators */}
      <div className="pb-6 px-4">
        {cards.filter(c => c.defeated).length > 0 && (
          <div className="flex items-center gap-1 justify-center mb-2">
            {cards.filter(c => c.defeated).map(c => (
              <div key={c.id} className="w-5 h-5 border border-zinc-700 bg-zinc-800/50 flex items-center justify-center opacity-50">
                <span className="text-[7px] text-green-500">✓</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-center gap-1.5">
          {aliveCards.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 border ${idx === activeIndex ? `${colors.primary} ${colors.barFill}` : 'border-zinc-700 bg-zinc-800'} ${aliveCards.length === 1 ? 'animate-pulse' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* End confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className={`border-2 ${colors.primary} bg-zinc-900 p-6 max-w-xs w-full text-center`}>
            <p className={`text-[10px] ${colors.headerText} mb-4`} style={{ fontFamily: "var(--font-pixel), monospace" }}>PAUSE BATTLE?</p>
            <div className="space-y-2">
              <button onClick={() => setShowEndConfirm(false)} className={`w-full py-3 border ${colors.primary} bg-zinc-800 ${colors.secondary} text-[9px]`} style={{ fontFamily: "var(--font-pixel), monospace" }}>▸ KEEP GOING</button>
              <button onClick={onComplete} className={`w-full py-3 border ${colors.border} bg-zinc-800 text-zinc-300 text-[9px]`} style={{ fontFamily: "var(--font-pixel), monospace" }}>◷ SAVE & EXIT</button>
              <button onClick={() => { localStorage.removeItem(BATTLE_STATE_KEY); onComplete(); }} className="w-full py-3 border border-red-900 bg-zinc-800 text-red-400 text-[9px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>✕ END WORKOUT</button>
            </div>
          </div>
        </div>
      )}

      {/* Rank-up full-screen flash */}
      {rankUpToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200" onClick={() => setRankUpToast(null)}>
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative text-center space-y-3 px-8">
            <p className={`text-[12px] ${colors.secondary} tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ⬆ RANK UP
            </p>
            <p className="text-xl text-white font-bold" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {rankUpToast.name}
            </p>
            <p className={`text-3xl ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              LV {rankUpToast.level}
            </p>
            <p className="text-[10px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {rankUpToast.rankName}
            </p>
            {rankUpToast.nextThreshold && (
              <p className="text-[10px] text-zinc-500 mt-2">
                Next: {rankUpToast.nextThreshold}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Defeat overlay — tap to continue */}
      {defeatedOverlay && !rankUpToast && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={() => setDefeatedOverlay(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative text-center space-y-3 px-8">
            <p className="text-[11px] text-green-400 tracking-widest" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ✓ DEFEATED
            </p>
            <p className="text-lg text-white font-bold" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {defeatedOverlay.name}
            </p>
            {defeatedOverlay.isPr && (
              <p className="text-sm text-amber-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>★ NEW PR</p>
            )}
            {defeatedOverlay.lastThree.length > 0 && (
              <p className="text-[10px] text-zinc-400">
                Last {defeatedOverlay.lastThree.length}: {defeatedOverlay.lastThree.join(' → ')}{' '}
                {defeatedOverlay.lastThree.length >= 2 && (defeatedOverlay.lastThree[defeatedOverlay.lastThree.length - 1] > defeatedOverlay.lastThree[0] ? '↑' : defeatedOverlay.lastThree[defeatedOverlay.lastThree.length - 1] < defeatedOverlay.lastThree[0] ? '↓' : '→')}
              </p>
            )}
            <p className="text-[9px] text-zinc-600 mt-4" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              tap to continue
            </p>
          </div>
        </div>
      )}

      {/* Exercise History Sheet */}
      {historyExercise && (
        <div className="fixed inset-0 z-50" onClick={() => setHistoryExercise(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 left-0 right-0 max-h-[40vh] bg-zinc-900 border-t-2 border-zinc-700 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <p className={`text-[10px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              HISTORY — {historyExercise.replace(/_/g, ' ')}
            </p>
            {historyData.length === 0 ? (
              <p className="text-xs text-zinc-500">No previous sessions</p>
            ) : (
              <div className="space-y-2">
                {historyData.map((h, i) => (
                  <div key={i} className={`flex items-center justify-between border ${colors.border} bg-zinc-800/50 px-3 py-2`}>
                    <div>
                      <p className="text-[11px] text-zinc-300">{h.date}</p>
                      <p className="text-[10px] text-zinc-500">
                        {h.sets?.length ? h.sets.map((s: any) => `${s.weight}×${s.reps}`).join(', ') : `1RM: ${Math.round(h.raw_value || 0)}`}
                      </p>
                    </div>
                    {h.level > 0 && <span className={`text-[9px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>LV{h.level}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Battle Narration ---
const CREATURE_DIALOGUE: Record<string, { idle: string[]; hit: string[]; nearDefeat: string; defeated: string }> = {
  back_squat: { idle: ['The Oni cracks its knuckles. Waiting.', 'It watches you warm up. Unimpressed.'], hit: ['The Oni grunts. It felt that.', 'A worthy strike. The Oni staggers.'], nearDefeat: 'The Oni is breathing hard. One more.', defeated: 'The Oni bows — barely. "Took you long enough."' },
  deadlift: { idle: ['The Earth Yokai rises from the ground. Slowly.', 'Stone grinds against stone. It stirs.'], hit: ['Cracks form across its body.', 'The Yokai crumbles at the edges.'], nearDefeat: 'It\'s barely holding together. Finish it.', defeated: 'The Earth Yokai sinks back into the ground. Respect earned.' },
  bench_press: { idle: ['The Haunted Armor hovers. Silent. Waiting.', 'Ghost light flickers inside the visor.'], hit: ['The armor dents. A gauntlet drops.', 'Spectral energy leaks from the impact.'], nearDefeat: 'The armor is losing cohesion. One more strike.', defeated: 'The armor crashes to the ground. The ghost within nods.' },
  pull_up: { idle: ['The Tengu perches above. Looking down.', '"You again," it sneers.'], hit: ['The Tengu\'s wings falter.', 'It drops a few feet. Pride wounded.'], nearDefeat: '"Fine. FINE. One more and I yield."', defeated: 'The Tengu folds its wings. It has nothing left to teach you here.' },
  overhead_press: { idle: ['Thunder rumbles. The Oni drums overhead.', 'Lightning crackles between its horns.'], hit: ['The storm wavers.', 'Its drums skip a beat.'], nearDefeat: 'The thunder is fading. Press through.', defeated: 'The Thunder Oni lowers its drums. The sky clears.' },
  run_1_mile: { idle: ['The Fox Spirit paces. Tails swishing.', '"Catch me if you can," it grins.'], hit: ['You\'re gaining on it.', 'The Fox glances back. Surprised.'], nearDefeat: 'It\'s within reach. Don\'t slow down.', defeated: 'The Fox Spirit stops running. "Well. That was fun."' },
  plank: { idle: ['The Stone Kappa sits. Immovable.', '"I can do this forever. Can you?"'], hit: ['A crack appears.', 'The Kappa shifts. Slightly.'], nearDefeat: '"You\'re still here? ...Impressive."', defeated: 'The Kappa tips its head. Water spills. It yields.' },
  push_ups: { idle: ['Shadows gather. Eyes multiply.', 'The ninjas watch from every angle.'], hit: ['One shadow dissipates.', 'The formation breaks slightly.'], nearDefeat: 'Only a few remain. Finish them.', defeated: 'The shadows scatter. They\'ll regroup... but not today.' },
  run_400m: { idle: ['Steel glints in the air. The volley is ready.', 'Kunai hover. Waiting for you to move.'], hit: ['Blades deflected.', 'The volley thins.'], nearDefeat: 'Almost through the storm.', defeated: 'The last kunai falls. Clear path ahead.' },
  dead_hang: { idle: ['Chains rattle. The spirit hangs above.', '"Let go," it whispers. "Everyone does."'], hit: ['The chains loosen.', '"Still here?" it asks, genuinely surprised.'], nearDefeat: '"You... won\'t... let go?"', defeated: 'The Chain Spirit dissolves. The chains fall silent.' },
  barbell_row: { idle: ['A tentacle emerges from below. Then another.', 'The depths stir. Something massive waits.'], hit: ['The tentacle recoils.', 'Ink sprays. You struck something vital.'], nearDefeat: 'The kraken eye appears. It\'s retreating.', defeated: 'The tentacles withdraw. The deep is quiet... for now.' },
  run_5k: { idle: ['The wind takes shape. A face forms in the gust.', 'The Wind Kami swirls. Patient. Eternal.'], hit: ['The wind falters.', 'Leaves scatter as you push through.'], nearDefeat: 'The gale is weakening. You\'re cutting through.', defeated: 'The wind stills. The Kami dissolves into cherry blossoms.' },
};

function getBattleNarration(card: BattleCard, theme: string): string {
  const normalized = card.exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
  const creature = CREATURE_DIALOGUE[normalized];
  const enemyName = ENEMY_NAMES[theme]?.[normalized] || 'The enemy';

  if (!creature) {
    // Fallback for exercises without specific dialogue
    if (card.defeated) return `${enemyName} yields.`;
    if (card.completedSets === 0) return `${enemyName} watches. Waiting.`;
    if (card.completedSets + 1 >= card.totalSets) return `${enemyName} staggers. One more.`;
    return `${enemyName} felt that. Keep going.`;
  }

  if (card.defeated) return creature.defeated;
  if (card.completedSets === 0) return creature.idle[Math.abs(card.id.charCodeAt(0)) % creature.idle.length];
  if (card.completedSets + 1 >= card.totalSets) return creature.nearDefeat;
  return creature.hit[card.completedSets % creature.hit.length];
}

// --- Enemy Names (Samurai theme) ---
const ENEMY_NAMES: Record<string, Record<string, string>> = {
  samurai: {
    back_squat: 'Crimson Oni', deadlift: 'Earth Yokai', bench_press: 'Haunted Armor',
    pull_up: 'Tengu', overhead_press: 'Thunder Oni', run_1_mile: 'Fox Spirit',
    plank: 'Stone Kappa', push_ups: 'Shadow Ninjas', run_400m: 'Kunai Volley',
    dead_hang: 'Chain Spirit', barbell_row: 'Kraken Tentacle', run_5k: 'Wind Kami',
  },
  dragon: {
    back_squat: 'Molten Golem', deadlift: 'Iron Wyrm', bench_press: 'Fire Shield',
    pull_up: 'Sky Drake', overhead_press: 'Thunder Dragon', run_1_mile: 'Wind Serpent',
    plank: 'Lava Tortoise', push_ups: 'Fire Sprites', run_400m: 'Lightning Drake',
    dead_hang: 'Gravity Phantom', barbell_row: 'Deep Wyrm', run_5k: 'Storm Dragon',
  },
};

// --- Enemy Sprite ---
function EnemySprite({ exerciseId, level, defeated, theme, showName, attackCount }: { exerciseId: string; level: number; defeated: boolean; theme: string; showName?: boolean; attackCount?: number }) {
  const tier = level >= 4 ? 2 : level >= 2 ? 1 : 0;
  const normalized = exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
  const src = `/enemies/${theme}/${normalized}_t${tier}.png`;
  const [hasImage, setHasImage] = useState(true);
  const [flashing, setFlashing] = useState(false);
  const prevAttack = useRef(attackCount || 0);
  const enemyName = ENEMY_NAMES[theme]?.[normalized] || null;

  // Flash on attack
  useEffect(() => {
    if (attackCount !== undefined && attackCount > prevAttack.current) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 300);
    }
    prevAttack.current = attackCount || 0;
  }, [attackCount]);

  if (!hasImage) return null;

  return (
    <div className={`flex flex-col items-center gap-2 py-2 transition-all duration-700 ${defeated ? 'opacity-0 scale-75' : 'opacity-100'}`}>
      <div className="w-20 h-20 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 rounded-lg" style={{ boxShadow: 'inset 0 0 12px rgba(0,0,0,0.9)' }} />
        <img
          src={src}
          alt=""
          className={`w-16 h-16 relative z-10 ${!defeated && !flashing ? 'animate-[breathe_3s_ease-in-out_infinite]' : ''}`}
          style={{
            imageRendering: 'pixelated',
            filter: flashing ? 'brightness(8)' : undefined,
            transform: flashing ? 'translateX(-2px)' : undefined,
            transition: flashing ? 'none' : 'filter 0.2s, transform 0.2s',
          }}
          onError={() => setHasImage(false)}
        />
      </div>
      {showName && enemyName && (
        <p className="text-[11px] text-white tracking-wide" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {enemyName}
        </p>
      )}
    </div>
  );
}

// --- Lifting Card ---
function LiftingCard({ card, isActive, colors, currentTheme, weight, reps, onWeightChange, onRepsChange, isResting, restSeconds, restMax, onLogAttack, onSkipRest, subExerciseIdx, catalog, onSwap, restEvent, onShowHistory, onUndo, canUndo, prFlash }: {
  card: BattleCard; isActive: boolean; colors: any; currentTheme: string;
  weight: string; reps: string; onWeightChange: (v: string) => void; onRepsChange: (v: string) => void;
  isResting: boolean; restSeconds: number; restMax: number; onLogAttack: () => void; onSkipRest: () => void;
  subExerciseIdx: number; catalog: CatalogItem[]; onSwap: (exId: string, name: string) => void;
  restEvent?: string | null; onShowHistory: (exId: string) => void; onUndo?: () => void; canUndo?: boolean; prFlash?: boolean;
}) {
  const isCompound = ['squat', 'bench', 'deadlift', 'press', 'row', 'clean', 'snatch'].some(n => card.name.toLowerCase().includes(n));
  const isSuperset = card.exercises && card.exercises.length > 1;
  const [showPlate, setShowPlate] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const combat = currentTheme !== 'athlete';

  // For supersets: current sub-exercise
  const currentExercise = isSuperset ? card.exercises![subExerciseIdx % card.exercises!.length] : null;
  const displayName = currentExercise ? currentExercise.name : card.name;

  return (
    <div className={`border-2 ${isActive ? colors.primary : colors.border} bg-zinc-900 p-4 space-y-4`}>
      {/* Battle scene — enemy sprite + name + HP */}
      {combat && !isSuperset && <EnemySprite exerciseId={card.exerciseId} level={card.currentLevel || 0} defeated={card.defeated} theme={currentTheme} showName attackCount={card.completedSets} />}
      {/* Battle narration */}
      {combat && !isSuperset && (
        <p className="text-[9px] text-zinc-500 italic text-center mb-1">
          {getBattleNarration(card, currentTheme)}
        </p>
      )}
      {combat && !isSuperset && (
        <PixelBar current={card.completedSets} max={card.totalSets} inverted={combat} />
      )}
      {/* Enemy header */}
      <div>
        {isSuperset ? (
          <div className="space-y-2">
            <EnemySprite exerciseId={card.exerciseId} level={card.currentLevel || 0} defeated={card.defeated} theme={currentTheme} showName={combat} attackCount={card.completedSets} />
            <div className="flex items-center justify-between">
              <span className={`text-[8px] ${colors.secondary} tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                ⚔⚔ DUAL ENCOUNTER
              </span>
              <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                SET {card.completedSets + 1}/{card.totalSets}
              </span>
            </div>
            {card.exercises!.map((ex, i) => {
              const active = i === subExerciseIdx;
              const done = i < subExerciseIdx;
              return (
                <div key={i} className={`flex items-center justify-between px-2 py-1.5 border ${active ? `${colors.border} bg-zinc-800` : 'border-transparent'}`}>
                  <p className={`${active ? 'text-[10px] text-white' : 'text-[8px] text-zinc-600'} truncate max-w-[220px]`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {done ? '✓ ' : active ? '▸ ' : ''}{ex.name}
                  </p>
                  <span className={`text-[8px] ${done ? 'text-green-500' : active ? colors.secondary : 'text-zinc-700'}`}>
                    {done ? '✓' : active ? '⬤' : '○'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button onClick={() => onShowHistory(card.exerciseId)} className="flex items-center gap-2">
              {!combat && <img src={`/themes/${currentTheme}/v2/level${card.catalogItem?.standards ? '1' : '0'}.png`} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />}
              <p className={`${combat ? 'text-[10px] text-zinc-400' : 'text-xs text-white font-medium'} truncate max-w-[200px] ${combat ? '' : 'underline decoration-zinc-700'}`}>{displayName}</p>
            </button>
            <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {card.completedSets + 1 === card.totalSets ? (combat ? '⚡ FINAL STRIKE' : '⚡ LAST SET') : combat ? `STRIKE ${card.completedSets + 1}/${card.totalSets}` : `SET ${card.completedSets + 1}/${card.totalSets}`}
            </span>
          </div>
        )}
      </div>

      {/* HP Bar (shown here only for athlete mode or superset — combat non-superset has it above) */}
      {(!combat || isSuperset) && <PixelBar current={card.completedSets} max={card.totalSets} inverted={combat} />}

      {/* PR Flash */}
      {prFlash && (
        <p className="text-center text-sm text-amber-400 font-bold animate-pulse" style={{ fontFamily: "var(--font-pixel), monospace" }}>★ NEW PR</p>
      )}

      {/* Equipment variants */}
      {(() => {
        const baseId = card.catalogItem?.normalizes_to || card.exerciseId;
        const variants = catalog.filter(c => (c.id === baseId || c.normalizes_to === baseId) && c.id !== card.exerciseId);
        if (variants.length === 0) return null;
        return (
          <div className="flex gap-1 flex-wrap">
            <span className={`text-[8px] px-1.5 py-0.5 border ${colors.primary} bg-zinc-800 text-zinc-200`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {card.catalogItem?.required_equipment?.[0]?.toUpperCase()?.slice(0, 2) || 'BB'}
            </span>
            {variants.slice(0, 3).map(v => (
              <button key={v.id} onClick={() => onSwap(v.id, v.name)} className="text-[8px] px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {v.required_equipment?.[0]?.toUpperCase()?.slice(0, 2) || 'DB'}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Rank nudge */}
      {card.catalogItem?.standards && (card.lastWeight || 0) > 0 && (() => {
        const standards = card.catalogItem.standards;
        const brackets = standards?.brackets?.male || standards?.brackets?.female;
        if (!brackets?.length) return null;
        const bracket = brackets[0];
        const levels = bracket?.levels;
        if (!levels) return null;
        // Find next threshold above lastWeight
        const currentWeight = card.lastWeight || 0;
        for (let i = 0; i < levels.length; i++) {
          const threshold = levels[i];
          if (currentWeight < threshold) {
            const diff = Math.round(threshold - currentWeight);
            return <p className={`text-[8px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>▲ {diff} more for LV{i + 1}</p>;
          }
        }
        return null;
      })()}

      {/* Weight + Reps inputs */}
      {(() => {
        const isRunExercise = ['run_1_mile', 'run_400m', 'run_5k', 'run_2_mile'].some(k => card.exerciseId === k || card.exerciseId.includes(k));
        if (isRunExercise) {
          return (
            <div className="grid grid-cols-2 gap-3">
              <div className={`border ${colors.border} bg-zinc-800 p-4 text-center`}>
                <input type="number" inputMode="numeric" value={weight} onChange={e => onWeightChange(e.target.value)} className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }} placeholder="0" />
                <p className="text-[8px] text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>MIN</p>
              </div>
              <div className={`border ${colors.border} bg-zinc-800 p-4 text-center`}>
                <input type="number" inputMode="numeric" value={reps} onChange={e => onRepsChange(e.target.value)} className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }} placeholder="00" />
                <p className="text-[8px] text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>SEC</p>
              </div>
            </div>
          );
        }
        return (
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { if (!weight && card.lastWeight) onWeightChange(String(card.lastWeight)); }} className={`border ${colors.border} bg-zinc-800 p-4 text-center`}>
          <input
            type="number"
            inputMode="numeric"
            value={weight}
            onChange={e => onWeightChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
            placeholder={card.lastWeight ? String(card.lastWeight) : '0'}
          />
          <p className="text-[8px] text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>LBS</p>
        </button>
        <button onClick={() => { if (!reps) onRepsChange(String(card.targetReps || 8)); }} className={`border ${colors.border} bg-zinc-800 p-4 text-center`}>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => onRepsChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
            placeholder={String(card.targetReps || 8)}
          />
          <p className="text-[8px] text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>REPS</p>
        </button>
      </div>
        );
      })()}

      {/* LOG ATTACK / REST button */}
      {isResting ? (
        <>
        <button
          onClick={onSkipRest}
          className="w-full py-3 border-2 border-cyan-500/60 bg-cyan-950/40 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-cyan-500/20 transition-all duration-1000 ease-linear" style={{ width: `${(restSeconds / restMax) * 100}%` }} />
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <span className="text-3xl font-bold text-cyan-300 tabular-nums">
              {restSeconds}s
            </span>
            <span className="text-[10px] text-cyan-400/80 tracking-wider" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ◷ RESTING — TAP TO SKIP
            </span>
            {restEvent && <p className="text-[10px] text-zinc-500 mt-1 italic">{restEvent}</p>}
          </div>
        </button>
        {canUndo && onUndo && (
          <button onClick={onUndo} className="w-full py-2 mt-1 border border-zinc-700 bg-zinc-900 text-center hover:bg-zinc-800">
            <span className="text-[9px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>↩ UNDO LAST</span>
          </button>
        )}
        </>
      ) : (
        <button
          onClick={(e) => { (e.currentTarget as HTMLElement).style.animation = 'shake 200ms'; setTimeout(() => { (e.currentTarget as HTMLElement).style.animation = ''; }, 200); onLogAttack(); }}
          className={`w-full py-6 border-2 ${card.completedSets + 1 === card.totalSets && combat ? 'border-red-500 animate-pulse' : colors.primary} bg-zinc-800 text-center transition-colors hover:bg-zinc-700`}
        >
          <span className={`text-sm ${card.completedSets + 1 === card.totalSets && combat ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {combat
              ? (card.completedSets + 1 === card.totalSets ? '⚔ FINISH' : card.completedSets === 0 ? '⚔ ATTACK' : '⚔⚔ STRIKE')
              : (card.completedSets + 1 === card.totalSets ? '✓ COMPLETE' : '▸ LOG SET')
            }
          </span>
        </button>
      )}

      {/* Secondary tools */}
      <div className="flex items-center justify-between pt-1">
        <button onClick={() => setShowSwap(!showSwap)} className="text-[8px] text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>⟲ SWAP</button>
        <button onClick={() => setShowPlate(!showPlate)} className="text-[8px] text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>⊞ PLATE</button>
        <button className="text-[8px] text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>◷ {isCompound ? '90' : '60'}s</button>
        <button className="text-[8px] text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>⋯</button>
      </div>

      {/* Plate calculator inline */}
      {showPlate && (
        <PlateCalcInline onUse={(w) => { onWeightChange(String(w)); setShowPlate(false); }} />
      )}

      {/* Swap picker */}
      {showSwap && (() => {
        const currentCat = card.catalogItem || catalog.find(c => c.id === card.exerciseId);
        const swapGroup = currentCat?.swap_group;
        const alternatives = swapGroup
          ? catalog.filter(c => c.swap_group === swapGroup && c.id !== card.exerciseId)
          : [];
        return (
          <div className="border border-zinc-700 bg-zinc-800 p-2 mt-1 max-h-32 overflow-y-auto">
            {alternatives.length > 0 ? alternatives.map(c => (
              <button key={c.id} onClick={() => { onSwap(c.id, c.name); setShowSwap(false); }} className="w-full text-left px-2 py-1.5 text-[8px] text-zinc-300 hover:bg-zinc-700 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {c.name}
              </button>
            )) : (
              <p className="text-[8px] text-zinc-600 text-center py-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>NO ALTERNATIVES</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// --- Duration Card ---
function DurationCard({ card, isActive, colors, currentTheme, onComplete }: {
  card: BattleCard; isActive: boolean; colors: any; currentTheme: string; onComplete: (seconds: number, cardId?: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const targetSec = card.targetSeconds || 30;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= targetSec) {
          setRunning(false);
          onComplete(prev + 1, card.id);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, targetSec]);

  const progress = Math.min(elapsed / targetSec, 1);

  return (
    <div className={`border-2 ${isActive ? colors.primary : colors.border} bg-zinc-900 p-4 space-y-4`}>
      {/* Enemy header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={`/themes/${currentTheme}/v2/level0.png`} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />
          <p className="text-xs text-white font-medium">{card.name}</p>
        </div>
        <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          SET {card.completedSets + 1}/{card.totalSets}
        </span>
      </div>

      {/* HP Bar */}
      <PixelBar current={card.completedSets} max={card.totalSets} />

      {/* Timer circle */}
      <div className="flex flex-col items-center py-6">
        <div className={`w-32 h-32 rounded-full border-4 ${running ? colors.primary : 'border-zinc-700'} flex items-center justify-center relative`}>
          {/* Progress ring via conic-gradient */}
          <div
            className="absolute inset-1 rounded-full"
            style={{ background: `conic-gradient(${running ? 'rgb(239 68 68)' : 'transparent'} ${progress * 360}deg, transparent 0deg)`, opacity: 0.2 }}
          />
          <span className="text-2xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {running ? (targetSec - elapsed) : targetSec}
          </span>
        </div>
        <p className="text-[8px] text-zinc-500 mt-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {running ? 'HOLD...' : 'TAP TO START'}
        </p>
      </div>

      {/* Start / Stop */}
      <button
        onClick={() => {
          if (running) { setRunning(false); onComplete(elapsed, card.id); setElapsed(0); }
          else setRunning(true);
        }}
        className={`w-full py-4 border-2 ${running ? 'border-red-500' : colors.primary} bg-zinc-800 text-center transition-colors hover:bg-zinc-700`}
      >
        <span className={`text-[10px] ${running ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {running ? '■ STOP' : '▶ START HOLD'}
        </span>
      </button>
    </div>
  );
}

// --- Cardio Card (interval runner) ---
function CardioCard({ card, isActive, colors, onComplete }: {
  card: BattleCard; isActive: boolean; colors: any; onComplete: (seconds: number, cardId?: string) => void;
}) {
  const [engineChoice, setEngineChoice] = useState<'hiit' | 'zone2' | null>(null);
  const [zone2Duration, setZone2Duration] = useState(30);
  const intervals = engineChoice === 'zone2'
    ? [{ zone: 'Comfortable', seconds: zone2Duration * 60, color: 'bg-green-500', note: null }]
    : (card.intervals || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = intervals[currentIdx];
  const totalElapsed = intervals.slice(0, currentIdx).reduce((s, i) => s + i.seconds, 0) + elapsed;
  const totalDuration = card.targetSeconds || intervals.reduce((s, i) => s + i.seconds, 0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [flash, setFlash] = useState(false);
  const prevIdx = useRef(currentIdx);

  // Flash on zone transition
  useEffect(() => {
    if (currentIdx !== prevIdx.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      prevIdx.current = currentIdx;
    }
  }, [currentIdx]);

  useEffect(() => {
    if (!running || !current) return;
    const t = setInterval(() => {
      setElapsed(prev => {
        const remaining = current.seconds - (prev + 1);
        // 3-2-1 countdown beeps (ascending pitch)
        if (remaining === 2) import('@/utils/audio').then(m => m.playCountdownBeep(600, 0.1));
        if (remaining === 1) import('@/utils/audio').then(m => m.playCountdownBeep(800, 0.1));
        if (remaining === 0) import('@/utils/audio').then(m => m.playCountdownBeep(1000, 0.15));

        if (prev + 1 >= current.seconds) {
          // Zone transition sound
          const nextZone = intervals[currentIdx + 1];
          if (nextZone?.color.includes('red')) {
            // Urgent triple beep for Full Send
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(800, 0.05)), 0);
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(1000, 0.05)), 80);
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(1200, 0.1)), 160);
          } else {
            // Normal double beep
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(800, 0.05)), 0);
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(1200, 0.1)), 80);
          }
          import('@/utils/haptics').then(m => m.haptic('medium'));
          if (currentIdx + 1 < intervals.length) {
            setCurrentIdx(i => i + 1);
            return 0;
          } else {
            setRunning(false);
            setFinished(true);
            onCompleteRef.current(totalDuration, card.id);
            return prev + 1;
          }
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, currentIdx, current, intervals.length, totalDuration]);

  // Engine choice: HIIT vs Zone 2
  if (!engineChoice) {
    return (
      <div className={`border-2 ${isActive ? colors.primary : colors.border} bg-zinc-900 p-4 space-y-3`}>
        <p className={`text-[10px] ${colors.headerText} text-center uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          PICK YOUR ENGINE
        </p>
        <button onClick={() => setEngineChoice('hiit')} className={`w-full p-3 border ${colors.border} bg-zinc-800 text-left hover:bg-zinc-700 transition-colors`}>
          <span className="text-sm">🔥</span>
          <span className="text-xs text-white ml-2 font-medium">HIIT Intervals</span>
          <p className="text-[10px] text-zinc-500 ml-6">Programmed tread block</p>
        </button>
        <button onClick={() => setEngineChoice('zone2')} className={`w-full p-3 border ${colors.border} bg-zinc-800 text-left hover:bg-zinc-700 transition-colors`}>
          <span className="text-sm">💚</span>
          <span className="text-xs text-white ml-2 font-medium">Zone 2 Steady State</span>
          <p className="text-[10px] text-zinc-500 ml-6">Easy pace — pick your duration</p>
        </button>
        {engineChoice === null && (
          <div className="flex gap-2 justify-center">
            {[20, 30, 45].map(m => (
              <button key={m} onClick={() => { setZone2Duration(m); setEngineChoice('zone2'); }} className={`text-[9px] px-2 py-1 border border-zinc-700 bg-zinc-900 text-zinc-400`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {m}min Z2
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (finished) {
    return (
      <div className={`border-2 ${colors.primary} bg-zinc-900 p-4 text-center`}>
        <p className={`text-[10px] ${colors.secondary} mb-2`} style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ CARDIO COMPLETE</p>
        <p className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{Math.round(totalDuration / 60)} min</p>
      </div>
    );
  }

  // Zone-based card styling
  const zoneBg = current?.color.includes('red') ? 'bg-red-950/60 border-red-700'
    : current?.color.includes('orange') ? 'bg-orange-950/60 border-orange-700'
    : 'bg-green-950/60 border-green-700';
  const zoneText = current?.color.includes('red') ? 'text-red-400'
    : current?.color.includes('orange') ? 'text-orange-400'
    : 'text-green-400';

  // Parse incline from note (e.g., "3%", "@ 3% incline", "8%")
  const inclineMatch = current?.note?.match(/(\d+(?:\.\d+)?)\s*%/);
  const incline = inclineMatch ? inclineMatch[1] : null;

  const remaining = current ? current.seconds - elapsed : 0;
  const isCountdown = remaining <= 5 && running;

  return (
    <div className={`border-2 ${zoneBg} p-4 space-y-4 transition-colors duration-300 ${flash ? 'brightness-200' : ''}`} style={flash ? { filter: 'brightness(2)' } : undefined}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white font-medium">{card.name}</p>
        <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {Math.round(totalElapsed / 60)}/{Math.round(totalDuration / 60)} MIN
        </span>
      </div>

      {/* Overall progress */}
      <div className="h-2 bg-zinc-800 border border-zinc-700 flex">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`flex-1 border-r border-zinc-900 ${i < Math.round((totalElapsed / totalDuration) * 20) ? colors.barFill : ''}`} />
        ))}
      </div>

      {/* Current zone — LARGE display */}
      {current && (
        <div className="text-center py-3">
          <p className={`text-sm uppercase font-bold ${zoneText}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {current.zone}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1 mb-3">
            {current.zone === 'Comfortable' ? 'Easy pace — can hold a conversation' :
             current.zone === 'Challenging' ? 'Push it — breathing hard' :
             current.zone === 'Full Send' ? 'All out — max effort' :
             'Steady effort'}
          </p>

          {/* Large incline display */}
          {incline && (
            <p className="text-3xl text-white font-bold mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {incline}%<span className="text-base text-zinc-400 ml-1">incline</span>
            </p>
          )}

          {/* Countdown */}
          <span className={`text-white block ${isCountdown ? 'text-5xl animate-pulse' : 'text-3xl'}`} style={{ fontFamily: "var(--font-pixel), monospace", transition: 'font-size 0.2s' }}>
            {running ? remaining : current.seconds}
          </span>
          <p className="text-[8px] text-zinc-600 mt-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            INTERVAL {currentIdx + 1}/{intervals.length}
          </p>
          {currentIdx + 1 < intervals.length && (
            <p className="text-[10px] text-zinc-600 mt-1">
              Next: {intervals[currentIdx + 1].zone} ({intervals[currentIdx + 1].seconds}s)
            </p>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2">
        <button
          onClick={() => setRunning(!running)}
          className={`w-full py-3 border-2 ${running ? 'border-red-500' : colors.primary} bg-zinc-800 text-center transition-colors hover:bg-zinc-700`}
        >
          <span className={`text-[10px] ${running ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {running ? '■ PAUSE' : '▶ START CARDIO'}
          </span>
        </button>
        {running && (
          <div className="flex gap-2">
            {currentIdx + 1 < intervals.length && (
              <button
                onClick={() => { setCurrentIdx(i => i + 1); setElapsed(0); }}
                className="flex-1 py-2 border border-zinc-700 bg-zinc-800 text-center hover:bg-zinc-700"
              >
                <span className="text-[9px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>▸ SKIP</span>
              </button>
            )}
            <button
              onClick={() => { if (totalElapsed > 0) onCompleteRef.current(totalElapsed, card.id); setRunning(false); setFinished(true); }}
              className="flex-1 py-2 border border-zinc-700 bg-zinc-800 text-center hover:bg-zinc-700"
            >
              <span className="text-[9px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ END EARLY</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Plate Calculator (inline, pixel-styled) ---
function PlateCalcInline({ onUse }: { onUse: (weight: number) => void }) {
  const [barWeight, setBarWeight] = useState(45);
  const [plates, setPlates] = useState<Record<number, number>>({});
  const PLATES = [45, 35, 25, 10, 5, 2.5];

  const plateTotal = Object.entries(plates).reduce((sum, [w, count]) => sum + parseFloat(w) * count * 2, 0);
  const total = barWeight + plateTotal;

  return (
    <div className="border border-zinc-700 bg-zinc-800 p-3 mt-1 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[45, 25].map(bw => (
            <button key={bw} onClick={() => setBarWeight(bw)} className={`text-[7px] px-2 py-1 border ${barWeight === bw ? 'border-zinc-500 text-white' : 'border-zinc-700 text-zinc-500'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {bw}lb BAR
            </button>
          ))}
        </div>
        <span className="text-[9px] text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{total} LBS</span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {PLATES.map(p => (
          <div key={p} className="text-center">
            <p className="text-[7px] text-zinc-500 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>{p}</p>
            <div className="flex items-center justify-center">
              <button onClick={() => setPlates(prev => ({ ...prev, [p]: Math.max(0, (prev[p] || 0) - 1) }))} className="w-7 h-7 flex items-center justify-center border border-zinc-600 bg-zinc-900 text-zinc-300 active:bg-zinc-700">
                <span className="text-sm">−</span>
              </button>
              <span className="text-[9px] text-white w-5 text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>{plates[p] || 0}</span>
              <button onClick={() => setPlates(prev => ({ ...prev, [p]: (prev[p] || 0) + 1 }))} className="w-7 h-7 flex items-center justify-center border border-zinc-600 bg-zinc-900 text-zinc-300 active:bg-zinc-700">
                <span className="text-sm">+</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onUse(total)} className="w-full text-[8px] py-1.5 border border-zinc-600 bg-zinc-900 text-zinc-300 hover:text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
        USE {total} LBS
      </button>
    </div>
  );
}
