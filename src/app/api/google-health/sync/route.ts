import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { getValidToken, getTodaySteps, getTodayCalories, getLatestSleep, getLatestWeight } from '@/lib/google-health';
import { stepsToXp } from '@/utils/xp';

export async function POST(request: NextRequest) {
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
  if (!token) return NextResponse.json({ error: 'Google Health not connected or token expired' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: userRow } = await supabase.from('users').select('timezone').eq('id', userId).single();
  const tz = userRow?.timezone || 'America/New_York';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-CA', { timeZone: tz });
  const ts = Math.floor(Date.now() / 1000);
  const synced: string[] = [];

  try {
    // Steps
    const steps = await getTodaySteps(token, today).catch(() => null);
    if (steps !== null) {
      await upsertHabit(supabase, userId, 'habit_steps', dateStr, ts, steps, stepsToXp(steps));
      synced.push(`steps: ${steps}`);
    }

    // Calories
    const cals = await getTodayCalories(token, today).catch(() => null);
    if (cals !== null) {
      await supabase.from('nutrition_logs').delete().eq('user_id', userId).eq('date', dateStr).eq('macro_type', 'calories_burned');
      await supabase.from('nutrition_logs').insert({
        user_id: userId, date: dateStr, timestamp: ts,
        macro_type: 'calories_burned', amount: cals, xp: 10, label: 'Google Health Sync',
      });
      synced.push(`calories: ${cals}`);
    }

    // Sleep
    const sleepHours = await getLatestSleep(token, today).catch(() => null);
    if (sleepHours !== null) {
      await upsertHabit(supabase, userId, 'habit_sleep', dateStr, ts, sleepHours, Math.round(sleepHours * 2));
      synced.push(`sleep: ${sleepHours}h`);
    }

    // Weight
    const weight = await getLatestWeight(token).catch(() => null);
    if (weight !== null) {
      await supabase.from('body_measurements').upsert(
        { user_id: userId, date: dateStr, weight },
        { onConflict: 'user_id,date' }
      );
      await supabase.from('users').update({ bodyweight: weight }).eq('id', userId);
      synced.push(`weight: ${weight} lbs`);
    }

    return NextResponse.json({ synced });
  } catch (e: any) {
    console.error('Google Health sync error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function upsertHabit(supabase: any, userId: string, habitId: string, date: string, ts: number, value: number, xp: number) {
  await supabase.from('habit_logs').delete().eq('user_id', userId).eq('habit_id', habitId).eq('date', date);
  await supabase.from('habit_logs').insert({
    user_id: userId, habit_id: habitId, date, timestamp: ts, value, xp,
  });
}
