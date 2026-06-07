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

    // Known running types (46=running, 47=running_treadmill)
    if (typeCode === 46 || typeCode === 47) {
      const ranked = await tryRankRun(supabase, userId, bodyweight, dur, distMeters);
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

async function tryRankRun(supabase: any, userId: string, bodyweight: number, dur: number, distMeters: number): Promise<{ exerciseId: string; level: number } | null> {
  const distMiles = distMeters / 1609.34;
  let rankedExerciseId: string | null = null;
  if (distMiles >= 0.9 && distMiles <= 1.1) rankedExerciseId = 'run_1_mile';
  else if (distMeters >= 350 && distMeters <= 450) rankedExerciseId = 'run_400m';
  else if (distMiles >= 1.9 && distMiles <= 2.1) rankedExerciseId = 'run_2_mile';
  else if (distMiles >= 3.0 && distMiles <= 3.7) rankedExerciseId = 'run_5k';
  else if (distMiles >= 4.8 && distMiles <= 5.2) rankedExerciseId = 'running_5_miles';

  if (!rankedExerciseId) return null;

  try {
    const { logTrainingAction } = await import('@/app/actions');
    const result = await logTrainingAction(userId, rankedExerciseId, bodyweight, 'male', [{ duration: dur, weight: 0 }]);
    return { exerciseId: rankedExerciseId, level: result.level };
  } catch (e: any) {
    console.error('Ranked exercise failed:', e.message);
    return null;
  }
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
