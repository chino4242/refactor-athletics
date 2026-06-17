import { createClient } from '@/utils/supabase/client';

export type BountyType = 'volume' | 'distance' | 'sessions' | 'rank_chase' | 'consistency' | 'nutrition' | 'arena';
export type Pillar = 'training' | 'consistency' | 'social';
export type Difficulty = 'easy' | 'normal' | 'hard';

const PILLAR_TYPES: Record<Pillar, BountyType[]> = {
  training: ['volume', 'distance', 'sessions', 'rank_chase'],
  consistency: ['consistency', 'nutrition'],
  social: ['arena'],
};

const FALLBACK_TARGETS: Record<BountyType, number> = {
  volume: 5000,
  distance: 3,
  sessions: 3,
  rank_chase: 1,
  consistency: 4,
  nutrition: 5,
  arena: 1,
};

const DIFFICULTY_MODIFIERS: Record<Difficulty, number> = { easy: 0.75, normal: 1, hard: 1.25 };
const DIFFICULTY_XP: Record<Difficulty, number> = { easy: 100, normal: 150, hard: 225 };
const SWEEP_XP: Record<Difficulty, number> = { easy: 25, normal: 50, hard: 100 };

export const BOUNTY_LABELS: Record<BountyType, (target: number) => string> = {
  volume: (t) => `Lift ${t.toLocaleString()} lbs total`,
  distance: (t) => `Run ${t} miles`,
  sessions: (t) => `Complete ${t} workouts`,
  rank_chase: () => `Rank up any exercise`,
  consistency: (t) => `Train on ${t} different days`,
  nutrition: (t) => `Track meals ${t}/7 days`,
  arena: () => `Complete a challenge or duel`,
};

/** Get Monday of the current week as 'YYYY-MM-DD' */
export function getCurrentWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - ((day + 6) % 7);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return monday.toLocaleDateString('en-CA');
}

/** Deterministic weekly rotation: pick 1 type per pillar based on week number */
function getWeeklyTypes(weekStart: string): Record<Pillar, BountyType> {
  const epoch = new Date('2026-01-05'); // a Monday
  const weekNum = Math.floor((new Date(weekStart).getTime() - epoch.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return {
    training: PILLAR_TYPES.training[weekNum % PILLAR_TYPES.training.length],
    consistency: PILLAR_TYPES.consistency[weekNum % PILLAR_TYPES.consistency.length],
    social: PILLAR_TYPES.social[0], // only 1 type
  };
}

export interface BountyWithProgress {
  id: string;
  pillar: Pillar;
  bountyType: BountyType;
  description: string;
  target: number;
  current: number;
  difficulty: Difficulty;
  difficultyLocked: boolean;
  completed: boolean;
  xp: number;
}

/** Get or generate this week's bounties, then compute live progress */
export async function getWeeklyBounties(userId: string): Promise<BountyWithProgress[]> {
  const supabase = createClient();
  const weekStart = getCurrentWeekStart();

  // Check if bounties exist for this week
  let { data: existing } = await supabase
    .from('weekly_bounties')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart);

  if (!existing || existing.length === 0) {
    // Generate new bounties
    const types = getWeeklyTypes(weekStart);
    const targets = await getPersonalizedTargets(userId, types);

    const rows = (['training', 'consistency', 'social'] as Pillar[]).map((pillar) => ({
      user_id: userId,
      week_start: weekStart,
      pillar,
      bounty_type: types[pillar],
      target: targets[pillar],
      difficulty: 'normal' as Difficulty,
    }));

    const { data: inserted, error } = await supabase
      .from('weekly_bounties')
      .upsert(rows, { onConflict: 'user_id,week_start,pillar', ignoreDuplicates: true })
      .select();

    existing = inserted || [];
  }

  // Compute live progress
  const progress = await computeProgress(userId, weekStart, existing);
  return progress;
}

/** Update difficulty for a bounty (only if not locked) */
export async function setDifficulty(bountyId: string, difficulty: Difficulty): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('weekly_bounties')
    .update({ difficulty, target: undefined }) // target recalc handled below
    .eq('id', bountyId)
    .eq('difficulty_locked', false);
  return !error;
}

