"use client";

import { useEffect } from 'react';
import { logHabitAction } from '@/app/actions';
import { logSyncedCardioAction } from '@/app/actions';

interface Props {
  userId: string;
  refreshKey?: number;
  onSyncComplete?: () => void;
}

export default function HealthSync({ userId, refreshKey, onSyncComplete }: Props) {
  useEffect(() => {
    // Mutex with TTL (60s) to prevent stuck state if app crashes
    const mutexTs = localStorage.getItem('health_sync_in_progress');
    if (mutexTs && Date.now() - parseInt(mutexTs) < 60000) return;

    (async () => {
      try {
        localStorage.setItem('health_sync_in_progress', String(Date.now()));
        const { syncTodayHealth } = await import('@/services/nativeHealth');
        const isFirstSync = !localStorage.getItem('health_sync_last');
        const data = await syncTodayHealth(isFirstSync ? 7 : undefined);
        if (!data || (data.steps === 0 && data.caloriesBurned === 0 && (!data.exercises || data.exercises.length === 0))) {
          // Detect possible permission revocation: all zeros after previous success
          const hadPriorSync = !!localStorage.getItem('health_sync_last');
          if (hadPriorSync && data) {
            const zeroCount = parseInt(localStorage.getItem('health_sync_zero_count') || '0') + 1;
            localStorage.setItem('health_sync_zero_count', String(zeroCount));
            if (zeroCount >= 3) localStorage.setItem('health_sync_needs_reconnect', '1');
          }
          localStorage.removeItem('health_sync_in_progress');
          return;
        }
        // Reset zero counter on successful sync
        localStorage.removeItem('health_sync_zero_count');
        localStorage.removeItem('health_sync_needs_reconnect');

        // Check if WHOOP handles calories
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: user } = await supabase.from('users').select('whoop_connected_at').eq('id', userId).single();
        const hasWhoop = !!user?.whoop_connected_at;

        const promises: Promise<any>[] = [];
        if (data.steps > 0) promises.push(logHabitAction(userId, 'habit_steps', data.steps, undefined, 'Steps (Sync)'));
        if (data.caloriesBurned > 0 && !hasWhoop) promises.push(logHabitAction(userId, 'macro_calories_burned', data.caloriesBurned, undefined, 'Calories Burned'));
        if (data.stepsYesterday > 0) {
          const noon = Math.floor(new Date(data.yesterdayDate + 'T12:00:00').getTime() / 1000);
          promises.push(logHabitAction(userId, 'habit_steps', data.stepsYesterday, undefined, 'Steps (Sync)', noon));
        }
        if (data.caloriesYesterday > 0 && !hasWhoop) {
          const noon = Math.floor(new Date(data.yesterdayDate + 'T12:00:00').getTime() / 1000);
          promises.push(logHabitAction(userId, 'macro_calories_burned', data.caloriesYesterday, undefined, 'Calories Burned', noon));
        }
        if (data.sleep > 0 && !hasWhoop) promises.push(logHabitAction(userId, 'habit_sleep', data.sleep, undefined, 'Sleep (Sync)'));
        if (data.exerciseMinutes > 0) promises.push(logHabitAction(userId, 'habit_exercise_minutes', data.exerciseMinutes, undefined, 'Exercise Minutes (Sync)'));

        if (promises.length > 0) await Promise.all(promises);
        onSyncComplete?.();

        // Exercise session auto-sync
        if (data.exercises?.length > 0) {
          const supabaseEx = (await import('@/utils/supabase/client')).createClient();
          const today = new Date().toLocaleDateString('en-CA');

          // Dedup overlapping sessions (multiple apps writing same workout)
          const exercises = data.exercises.filter((ex: any, i: number) => {
            const start = new Date(ex.start_time || ex.startDate || 0).getTime();
            const end = new Date(ex.end_time || ex.endDate || 0).getTime();
            if (!start || !end) return true;
            for (let j = 0; j < i; j++) {
              const otherStart = new Date(data.exercises[j].start_time || data.exercises[j].startDate || 0).getTime();
              const otherEnd = new Date(data.exercises[j].end_time || data.exercises[j].endDate || 0).getTime();
              if (!otherStart || !otherEnd) continue;
              const overlapStart = Math.max(start, otherStart);
              const overlapEnd = Math.min(end, otherEnd);
              if (overlapEnd <= overlapStart) continue;
              const overlap = overlapEnd - overlapStart;
              const shorter = Math.min(end - start, otherEnd - otherStart);
              if (overlap / shorter > 0.8) return false; // Duplicate — skip this one (keep earlier/longer)
            }
            return true;
          });

          for (const ex of exercises) {
            const dur = ex.duration || ex.duration_seconds || ex.durationSeconds || 0;
            if (dur < 300) continue; // Skip under 5 min

            // Use the exercise's actual date (not today)
            const exTime = ex.start_time || ex.end_time || ex.startDate || ex.endDate;
            const exDate = exTime ? new Date(exTime).toLocaleDateString('en-CA') : today;

            // Skip if user already logged manual workouts in a similar time window (avoid double XP)
            const exStart = ex.start_time || ex.startDate;
            const exEnd = ex.end_time || ex.endDate;
            const startTs = exStart ? Math.floor(new Date(exStart).getTime() / 1000) : Math.floor(Date.now() / 1000);
            const endTs = exEnd ? Math.floor(new Date(exEnd).getTime() / 1000) : startTs + dur;
            // Check for any manual workout whose timestamp falls within the exercise window (±5min buffer)
            const { data: manualLogs } = await supabaseEx.from('workouts')
              .select('id')
              .eq('user_id', userId)
              .eq('date', exDate)
              .gte('timestamp', startTs - 300)
              .lte('timestamp', endTs + 300)
              .not('exercise_id', 'like', 'synced_%')
              .limit(1);
            if (manualLogs?.length) continue; // User already logged this session manually

            const distMeters = ex.distance_meters || ex.distanceMeters || ex.distance || 0;
            const rawType = ex.workoutType || ex.type || ex.exerciseType || '';
            const typeCode = parseInt(rawType) || 0;
            const typeStr = typeof rawType === 'string' && isNaN(Number(rawType)) ? rawType.toLowerCase() : '';

            // Detect type from string (iOS @capgo plugin) or numeric code (Android Health Connect)
            // HC: Running=56, RunningTreadmill=57
            const isRun = typeStr === 'running' || typeCode === 56 || typeCode === 57;
            // HC: Biking=8, BikingStationary=9
            const isBike = typeStr === 'cycling' || typeCode === 8 || typeCode === 9;
            // HC: SwimmingPool=74, SwimmingOpenWater=73
            const isSwim = typeStr === 'swimming' || typeStr === 'swimmingpool' || typeStr === 'swimmingopenwater' || typeCode === 73 || typeCode === 74;
            // HC: Rowing=53, RowingMachine=54
            const isRow = typeStr === 'rowing' || typeCode === 53 || typeCode === 54;
            // HC: Hiking=37
            const isHike = typeStr === 'hiking' || typeCode === 37;
            // HC: StrengthTraining=70, Weightlifting=81, Calisthenics=13
            const isStrength = typeStr === 'strengthtraining' || typeStr === 'traditionalstrengthtraining' || typeStr === 'functionalstrengthtraining' || typeCode === 70 || typeCode === 81 || typeCode === 13;
            // HC: Yoga=83, Pilates=48, Stretching=71
            const isYoga = typeStr === 'yoga' || typeStr === 'pilates' || typeStr === 'flexibility' || typeCode === 83 || typeCode === 48 || typeCode === 71;
            // HC: Walking=79
            const isWalk = typeStr === 'walking' || typeCode === 79;
            const distMiles = distMeters / 1609.34;
            const isKnownDistance = isRun && (
              (distMiles >= 0.9 && distMiles <= 1.1) ||
              (distMeters >= 350 && distMeters <= 450) ||
              (distMiles >= 3.0 && distMiles <= 3.7)
            );

            if (isKnownDistance) {
              await fetch('/api/sync/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exercises: [ex] }),
              });
            } else {
              const type = isRun ? 'Run' : isBike ? 'Bike' : isSwim ? 'Swim' : isRow ? 'Row' : isHike ? 'Hike' : isStrength ? 'Strength' : isYoga ? 'Yoga' : isWalk ? 'Walk' : 'Cardio';
              await logSyncedCardioAction(userId, type, dur, exDate);
            }
          }
        }
        // Record successful sync status
        localStorage.setItem('health_sync_last', JSON.stringify({
          ts: Date.now(),
          exercises: data.exercises?.length || 0,
          steps: data.steps || 0,
        }));
      } catch { /* silent — not native or plugin unavailable */ 
      } finally {
        localStorage.removeItem('health_sync_in_progress');
      }
    })();
  }, [userId, refreshKey]);

  return null; // Invisible sync trigger
}
