import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { logTrainingAction } from '@/app/actions';
import { postPartyEvent } from '@/utils/partyEvents';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { exercise_id, type } = await request.json();
  const service = createServiceClient();

  // Fetch the pending exercise
  const { data: ex } = await service.from('pending_exercises')
    .select('*').eq('id', exercise_id).eq('user_id', user.id).single();
  if (!ex) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await service.from('users')
    .select('bodyweight, sex').eq('id', user.id).single();

  const dur = ex.duration_seconds;
  const distMeters = ex.distance_meters || 0;
  const distMiles = distMeters / 1609.34;

  // If it's a run, check for rankable distances
  if (type === 'run') {
    let rankedExerciseId: string | null = null;
    if (distMiles >= 0.9 && distMiles <= 1.1) rankedExerciseId = 'run_1_mile';
    else if (distMeters >= 350 && distMeters <= 450) rankedExerciseId = 'run_400m';
    else if (distMiles >= 1.9 && distMiles <= 2.1) rankedExerciseId = 'run_2_mile';
    else if (distMiles >= 3.0 && distMiles <= 3.7) rankedExerciseId = 'run_5k';

    if (rankedExerciseId) {
      const result = await logTrainingAction(user.id, rankedExerciseId, profile?.bodyweight || 180, profile?.sex || 'male', [{ duration: dur, reps: 1, weight: 0 }]);
      return NextResponse.json({ success: true, ranked: true, level: result.level });
    }
  }

  // Log as generic cardio workout
  const xp = Math.floor((dur / 60) * 8);
  const catalogId = type === 'run' ? 'running_generic' : type === 'bike' ? 'cycling' : type === 'row' ? 'rowing_general' : 'cardio_generic';
  const value = distMeters > 100 ? `${distMiles.toFixed(2)} mi` : `${Math.round(dur / 60)} min`;

  await service.from('workouts').insert({
    user_id: user.id, exercise_id: catalogId, timestamp: ex.timestamp, date: ex.date,
    value, raw_value: dur, sets: null, level: 0, xp, rank_name: null,
  });

  // Post to party
  await postPartyEvent(service, user.id, {
    event_type: 'workout',
    summary: `${type} · ${value}`,
    xp_value: Math.round(xp * 0.5),
    metadata: { exercise: catalogId, distance: distMiles.toFixed(2) },
  });

  return NextResponse.json({ success: true, ranked: false, xp });
}
