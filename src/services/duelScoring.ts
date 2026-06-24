import { createClient } from '@/utils/supabase/client';

interface DuelScore {
  challengerScore: number;
  opponentScore: number;
}

/**
 * Compute live duel score based on duel_type by querying actual user data
 * between start_at and end_at timestamps.
 */
export async function computeDuelScores(
  duelType: string,
  challengerId: string,
  opponentId: string | null,
  startAt: number,
  endAt: number
): Promise<DuelScore> {
  if (!opponentId) return { challengerScore: 0, opponentScore: 0 };

  const startDate = new Date(startAt * 1000).toLocaleDateString('en-CA');
  const now = new Date();
  const endDate = now.getTime() / 1000 < endAt
    ? now.toLocaleDateString('en-CA')
    : new Date(endAt * 1000).toLocaleDateString('en-CA');

  const [c, o] = await Promise.all([
    getScoreForUser(challengerId, duelType, startDate, endDate, startAt, endAt),
    getScoreForUser(opponentId, duelType, startDate, endDate, startAt, endAt),
  ]);

  return { challengerScore: c, opponentScore: o };
}

async function getScoreForUser(
  userId: string,
  duelType: string,
  startDate: string,
  endDate: string,
  startAt: number,
  endAt: number
): Promise<number> {
  const supabase = createClient();

  switch (duelType) {
    case 'xp': {
      const startTs = new Date(startAt * 1000).toISOString();
      const endTs = new Date(Math.min(endAt * 1000, Date.now())).toISOString();
      const { data } = await supabase.from('xp_ledger')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', startTs)
        .lte('created_at', endTs);
      return (data || []).reduce((s, r) => s + (r.amount || 0), 0);
    }

    case 'steps': {
      const { data } = await supabase.from('habit_logs')
        .select('value')
        .eq('user_id', userId)
        .eq('habit_id', 'habit_steps')
        .gte('date', startDate)
        .lte('date', endDate);
      return (data || []).reduce((s, r) => s + (r.value || 0), 0);
    }

    case 'volume': {
      const { data } = await supabase.from('workouts')
        .select('sets')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);
      let total = 0;
      for (const w of data || []) {
        for (const set of (Array.isArray(w.sets) ? w.sets : [])) {
          total += (set.weight || 0) * (set.reps || 0);
        }
      }
      return total;
    }

    case 'distance': {
      const { data } = await supabase.from('workouts')
        .select('raw_value, exercise_id')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .like('exercise_id', 'synced_Run%');
      // raw_value for runs is duration, but we need distance — check habit_logs for cardio distance
      // Actually, synced cardio logs don't store distance. Use workouts that are runs with known distances.
      const { data: cardio } = await supabase.from('workouts')
        .select('exercise_id')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('exercise_id', ['run_400m', 'run_1_mile', 'run_5k']);
      const distMap: Record<string, number> = { run_400m: 0.25, run_1_mile: 1, run_5k: 3.1 };
      let miles = 0;
      for (const w of cardio || []) {
        miles += distMap[w.exercise_id] || 0;
      }
      return Math.round(miles * 10) / 10;
    }

    case 'sessions': {
      const { data } = await supabase.from('workouts')
        .select('date')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);
      const uniqueDays = new Set((data || []).map(w => w.date));
      return uniqueDays.size;
    }

    case 'active_minutes': {
      const { data } = await supabase.from('habit_logs')
        .select('value')
        .eq('user_id', userId)
        .eq('habit_id', 'habit_exercise_minutes')
        .gte('date', startDate)
        .lte('date', endDate);
      return (data || []).reduce((s, r) => s + (r.value || 0), 0);
    }

    default:
      return 0;
  }
}
