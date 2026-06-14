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
    // Mutex to prevent concurrent runs
    if (localStorage.getItem('health_sync_in_progress')) return;

    (async () => {
      try {
        localStorage.setItem('health_sync_in_progress', '1');
        const { syncTodayHealth } = await import('@/services/nativeHealth');
        const data = await syncTodayHealth();
        if (!data || (data.steps === 0 && data.caloriesBurned === 0)) {
          localStorage.removeItem('health_sync_in_progress');
          return;
        }

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

        if (promises.length > 0) await Promise.all(promises);
        onSyncComplete?.();

        // Exercise session auto-sync
        if (data.exercises?.length > 0) {
          const supabaseEx = (await import('@/utils/supabase/client')).createClient();
          const today = new Date().toLocaleDateString('en-CA');

          for (const ex of data.exercises) {
            const dur = ex.duration || ex.duration_seconds || ex.durationSeconds || 0;
            if (dur < 300) continue; // Skip under 5 min

            // Use the exercise's actual date (not today)
            const exTime = ex.start_time || ex.end_time || ex.startDate || ex.endDate;
            const exDate = exTime ? new Date(exTime).toLocaleDateString('en-CA') : today;

            // Skip if user already logged manual workouts in a similar time window (avoid double XP)
            const exTs = exTime ? Math.floor(new Date(exTime).getTime() / 1000) : Math.floor(Date.now() / 1000);
            const windowStart = exTs - 300; // 5 min before
            const windowEnd = exTs + dur + 300; // duration + 5 min after
            const { data: manualLogs } = await supabaseEx.from('workouts')
              .select('id')
              .eq('user_id', userId)
              .eq('date', exDate)
              .gte('timestamp', windowStart)
              .lte('timestamp', windowEnd)
              .not('exercise_id', 'like', 'synced_%')
              .limit(1);
            if (manualLogs?.length) continue; // User already logged this session manually

            const distMeters = ex.distance_meters || ex.distanceMeters || ex.distance || 0;
            const typeCode = parseInt(ex.type || ex.exerciseType || '0') || 0;
            const isRun = typeCode === 46 || typeCode === 47;
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
              const type = isRun ? 'Run' : typeCode === 8 ? 'Bike' : 'Cardio';
              await logSyncedCardioAction(userId, type, dur, exDate);
            }
          }
        }
      } catch { /* silent — not native or plugin unavailable */ 
      } finally {
        localStorage.removeItem('health_sync_in_progress');
      }
    })();
  }, [userId, refreshKey]);

  return null; // Invisible sync trigger
}