async function getPersonalizedTargets(userId: string, types: Record<Pillar, BountyType>): Promise<Record<Pillar, number>> {
  const supabase = createClient();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');

  const { data: workouts } = await supabase
    .from('workouts')
    .select('date, raw_value, sets, level')
    .eq('user_id', userId)
    .gte('date', fourWeeksAgo);

  const { data: nutrition } = await supabase
    .from('nutrition_logs')
    .select('date')
    .eq('user_id', userId)
    .gte('date', fourWeeksAgo);

  const targets: Record<Pillar, number> = { training: 0, consistency: 0, social: 0 };

  // Training pillar
  if (types.training === 'volume') {
    const totalVol = (workouts || []).reduce((sum, w) => {
      if (Array.isArray(w.sets)) return sum + w.sets.reduce((s: number, set: any) => s + ((set.weight || 0) * (set.reps || 1)), 0);
      return sum + (w.raw_value || 0);
    }, 0);
    targets.training = Math.round((totalVol / 4) || FALLBACK_TARGETS.volume);
  } else if (types.training === 'sessions') {
    const uniqueDates = new Set((workouts || []).map(w => w.date));
    targets.training = Math.round((uniqueDates.size / 4) || FALLBACK_TARGETS.sessions);
  } else if (types.training === 'distance') {
    targets.training = FALLBACK_TARGETS.distance; // TODO: compute from cardio logs
  } else {
    targets.training = FALLBACK_TARGETS.rank_chase;
  }

  // Consistency pillar
  if (types.consistency === 'consistency') {
    const uniqueDates = new Set((workouts || []).map(w => w.date));
    targets.consistency = Math.round((uniqueDates.size / 4) || FALLBACK_TARGETS.consistency);
  } else {
    const uniqueDates = new Set((nutrition || []).map(n => n.date));
    targets.consistency = Math.round((uniqueDates.size / 4) || FALLBACK_TARGETS.nutrition);
  }

  // Social — always 1
  targets.social = FALLBACK_TARGETS.arena;

  return targets;
}

async function computeProgress(userId: string, weekStart: string, bounties: any[]): Promise<BountyWithProgress[]> {
  const supabase = createClient();
  const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');

  const [{ data: workouts }, { data: nutrition }] = await Promise.all([
    supabase.from('workouts').select('date, raw_value, sets, level').eq('user_id', userId).gte('date', weekStart),
    supabase.from('nutrition_logs').select('date').eq('user_id', userId).gte('date', weekStart),
  ]);

  const workoutDates = new Set((workouts || []).map(w => w.date));
  const nutritionDates = new Set((nutrition || []).map(n => n.date));

  return bounties.map((b) => {
    const difficulty = b.difficulty as Difficulty;
    const modifier = DIFFICULTY_MODIFIERS[difficulty];
    const adjustedTarget = Math.round(b.target * modifier);

    let current = 0;
    switch (b.bounty_type as BountyType) {
      case 'volume':
        current = (workouts || []).reduce((sum, w) => {
          if (Array.isArray(w.sets)) return sum + w.sets.reduce((s: number, set: any) => s + ((set.weight || 0) * (set.reps || 1)), 0);
          return sum + (w.raw_value || 0);
        }, 0);
        break;
      case 'sessions':
        current = workoutDates.size;
        break;
      case 'distance':
        current = 0; // TODO: cardio distance tracking
        break;
      case 'rank_chase':
        current = (workouts || []).some(w => w.level > 0) ? 1 : 0; // simplified — any ranked log counts
        break;
      case 'consistency':
        current = workoutDates.size;
        break;
      case 'nutrition':
        current = nutritionDates.size;
        break;
      case 'arena':
        current = 0; // TODO: track challenge/duel completions
        break;
    }

    return {
      id: b.id,
      pillar: b.pillar as Pillar,
      bountyType: b.bounty_type as BountyType,
      description: BOUNTY_LABELS[b.bounty_type as BountyType](adjustedTarget),
      target: adjustedTarget,
      current: Math.round(current),
      difficulty,
      difficultyLocked: b.difficulty_locked,
      completed: b.completed || current >= adjustedTarget,
      xp: DIFFICULTY_XP[difficulty],
    };
  });
}
