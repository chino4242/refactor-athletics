import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { getValidToken, getTodayCycle, getLatestRecovery, getLatestSleep, getBodyMeasurement } from '@/lib/whoop';

export async function POST(request: NextRequest) {
  // Support both authenticated user and cron with userId param
  let userId: string;
  const body = await request.json().catch(() => ({}));

  if (body.userId && body.cronSecret === process.env.CRON_SECRET) {
    userId = body.userId;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
  }

  const token = await getValidToken(userId);
  if (!token) return NextResponse.json({ error: 'WHOOP not connected or token expired' }, { status: 400 });

  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];
  const ts = Math.floor(Date.now() / 1000);
  const synced: string[] = [];

  try {
    // Fetch cycle (strain + calories)
    const cycle = await getTodayCycle(token);
    if (cycle?.score_state === 'SCORED' && cycle.score) {
      const strain = cycle.score.strain;
      const cals = Math.round(cycle.score.kilojoule / 4.184);

      // Day strain
      await upsertHabit(supabase, userId, 'habit_day_strain', today, ts, Math.round(strain * 10) / 10, Math.round(strain * 3));
      synced.push(`strain: ${strain.toFixed(1)}`);

      // Calories burned
      await supabase.from('nutrition_logs').delete().eq('user_id', userId).eq('date', today).eq('macro_type', 'calories_burned');
      await supabase.from('nutrition_logs').insert({
        user_id: userId, date: today, timestamp: ts,
        macro_type: 'calories_burned', amount: cals, xp: 10, label: 'WHOOP Sync',
      });
      synced.push(`calories: ${cals}`);
    }

    // Fetch recovery (HRV, resting HR, recovery score)
    const recovery = await getLatestRecovery(token);
    if (recovery?.score_state === 'SCORED' && recovery.score) {
      const { recovery_score, hrv_rmssd_milli, resting_heart_rate } = recovery.score;
      // Store recovery as a habit for tracking
      await upsertHabit(supabase, userId, 'habit_recovery', today, ts, recovery_score, Math.round(recovery_score * 0.5));
      synced.push(`recovery: ${recovery_score}%`);

      // Store HRV
      await upsertHabit(supabase, userId, 'habit_hrv', today, ts, Math.round(hrv_rmssd_milli * 10) / 10, 10);
      synced.push(`hrv: ${hrv_rmssd_milli.toFixed(1)}ms`);
    }

    // Fetch sleep
    const sleep = await getLatestSleep(token);
    if (sleep?.score?.stage_summary) {
      const totalSleepMs = sleep.score.stage_summary.total_in_bed_time_milli - sleep.score.stage_summary.total_awake_time_milli;
      const sleepHours = Math.round(totalSleepMs / 3600000 * 10) / 10;

      await upsertHabit(supabase, userId, 'habit_sleep', today, ts, sleepHours, Math.round(sleepHours * 2));
      synced.push(`sleep: ${sleepHours}h`);
    }

    // Fetch weight
    const body = await getBodyMeasurement(token).catch(() => null);
    if (body?.weight_kilogram) {
      const weightLbs = Math.round(body.weight_kilogram * 2.20462 * 10) / 10;
      await supabase.from('users').update({ bodyweight: weightLbs }).eq('id', userId);
      await supabase.from('body_measurements').delete().eq('user_id', userId).eq('date', today);
      await supabase.from('body_measurements').insert({ user_id: userId, date: today, weight: weightLbs, timestamp: ts });
      synced.push(`weight: ${weightLbs} lbs`);
    }

    return NextResponse.json({ synced });
  } catch (e: any) {
    console.error('WHOOP sync error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function upsertHabit(supabase: any, userId: string, habitId: string, date: string, ts: number, value: number, xp: number) {
  await supabase.from('habit_logs').delete().eq('user_id', userId).eq('habit_id', habitId).eq('date', date);
  await supabase.from('habit_logs').insert({
    user_id: userId, habit_id: habitId, date, timestamp: ts, value, xp,
  });
}
