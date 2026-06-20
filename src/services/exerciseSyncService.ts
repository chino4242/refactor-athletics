/**
 * Shared exercise sync service — processes raw exercise sessions from
 * Health Connect / HealthKit into ranked workouts or pending exercises.
 *
 * Used by:
 * - /api/sync/exercises (native, session auth)
 * - /api/sync/health-connect (legacy webhook, sync_token auth)
 */

export interface RawExercise {
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  durationSeconds?: number;
  distance_meters?: number;
  distanceMeters?: number;
  distance?: number;
  type?: string;
  exerciseType?: string;
  exercise_type?: string;
  steps?: number;
  avg_cadence_spm?: number;
  cadence?: number;
  stride_length_m?: number;
  // Capacitor health plugin format
  startDate?: string;
  endDate?: string;
  duration?: number;
  value?: number;
  [key: string]: any;
}

export interface ExerciseSyncResult {
  synced: string[];
  totalMinutes: number;
}

export async function processExerciseSessions(
  supabase: any,
  userId: string,
  bodyweight: number,
  sex: string,
  timezone: string,
  exercises: RawExercise[]
): Promise<ExerciseSyncResult> {
  const synced: string[] = [];
  const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  const ts = Math.floor(Date.now() / 1000);

  // Filter to last 36 hours
  const recentExercise = exercises.filter(r => {
    const t = r.start_time || r.end_time || r.startDate || r.endDate;
    if (!t) return true;
    try {
      const diffHours = (Date.now() - new Date(t).getTime()) / (1000 * 60 * 60);
      return diffHours < 36;
    } catch { return true; }
  });

  // Calculate exercise minutes (today only) for habit tracking
  const todayOnly = recentExercise.filter(r => {
    const t = r.start_time || r.end_time || r.startDate;
    if (!t) return true;
    try { return new Date(t).toLocaleDateString('en-CA', { timeZone: timezone }) === today; } catch { return true; }
  });
  const totalMin = Math.round(todayOnly.reduce((s, r) => {
    const dur = getDuration(r);
    return s + dur / 60;
  }, 0));

  // Process individual sessions
  for (const ex of recentExercise) {
    const dur = getDuration(ex);
    const distMeters = ex.distance_meters || ex.distanceMeters || ex.distance || 0;
    const typeCode = parseInt(ex.type || ex.exerciseType || ex.exercise_type || '0') || 0;
    const exTime = ex.start_time || ex.end_time || ex.startDate || ex.endDate;
    const exDate = exTime ? new Date(exTime).toLocaleDateString('en-CA', { timeZone: timezone }) : today;
    const exTs = exTime ? Math.floor(new Date(exTime).getTime() / 1000) : ts;

    if (dur < 60) continue;

    // Try to rank any exercise with running distance (400m+)
    if (distMeters >= 400) {
      const ranked = await tryRankRun(supabase, userId, bodyweight, sex, dur, distMeters);
      if (ranked) {
        synced.push(`${ranked.exerciseId}: Lv.${ranked.level}`);
        continue;
      }
    }

    // Save as pending for user confirmation
    const suggestedType = detectExerciseType(ex, dur, distMeters, typeCode);
    const { data: existing } = await supabase.from('pending_exercises')
      .select('id').eq('user_id', userId).eq('date', exDate).eq('duration_seconds', dur).limit(1);
    if (!existing?.length) {
      await supabase.from('pending_exercises').insert({
        user_id: userId, date: exDate, timestamp: exTs,
        duration_seconds: dur, distance_meters: distMeters,
        steps: ex.steps || null, avg_cadence: ex.avg_cadence_spm || ex.cadence || null,
        stride_length: ex.stride_length_m || null,
        suggested_type: suggestedType, raw_data: ex,
      });
      synced.push(`pending: ${suggestedType} ${Math.round(dur / 60)}min`);
    }
  }

  return { synced, totalMinutes: totalMin };
}

function getDuration(ex: RawExercise): number {
  const dur = ex.duration_seconds || ex.durationSeconds || ex.duration || ex.value || 0;
  if (dur > 0) return dur;
  if (ex.start_time && ex.end_time) return (new Date(ex.end_time).getTime() - new Date(ex.start_time).getTime()) / 1000;
  if (ex.startDate && ex.endDate) return (new Date(ex.endDate).getTime() - new Date(ex.startDate).getTime()) / 1000;
  return 0;
}

async function tryRankRun(supabase: any, userId: string, bodyweight: number, sex: string, dur: number, distMeters: number): Promise<{ exerciseId: string; level: number } | null> {
  const distMiles = distMeters / 1609.34;
  const results: { exerciseId: string; level: number }[] = [];

  try {
    const { logTrainingAction } = await import('@/app/actions');

    // Evaluate ALL applicable distances from this single run (assume even pace for splits)
    const paceSecPerMeter = distMeters > 0 ? dur / distMeters : 0;

    // 400m: if ran at least 400m, estimate 400m time
    if (distMeters >= 400) {
      const time400m = Math.round(paceSecPerMeter * 400);
      const result = await logTrainingAction(userId, 'run_400m', bodyweight, sex, [{ duration: time400m, weight: 0 }]);
      if (result?.level > 0) results.push({ exerciseId: 'run_400m', level: result.level });
    }

    // 1 mile: if ran at least 1 mile, estimate mile time
    if (distMeters >= 1609) {
      const timeMile = Math.round(paceSecPerMeter * 1609.34);
      const result = await logTrainingAction(userId, 'run_1_mile', bodyweight, sex, [{ duration: timeMile, weight: 0 }]);
      if (result?.level > 0) results.push({ exerciseId: 'run_1_mile', level: result.level });
    }

    // 5K: if ran at least 5K, use actual total time
    if (distMeters >= 5000) {
      const time5k = distMeters <= 5500 ? dur : Math.round(paceSecPerMeter * 5000);
      const result = await logTrainingAction(userId, 'run_5k', bodyweight, sex, [{ duration: time5k, weight: 0 }]);
      if (result?.level > 0) results.push({ exerciseId: 'run_5k', level: result.level });
    }
  } catch (e: any) {
    console.error('Ranked run failed:', e.message);
  }

  // Return the highest-level result (or null if none ranked)
  if (results.length === 0) return null;
  return results.sort((a, b) => b.level - a.level)[0];
}

function detectExerciseType(ex: RawExercise, dur: number, distMeters: number, typeCode: number): string {
  const cadence = ex.avg_cadence_spm || ex.cadence || 0;
  const distMiles = distMeters / 1609.34;
  const paceMinPerMile = distMiles > 0 ? (dur / 60) / distMiles : 999;

  if (typeCode === 46 || typeCode === 47) return 'run';
  if (typeCode === 8 || typeCode === 9) return 'bike';
  if (typeCode === 69) return 'walk';
  if (cadence > 130 && distMeters > 500 && paceMinPerMile < 15) return 'run';
  if (distMeters > 1000 && paceMinPerMile < 5) return 'bike';
  if (cadence > 0 && cadence <= 130 && distMeters > 200) return 'walk';
  if (distMeters > 500 && paceMinPerMile >= 15) return 'walk';
  if (distMeters > 500 && paceMinPerMile < 15) return 'run';
  if (distMeters > 200) return 'walk';
  return 'other';
}
