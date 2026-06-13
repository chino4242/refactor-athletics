import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { stepsToXp } from '@/utils/xp';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
      || new URL(request.url).searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

    const supabase = createServiceClient();
    const { data: user } = await supabase.from('users').select('id, bodyweight, sex, whoop_connected_at, timezone').eq('sync_token', token).single();
    if (!user) return NextResponse.json({ error: 'Invalid sync token' }, { status: 401 });

    const hasWhoop = !!user.whoop_connected_at;
    const body = await request.json();
    const tz = user.timezone || 'America/New_York';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const ts = Math.floor(Date.now() / 1000);
    const synced: string[] = [];

    // Diagnostic: log what data types were received
    const receivedTypes = Object.keys(body).filter(k => Array.isArray(body[k]) && body[k].length > 0);
    console.log(`[HC Sync] User ${user.id} | Received: ${receivedTypes.join(', ')} | Exercise count: ${body.exercise?.length || body.exerciseSessions?.length || body.exercise_sessions?.length || 0}`);

    // Normalize exercise field name (HC Webhook app may use different keys)
    if (!body.exercise && body.exerciseSessions) body.exercise = body.exerciseSessions;
    if (!body.exercise && body.exercise_sessions) body.exercise = body.exercise_sessions;
    const bodyMeasurements: Record<string, any> = {};

    // Filter records to only include those from today (HC Webhook sends 48hr window)
    const isToday = (r: any) => {
      const t = r.start_time || r.end_time || r.time || r.session_start_time || r.startTime;
      if (!t) return true; // no timestamp = include
      try { return new Date(t).toLocaleDateString('en-CA', { timeZone: tz }) === today; } catch { return true; }
    };

    // Steps — only today's records
    if (body.steps?.length) {
      const todaySteps = body.steps.filter(isToday);
      const total = todaySteps.reduce((s: number, r: any) => s + (r.count || 0), 0);
      if (total > 0) {
        await upsertHabit(supabase, user.id, 'habit_steps', today, ts, total, stepsToXp(total));
        synced.push(`steps: ${total}`);
      }
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

    // Active calories (WHOOP writes to Health Connect, so always process)
    if (body.active_calories?.length) {
      const todayCals = body.active_calories.filter(isToday);
      const total = Math.round(todayCals.reduce((s: number, r: any) => s + (r.calories || 0), 0));
      await supabase.from('nutrition_logs').delete().eq('user_id', user.id).eq('date', today).eq('macro_type', 'calories_burned');
      await supabase.from('nutrition_logs').insert({
        user_id: user.id, date: today, timestamp: ts,
        macro_type: 'calories_burned', amount: total, xp: 10, label: 'Health Connect',
      });
      synced.push(`calories: ${total}`);
    }

    // Hydration — liters to oz
    if (body.hydration?.length) {
      const todayHydration = body.hydration.filter(isToday);
      const totalOz = Math.round(todayHydration.reduce((s: number, r: any) => s + (r.liters || 0), 0) * 33.814);
      if (totalOz > 0) {
        await upsertHabit(supabase, user.id, 'habit_water', today, ts, totalOz, Math.round(totalOz * 0.25));
        synced.push(`water: ${totalOz} oz`);
      }
    }

    // Exercise sessions — via shared service
    if (body.exercise?.length) {
      const { processExerciseSessions } = await import('@/services/exerciseSyncService');
      const result = await processExerciseSessions(supabase, user.id, user.bodyweight || 180, user.sex || 'male', tz, body.exercise);
      if (result.totalMinutes > 0) {
        await upsertHabit(supabase, user.id, 'habit_exercise_minutes', today, ts, result.totalMinutes, 0);
      }
      synced.push(...result.synced);
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

    if ((body.body_fat?.length) || (body.bodyFat?.length) || (body.body_fat_percentage?.length)) {
      const fatArray = body.body_fat || body.bodyFat || body.body_fat_percentage;
      const latest = fatArray[fatArray.length - 1];
      const pct = latest.percentage || latest.body_fat_percentage || latest.value;
      if (pct) {
        bodyMeasurements.body_fat_percentage = pct;
        synced.push(`body fat: ${Math.round(pct * 10) / 10}%`);
        // Derive lean body mass if we have weight
        const weightLbs = bodyMeasurements.weight || user.bodyweight;
        if (weightLbs && !bodyMeasurements.lean_body_mass) {
          bodyMeasurements.lean_body_mass = Math.round(weightLbs * (1 - pct / 100) * 10) / 10;
          synced.push(`lean mass: ${bodyMeasurements.lean_body_mass} lbs (derived)`);
        }
      }
    }

    if ((body.lean_body_mass?.length) || (body.leanBodyMass?.length)) {
      const lbmArray = body.lean_body_mass || body.leanBodyMass;
      const latest = lbmArray[lbmArray.length - 1];
      const lbs = Math.round((latest.kilograms || latest.mass || latest.value || 0) * 2.20462 * 10) / 10;
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
      // Build source map for synced fields
      const sourceMap: Record<string, string> = {};
      for (const key of Object.keys(bodyMeasurements)) {
        sourceMap[key] = 'health_connect';
      }

      // Check for existing row to merge (preserve manual entries)
      const { data: existing } = await supabase.from('body_measurements')
        .select('id, source').eq('user_id', user.id).eq('date', today).limit(1).single();

      if (existing) {
        // Only overwrite fields that aren't manually entered
        const existingSource = existing.source || {};
        const fieldsToWrite: Record<string, any> = {};
        const mergedSource = { ...existingSource };
        for (const [key, val] of Object.entries(bodyMeasurements)) {
          if (existingSource[key] !== 'manual') {
            fieldsToWrite[key] = val;
            mergedSource[key] = 'health_connect';
          }
        }
        if (Object.keys(fieldsToWrite).length > 0) {
          await supabase.from('body_measurements').update({ ...fieldsToWrite, source: mergedSource, timestamp: ts }).eq('id', existing.id);
        }
      } else {
        await supabase.from('body_measurements').insert({
          user_id: user.id, date: today, timestamp: ts, ...bodyMeasurements, source: sourceMap, xp: 5,
        });
      }
    }

    return NextResponse.json({ synced });
  } catch (e: any) {
    console.error('Health Connect webhook error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function upsertHabit(supabase: any, userId: string, habitId: string, date: string, ts: number, value: number, xp: number) {
  const { data: existing } = await supabase.from('habit_logs').select('value').eq('user_id', userId).eq('habit_id', habitId).eq('date', date).order('timestamp', { ascending: false }).limit(1).single();
  if (existing && existing.value >= value) return;

  await supabase.from('habit_logs').delete().eq('user_id', userId).eq('habit_id', habitId).eq('date', date);
  await supabase.from('habit_logs').insert({
    user_id: userId, habit_id: habitId, date, timestamp: ts, value, xp,
  });

  // Write to XP ledger via centralized service
  const { awardXp } = await import('@/utils/xp-service');
  const stableLabel: Record<string, string> = { habit_steps: 'Steps', habit_sleep: 'Sleep', habit_water: 'Water', habit_day_strain: 'Day Strain', habit_exercise_minutes: 'Exercise Minutes' };
  const label = stableLabel[habitId] || habitId.replace('habit_', '');
  const eventMap: Record<string, any> = { habit_steps: { type: 'steps', value }, habit_sleep: { type: 'sleep', value }, habit_water: { type: 'water', value } };
  const event = eventMap[habitId] || { type: 'habit_other' };
  await awardXp(supabase, userId, event, label, true);
}
