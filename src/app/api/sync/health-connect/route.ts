import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
      || new URL(request.url).searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

    const supabase = createServiceClient();
    const { data: user } = await supabase.from('users').select('id, bodyweight, whoop_connected_at, timezone').eq('sync_token', token).single();
    if (!user) return NextResponse.json({ error: 'Invalid sync token' }, { status: 401 });

    const hasWhoop = !!user.whoop_connected_at;
    const body = await request.json();
    console.log('HC Webhook payload keys:', Object.keys(body));
    console.log('HC Webhook payload:', JSON.stringify(body).slice(0, 2000));
    const tz = user.timezone || 'America/New_York';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const ts = Math.floor(Date.now() / 1000);
    const synced: string[] = [];
    const bodyMeasurements: Record<string, any> = {};

    // Steps
    if (body.steps?.length) {
      const total = body.steps.reduce((s: number, r: any) => s + (r.count || 0), 0);
      await upsertHabit(supabase, user.id, 'habit_steps', today, ts, total, Math.min(Math.round(total * 0.005), 75));
      synced.push(`steps: ${total}`);
    }

    // Sleep — longest session (skip if WHOOP connected — WHOOP is more accurate)
    if (body.sleep?.length && !hasWhoop) {
      const longest = body.sleep.reduce((max: any, s: any) => (s.duration_seconds || 0) > (max.duration_seconds || 0) ? s : max, body.sleep[0]);
      const hours = Math.round((longest.duration_seconds || 0) / 3600 * 10) / 10;
      if (hours > 0) {
        await upsertHabit(supabase, user.id, 'habit_sleep', today, ts, hours, Math.round(hours * 2));
        synced.push(`sleep: ${hours}h`);
      }
    }

    // Active calories (skip if WHOOP connected — WHOOP tracks continuously)
    if (body.active_calories?.length && !hasWhoop) {
      const total = Math.round(body.active_calories.reduce((s: number, r: any) => s + (r.calories || 0), 0));
      await supabase.from('nutrition_logs').delete().eq('user_id', user.id).eq('date', today).eq('macro_type', 'calories_burned');
      await supabase.from('nutrition_logs').insert({
        user_id: user.id, date: today, timestamp: ts,
        macro_type: 'calories_burned', amount: total, xp: 10, label: 'Health Connect',
      });
      synced.push(`calories: ${total}`);
    }

    // Hydration — liters to oz
    if (body.hydration?.length) {
      const totalOz = Math.round(body.hydration.reduce((s: number, r: any) => s + (r.liters || 0), 0) * 33.814);
      if (totalOz > 0) {
        await upsertHabit(supabase, user.id, 'habit_water', today, ts, totalOz, Math.round(totalOz * 0.25));
        synced.push(`water: ${totalOz} oz`);
      }
    }

    // HRV — latest reading (skip if WHOOP connected)
    if (body.heart_rate_variability?.length && !hasWhoop) {
      const latest = body.heart_rate_variability[body.heart_rate_variability.length - 1];
      const ms = latest.heartRateVariabilityMillis || latest.millis || latest.value;
      if (ms) {
        await upsertHabit(supabase, user.id, 'habit_hrv', today, ts, Math.round(ms * 10) / 10, 10);
        synced.push(`hrv: ${Math.round(ms * 10) / 10}ms`);
      }
    }

    // Resting heart rate — latest (skip if WHOOP connected)
    if (body.resting_heart_rate?.length && !hasWhoop) {
      const latest = body.resting_heart_rate[body.resting_heart_rate.length - 1];
      const bpm = latest.beatsPerMinute || latest.bpm || latest.value;
      if (bpm) {
        await upsertHabit(supabase, user.id, 'habit_resting_hr', today, ts, Math.round(bpm), 10);
        synced.push(`resting hr: ${Math.round(bpm)} bpm`);
      }
    }

    // Body measurements — collect all, write once
    if (body.weight?.length) {
      const latest = body.weight[body.weight.length - 1];
      const lbs = Math.round((latest.kilograms || 0) * 2.20462 * 10) / 10;
      if (lbs > 0) {
        bodyMeasurements.weight = lbs;
        await supabase.from('users').update({ bodyweight: lbs }).eq('id', user.id);
        synced.push(`weight: ${lbs} lbs`);
      }
    }

    if (body.body_fat?.length) {
      const latest = body.body_fat[body.body_fat.length - 1];
      const pct = latest.percentage || latest.body_fat_percentage;
      if (pct) { bodyMeasurements.body_fat_percentage = pct; synced.push(`body fat: ${pct}%`); }
    }

    if (body.lean_body_mass?.length) {
      const latest = body.lean_body_mass[body.lean_body_mass.length - 1];
      const lbs = Math.round((latest.kilograms || latest.mass || 0) * 2.20462 * 10) / 10;
      if (lbs > 0) { bodyMeasurements.lean_body_mass = lbs; synced.push(`lean mass: ${lbs} lbs`); }
    }

    if (body.vo2_max?.length) {
      const latest = body.vo2_max[body.vo2_max.length - 1];
      const val = latest.vo2MillilitersPerMinuteKilogram || latest.value;
      if (val) { bodyMeasurements.vo2_max = Math.round(val * 10) / 10; synced.push(`vo2 max: ${bodyMeasurements.vo2_max}`); }
    }

    if (body.basal_metabolic_rate?.length) {
      const latest = body.basal_metabolic_rate[body.basal_metabolic_rate.length - 1];
      const kcal = latest.kilocaloriesPerDay || latest.basalMetabolicRate || latest.value;
      if (kcal) { bodyMeasurements.bmr = Math.round(kcal); synced.push(`bmr: ${bodyMeasurements.bmr} kcal`); }
    }

    if (body.height?.length) {
      const latest = body.height[body.height.length - 1];
      const inches = Math.round((latest.meters || latest.heightMeters || 0) * 39.3701 * 10) / 10;
      if (inches > 0) { bodyMeasurements.height = inches; synced.push(`height: ${inches} in`); }
    }

    // Write body measurements if any collected
    if (Object.keys(bodyMeasurements).length > 0) {
      await supabase.from('body_measurements').delete().eq('user_id', user.id).eq('date', today);
      await supabase.from('body_measurements').insert({
        user_id: user.id, date: today, timestamp: ts, ...bodyMeasurements,
      });
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
    user_id: userId, habit_id: habitId, date, timestamp: ts, value, xp,
  });
}
