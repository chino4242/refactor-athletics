import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
      || new URL(request.url).searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

    const supabase = createServiceClient();
    const { data: user } = await supabase.from('users').select('id, bodyweight').eq('sync_token', token).single();
    if (!user) return NextResponse.json({ error: 'Invalid sync token' }, { status: 401 });

    const body = await request.json();
    const today = new Date().toISOString().split('T')[0];
    const ts = Math.floor(Date.now() / 1000);
    const synced: string[] = [];

    // Steps — sum all records
    if (body.steps?.length) {
      const total = body.steps.reduce((s: number, r: any) => s + (r.count || 0), 0);
      await upsertHabit(supabase, user.id, 'habit_steps', today, ts, total, Math.min(Math.round(total * 0.005), 75));
      synced.push(`steps: ${total}`);
    }

    // Sleep — use longest session
    if (body.sleep?.length) {
      const longest = body.sleep.reduce((max: any, s: any) => (s.duration_seconds || 0) > (max.duration_seconds || 0) ? s : max, body.sleep[0]);
      const hours = Math.round((longest.duration_seconds || 0) / 3600 * 10) / 10;
      if (hours > 0) {
        await upsertHabit(supabase, user.id, 'habit_sleep', today, ts, hours, Math.round(hours * 2));
        synced.push(`sleep: ${hours}h`);
      }
    }

    // Active calories
    if (body.active_calories?.length) {
      const total = Math.round(body.active_calories.reduce((s: number, r: any) => s + (r.calories || 0), 0));
      await supabase.from('nutrition_logs').delete().eq('user_id', user.id).eq('date', today).eq('macro_type', 'calories_burned');
      await supabase.from('nutrition_logs').insert({
        user_id: user.id, date: today, timestamp: ts,
        macro_type: 'calories_burned', amount: total, xp: 10, label: 'Health Connect',
      });
      synced.push(`calories: ${total}`);
    }

    // Weight — use latest
    if (body.weight?.length) {
      const latest = body.weight[body.weight.length - 1];
      const lbs = Math.round((latest.kilograms || 0) * 2.20462 * 10) / 10;
      if (lbs > 0) {
        await supabase.from('users').update({ bodyweight: lbs }).eq('id', user.id);
        await supabase.from('body_measurements').delete().eq('user_id', user.id).eq('date', today);
        await supabase.from('body_measurements').insert({ user_id: user.id, date: today, weight: lbs, timestamp: ts });
        synced.push(`weight: ${lbs} lbs`);
      }
    }

    // Hydration — sum liters to oz
    if (body.hydration?.length) {
      const totalOz = Math.round(body.hydration.reduce((s: number, r: any) => s + (r.liters || 0), 0) * 33.814);
      if (totalOz > 0) {
        await upsertHabit(supabase, user.id, 'habit_water', today, ts, totalOz, Math.round(totalOz * 0.25));
        synced.push(`water: ${totalOz} oz`);
      }
    }

    // Body fat
    if (body.body_fat?.length) {
      const latest = body.body_fat[body.body_fat.length - 1];
      const pct = latest.percentage || latest.body_fat_percentage;
      if (pct) {
        await supabase.from('body_measurements').delete().eq('user_id', user.id).eq('date', today);
        await supabase.from('body_measurements').insert({
          user_id: user.id, date: today, body_fat_percentage: pct, timestamp: ts,
          ...(body.weight?.length ? { weight: Math.round(body.weight[body.weight.length - 1].kilograms * 2.20462 * 10) / 10 } : {}),
        });
        synced.push(`body fat: ${pct}%`);
      }
    }

    return NextResponse.json({ synced });
  } catch (e: any) {
    console.error('Health Connect webhook error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function upsertHabit(supabase: any, userId: string, habitId: string, date: string, ts: number, value: number, xp: number) {
  await supabase.from('habit_logs').delete().eq('user_id', userId).eq('habit_id', habitId).eq('date', date);
  await supabase.from('habit_logs').insert({
    user_id: userId, habit_id: habitId, date, timestamp: ts, value, xp, label: 'Health Connect',
  });
}
