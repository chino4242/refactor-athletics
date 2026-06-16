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

            // Find last weight from history
            const lastLog = historyArr
              .filter((h: any) => (h.exercise_id || '').toLowerCase() === exId.toLowerCase())
              .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))[0];
            const lastWeight = lastLog?.data?.[0]?.weight || 0;

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
            }];
          });

        setCards(battleCards);
        
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
          const flexCards: BattleCard[] = items.map((c: CatalogItem) => ({
            id: uuidv4(),
            name: c.name || c.id.replace(/_/g, ' '),
            exerciseId: c.id,
            type: 'lifting' as const,
            totalSets: 3,
            completedSets: 0,
            targetReps: 8,
            defeated: false,
            poofing: false,
            catalogItem: c,
            lastWeight: 0,
          }));
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
  const [rankUpToast, setRankUpToast] = useState<string | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [xpPop, setXpPop] = useState<number | null>(null);
  const [comboCount, setComboCount] = useState(0);

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
    try {
      const result: any = await logTrainingAction(
        userId,
        exerciseId,
        userBodyweight,
        userSex,
        [{ weight: w, reps: r }],
        sessionId.current,
      );
      // Show rank-up celebration if level increased
      if (result?.level > 0 && result?.level > (result?.previous_level || 0)) {
        setRankUpToast(`${card.name} → LV${result.level} ${result.rank_name || ''}`);
        setTimeout(() => setRankUpToast(null), 3000);
      }
      // Track session XP + floating number
      if (result?.xp_earned > 0) {
        setSessionXp(prev => prev + result.xp_earned);
        setXpPop(result.xp_earned);
        setTimeout(() => setXpPop(null), 900);
      }
    } catch {
      // Queue for retry on next open
      const pending = JSON.parse(localStorage.getItem('pending_sets') || '[]');
      pending.push({ userId, exerciseId, bodyweight: userBodyweight, sex: userSex, sets: [{ weight: w, reps: r }], sessionId: sessionId.current, ts: Date.now() });
      localStorage.setItem('pending_sets', JSON.stringify(pending));
    }

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
    setCards(prev => prev.map(c => {
      if (c.id !== card.id) return c;
      const newCompleted = c.completedSets + 1;
      const defeated = newCompleted >= c.totalSets;
      return { ...c, completedSets: newCompleted, defeated, poofing: defeated };
    }));

    // Start rest (if not final set) — 500ms reward delay first
    const newCompleted = card.completedSets + 1;
    setComboCount(prev => prev + 1);
    if (newCompleted < card.totalSets) {
      const isCompound = ['squat', 'bench', 'deadlift', 'press', 'row'].some(n => card.name.toLowerCase().includes(n));
      const duration = isCompound ? 90 : 60;
      setRestMax(duration);
      setTimeout(() => { setRestSeconds(duration); setIsResting(true); }, 500);
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

  const logDurationAttack = async (seconds: number) => {
    const aliveCards = cards.filter(c => !c.defeated);
    const card = aliveCards[activeIndex];
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
      <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center px-6">
        <p className={`text-[12px] ${colors.headerText} mb-6 tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ⚔ VICTORY ⚔
        </p>
        <div className={`w-full max-w-sm border-2 ${colors.primary} bg-zinc-900 p-6 space-y-4`}>
          <div className="text-center space-y-2">
            <p className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{victory.exercisesDefeated} ENEMIES DEFEATED</p>
            <p className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>⏱ {victory.duration}</p>
            <p className={`text-[10px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>★ {victory.totalXp} XP EARNED</p>
          </div>
          {victory.rankUps.length > 0 && (
            <div className="border-t border-zinc-800 pt-3 space-y-1">
              <p className="text-[8px] text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>RANKS EARNED</p>
              {victory.rankUps.map((r, i) => (
                <p key={i} className="text-xs text-zinc-200">{r.name} LV{r.from}→LV{r.to}</p>
              ))}
            </div>
          )}
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
      `}</style>
      {/* Arena backdrop */}
      <img
        src={`/themes/${currentTheme}/v2/banner.png`}
        alt=""
        className="fixed bottom-0 left-0 right-0 w-full h-[40vh] object-cover object-bottom pointer-events-none opacity-[0.07]"
        style={{ imageRendering: 'pixelated', maskImage: 'linear-gradient(transparent 0%, black 30%, black 70%, transparent 100%)' }}
      />

      {/* Top bar: XP counter + combo + encounter counter */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => setShowEndConfirm(true)} className="text-zinc-600 text-xs">✕</button>
        <div className="flex items-center gap-3">
          {sessionXp > 0 && (
            <span className={`text-[10px] ${colors.secondary} font-bold`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ⚡{sessionXp}
            </span>
          )}
          {comboCount >= 3 && (
            <span className={`text-[9px] ${comboCount >= 10 ? 'text-red-400' : comboCount >= 5 ? 'text-amber-400' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              🔥{comboCount}x
            </span>
          )}
          <span className={`text-[8px] text-zinc-500 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {aliveCards.length === 1 && cards.filter(c => c.defeated).length > 0 ? (currentTheme !== 'athlete' ? '⚔ FINAL' : 'LAST') : `${cards.filter(c => c.defeated).length}/${cards.length}`}
          </span>
        </div>
        <div className="w-4" />
      </div>

      {/* Theme banner strip */}
      <div className={`mx-4 mb-2 border ${colors.border} overflow-hidden relative`}>
        <img
          src={`/themes/${currentTheme}/v2/banner.png`}
          alt=""
          className="w-full h-auto opacity-40"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${colors.scanline} 2px, ${colors.scanline} 4px)`
        }} />
      </div>

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
                <span className={`text-sm font-bold ${colors.secondary}`} style={{ animation: 'xpFloat 800ms ease-out forwards', fontFamily: "var(--font-pixel), monospace" }}>
                  +{xpPop}
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
            <p className={`text-[10px] ${colors.headerText} mb-4`} style={{ fontFamily: "var(--font-pixel), monospace" }}>END BATTLE?</p>
            <p className="text-xs text-zinc-500 mb-4">Progress is saved. You can resume later.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className={`flex-1 py-3 border ${colors.border} bg-zinc-800 text-zinc-300 text-[9px]`} style={{ fontFamily: "var(--font-pixel), monospace" }}>KEEP GOING</button>
              <button onClick={onComplete} className="flex-1 py-3 border border-red-800 bg-zinc-800 text-red-400 text-[9px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>END</button>
            </div>
          </div>
        </div>
      )}

      {/* Rank-up toast */}
      {rankUpToast && (
        <div className="fixed top-16 left-4 right-4 z-50 flex justify-center animate-in slide-in-from-top-4">
          <div className={`border-2 ${colors.primary} bg-zinc-900 px-4 py-3 text-center`} style={{ boxShadow: colors.glow }}>
            <p className={`text-[10px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ⚡ RANK UP! {rankUpToast}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Lifting Card ---
function LiftingCard({ card, isActive, colors, currentTheme, weight, reps, onWeightChange, onRepsChange, isResting, restSeconds, restMax, onLogAttack, onSkipRest, subExerciseIdx, catalog, onSwap }: {
  card: BattleCard; isActive: boolean; colors: any; currentTheme: string;
  weight: string; reps: string; onWeightChange: (v: string) => void; onRepsChange: (v: string) => void;
  isResting: boolean; restSeconds: number; restMax: number; onLogAttack: () => void; onSkipRest: () => void;
  subExerciseIdx: number; catalog: CatalogItem[]; onSwap: (exId: string, name: string) => void;
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
      {/* Enemy header */}
      <div>
        {isSuperset ? (
          <div className="space-y-2">
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
            <div className="flex items-center gap-2">
              <img src={`/themes/${currentTheme}/v2/level${card.catalogItem?.standards ? '1' : '0'}.png`} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />
              <p className="text-xs text-white font-medium truncate max-w-[200px]">{displayName}</p>
            </div>
            <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {card.completedSets + 1 === card.totalSets ? (combat ? '⚡ FINAL STRIKE' : '⚡ LAST SET') : combat ? `STRIKE ${card.completedSets + 1}/${card.totalSets}` : `SET ${card.completedSets + 1}/${card.totalSets}`}
            </span>
          </div>
        )}
      </div>

      {/* HP Bar (enemy health drains as you attack) */}
      <PixelBar current={card.completedSets} max={card.totalSets} inverted={combat} />

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
      <div className="grid grid-cols-2 gap-3">
        <div className={`border ${colors.border} bg-zinc-800 p-3 text-center`}>
          <input
            type="number"
            inputMode="numeric"
            value={weight}
            onChange={e => onWeightChange(e.target.value)}
            className="w-full bg-transparent text-center text-xl text-white outline-none placeholder:text-zinc-600"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
            placeholder={card.lastWeight ? String(card.lastWeight) : '0'}
          />
          <p className="text-[7px] text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>LBS</p>
        </div>
        <div className={`border ${colors.border} bg-zinc-800 p-3 text-center`}>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => onRepsChange(e.target.value)}
            className="w-full bg-transparent text-center text-xl text-white outline-none placeholder:text-zinc-600"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
            placeholder={String(card.targetReps || 8)}
          />
          <p className="text-[7px] text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>REPS</p>
        </div>
      </div>

      {/* LOG ATTACK / REST button */}
      {isResting ? (
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
          </div>
        </button>
      ) : (
        <button
          onClick={(e) => { (e.currentTarget as HTMLElement).style.animation = 'shake 200ms'; setTimeout(() => { (e.currentTarget as HTMLElement).style.animation = ''; }, 200); onLogAttack(); }}
          className={`w-full py-4 border-2 ${card.completedSets + 1 === card.totalSets && combat ? 'border-red-500 animate-pulse' : colors.primary} bg-zinc-800 text-center transition-colors hover:bg-zinc-700`}
        >
          <span className={`text-[10px] ${card.completedSets + 1 === card.totalSets && combat ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {combat
              ? (card.completedSets + 1 === card.totalSets ? '💀 FINISH' : card.completedSets === 0 ? '⚔ ATTACK' : card.completedSets === 1 ? '⚔⚔ STRIKE' : '⚔⚔⚔ CRUSH')
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
  card: BattleCard; isActive: boolean; colors: any; currentTheme: string; onComplete: (seconds: number) => void;
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
          onComplete(prev + 1);
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
          if (running) { setRunning(false); onComplete(elapsed); setElapsed(0); }
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
  card: BattleCard; isActive: boolean; colors: any; onComplete: (seconds: number) => void;
}) {
  const intervals = card.intervals || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = intervals[currentIdx];
  const totalElapsed = intervals.slice(0, currentIdx).reduce((s, i) => s + i.seconds, 0) + elapsed;
  const totalDuration = card.targetSeconds || intervals.reduce((s, i) => s + i.seconds, 0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!running || !current) return;
    const t = setInterval(() => {
      setElapsed(prev => {
        // 3-second countdown beep
        if (prev + 1 === current.seconds - 3) {
          import('@/utils/audio').then(m => m.playCountdownBeep(600, 0.1));
        }
        if (prev + 1 >= current.seconds) {
          // Beep on zone transition
          import('@/utils/audio').then(m => m.playCountdownBeep(1000, 0.15));
          import('@/utils/haptics').then(m => m.haptic('medium'));
          if (currentIdx + 1 < intervals.length) {
            setCurrentIdx(i => i + 1);
            return 0;
          } else {
            setRunning(false);
            setFinished(true);
            onCompleteRef.current(totalDuration);
            return prev + 1;
          }
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, currentIdx, current, intervals.length, totalDuration]);

  if (finished) {
    return (
      <div className={`border-2 ${colors.primary} bg-zinc-900 p-4 text-center`}>
        <p className={`text-[10px] ${colors.secondary} mb-2`} style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ CARDIO COMPLETE</p>
        <p className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{Math.round(totalDuration / 60)} min</p>
      </div>
    );
  }

  return (
    <div className={`border-2 ${isActive ? colors.primary : colors.border} bg-zinc-900 p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white font-medium">{card.name}</p>
        <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {Math.round(totalElapsed / 60)}/{Math.round(totalDuration / 60)} MIN
        </span>
      </div>

      {/* Overall progress */}
      <div className="h-2 bg-zinc-800 border border-zinc-700 flex">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`flex-1 border-r border-zinc-900 ${i < Math.round((totalElapsed / totalDuration) * 20) ? colors.barFill : ''}`} />
        ))}
      </div>

      {/* Current zone */}
      {current && (
        <div className="text-center py-4">
          <p className={`text-[10px] uppercase mb-1 font-bold ${current.color.includes('red') ? 'text-red-400' : current.color.includes('orange') ? 'text-orange-400' : 'text-green-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {current.zone}
          </p>
          <p className="text-[11px] text-zinc-400 mb-3">
            {current.zone === 'Comfortable' ? 'Easy pace — can hold a conversation' :
             current.zone === 'Challenging' ? 'Push it — breathing hard, can still talk in short phrases' :
             current.zone === 'Full Send' ? 'All out — max effort, sprint' :
             'Steady effort'}
          </p>
          {current.note && (
            <p className="text-[11px] text-amber-400 mb-2 font-medium">📐 {current.note}</p>
          )}
          <span className="text-4xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {running ? (current.seconds - elapsed) : current.seconds}
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

      {/* Start / Stop */}
      <button
        onClick={() => setRunning(!running)}
        className={`w-full py-4 border-2 ${running ? 'border-red-500' : colors.primary} bg-zinc-800 text-center transition-colors hover:bg-zinc-700`}
      >
        <span className={`text-[10px] ${running ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {running ? '■ PAUSE' : '▶ START CARDIO'}
        </span>
      </button>
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
