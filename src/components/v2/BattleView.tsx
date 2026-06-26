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
import EnemySprite from './EnemySprite';
import LiftingCard from './LiftingCard';
import CardioCard from './CardioCard';
import DurationCard from './DurationCard';

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

            // Compute next threshold from catalog standards
            let nextThreshold: number | undefined;
            if (catItem?.standards?.brackets) {
              const sex = (profile?.sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
              const age = profile?.age || 30;
              const bw = profile?.bodyweight || 180;
              const brackets = catItem.standards.brackets[sex] || [];
              const bracket = brackets.find((b: any) => age >= b.min && age <= b.max);
              if (bracket?.levels && currentLevel < bracket.levels.length) {
                const nextLevel = bracket.levels[currentLevel];
                if (catItem.standards.unit === 'xBW') nextThreshold = Math.round(nextLevel * bw);
                else nextThreshold = Math.round(nextLevel);
              }
            }

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
              nextThreshold,
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
            { id: 'perfect', label: '⚡ Crit: beat your last weight' },
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
  const [rankUpToast, setRankUpToast] = useState<{ name: string; level: number; rankName: string; nextThreshold?: string; isRecruitment?: boolean } | null>(null);
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
        const isRecruitment = (result?.previous_level || 0) === 0;
        setRankUpToast({ name: card.name, level: result.level, rankName: result.rank_name || '', nextThreshold: result.next_threshold || '', isRecruitment });
        setTimeout(() => setRankUpToast(null), isRecruitment ? 5000 : 3500);
      }
      // Track session XP + floating number
      if (result?.xp_earned > 0) {
        setSessionXp(prev => prev + result.xp_earned);
        setXpPop(result.xp_earned);
        setTimeout(() => setXpPop(null), 900);
      }
      // PR detection — compare estimated 1RM of this set to historical best 1RM
      const estimated1RM = w * (1 + r / 30);
      if (w > 0 && estimated1RM > (card.bestValue || 0)) {
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

          {/* What moved forward */}
          <div className="border-t border-zinc-800 pt-3 space-y-1">
            <p className="text-[8px] text-zinc-600 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>ADVANCED</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[9px] text-emerald-400 px-2 py-0.5 bg-emerald-950/30 border border-emerald-900" style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ Streak</span>
              {bounties.length > 0 && (
                <span className="text-[9px] text-blue-400 px-2 py-0.5 bg-blue-950/30 border border-blue-900" style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ Bounties</span>
              )}
              {typeof window !== 'undefined' && localStorage.getItem('has_active_campaign') && (
                <span className="text-[9px] text-purple-400 px-2 py-0.5 bg-purple-950/30 border border-purple-900" style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ Campaign</span>
              )}
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
                  setCards(prev => prev.map(c => {
                    if (c.id !== card.id) return c;
                    // For supersets, update the specific sub-exercise
                    if (c.exercises?.length) {
                      const updated = [...c.exercises];
                      updated[subExerciseIdx % updated.length] = { ...updated[subExerciseIdx % updated.length], exerciseId: newExId, name: newName };
                      return { ...c, exercises: updated };
                    }
                    return { ...c, exerciseId: newExId, name: newName };
                  }));
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
            {rankUpToast.isRecruitment ? (
              <>
                <p className="text-[12px] text-amber-400 tracking-widest" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  ★ NEW SPIRIT BOUND
                </p>
                <p className="text-xl text-white font-bold" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  {rankUpToast.name}
                </p>
                <p className="text-[10px] text-zinc-400 italic mt-2">
                  It acknowledges your strength. It joins your bestiary.
                </p>
                <p className="text-[9px] text-zinc-600 mt-3">tap to continue</p>
              </>
            ) : (
              <>
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
              </>
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
