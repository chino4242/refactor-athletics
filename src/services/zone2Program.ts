import { SupabaseClient } from '@supabase/supabase-js';

export const ZONE2_PROGRAM_ID = 'zone2_foundation';

// Weekly targets in minutes
const WEEK_TARGETS = [60, 75, 90, 120, 135, 150];

export function getZone2Range(age: number): { min: number; max: number } {
  const maxHR = 180 - age;
  // Zone 2 = 60-70% of max HR (Maffetone-style)
  return { min: Math.round(maxHR * 0.6), max: maxHR };
}

export function getWeekTarget(week: number): number {
  return WEEK_TARGETS[Math.min(week - 1, WEEK_TARGETS.length - 1)];
}

export function getTotalWeeks(): number {
  return WEEK_TARGETS.length;
}

export interface ProgramProgress {
  enrolled: boolean;
  currentWeek: number;
  weekMinutes: number;
  weekTarget: number;
  totalWeeks: number;
  completed: boolean;
  enrollmentId?: string;
}

/**
 * Get the user's Zone 2 program progress.
 * Auto-computes week_minutes from synced workouts with HR in zone.
 */
export async function getZone2Progress(
  supabase: SupabaseClient,
  userId: string,
  age: number
): Promise<ProgramProgress> {
  const { data: enrollment } = await supabase
    .from('program_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('program_id', ZONE2_PROGRAM_ID)
    .eq('status', 'active')
    .single();

  if (!enrollment) {
    return { enrolled: false, currentWeek: 1, weekMinutes: 0, weekTarget: WEEK_TARGETS[0], totalWeeks: WEEK_TARGETS.length, completed: false };
  }

  // Compute zone 2 minutes this week from synced workouts
  const zone = getZone2Range(age);
  const weekStart = enrollment.week_started_at;

  const { data: workouts } = await supabase
    .from('workouts')
    .select('raw_value, exercise_id, timestamp')
    .eq('user_id', userId)
    .like('exercise_id', 'synced_%')
    .gte('timestamp', Math.floor(new Date(weekStart).getTime() / 1000));

  // Also check habit_logs for exercise_minutes with HR data
  // For now, look at workouts table for synced cardio that has avg_heart_rate stored
  // Since we store HR in the workouts table via health sync, query those
  const { data: hrWorkouts } = await supabase
    .from('workouts')
    .select('raw_value, exercise_id, sets')
    .eq('user_id', userId)
    .like('exercise_id', 'synced_%')
    .gte('timestamp', Math.floor(new Date(weekStart).getTime() / 1000));

  let zone2Minutes = 0;
  for (const w of hrWorkouts || []) {
    // raw_value for synced cardio is duration in seconds
    const durationMin = (w.raw_value || 0) / 60;
    // Check if HR data is stored in sets (health sync stores avg_heart_rate there)
    const sets = Array.isArray(w.sets) ? w.sets : [];
    const avgHR = sets[0]?.avg_heart_rate || sets[0]?.heart_rate || 0;

    if (avgHR >= zone.min && avgHR <= zone.max && durationMin >= 5) {
      zone2Minutes += Math.round(durationMin);
    } else if (avgHR === 0 && durationMin >= 20) {
      // No HR data but long enough session — count walking/easy cardio at 50%
      // (generous assumption for users without HR monitors)
      zone2Minutes += Math.round(durationMin * 0.5);
    }
  }

  const weekTarget = getWeekTarget(enrollment.current_week);

  return {
    enrolled: true,
    currentWeek: enrollment.current_week,
    weekMinutes: zone2Minutes,
    weekTarget,
    totalWeeks: WEEK_TARGETS.length,
    completed: !!enrollment.completed_at,
    enrollmentId: enrollment.id,
  };
}

/**
 * Enroll user in Zone 2 Foundation program.
 */
export async function enrollZone2(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { error } = await supabase.from('program_enrollments').insert({
    user_id: userId,
    program_id: ZONE2_PROGRAM_ID,
    current_week: 1,
    week_minutes: 0,
  });
  return !error;
}

/**
 * Check if week target is met and advance. Returns XP earned (0 if no advancement, 500 on completion).
 */
export async function checkAndAdvance(
  supabase: SupabaseClient,
  userId: string,
  progress: ProgramProgress
): Promise<{ advanced: boolean; completed: boolean; xp: number }> {
  if (!progress.enrolled || progress.completed || !progress.enrollmentId) {
    return { advanced: false, completed: false, xp: 0 };
  }

  if (progress.weekMinutes < progress.weekTarget) {
    return { advanced: false, completed: false, xp: 0 };
  }

  const nextWeek = progress.currentWeek + 1;
  const isComplete = nextWeek > WEEK_TARGETS.length;

  if (isComplete) {
    await supabase.from('program_enrollments').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      week_minutes: progress.weekMinutes,
    }).eq('id', progress.enrollmentId);

    // Award XP
    const { awardXp } = await import('@/utils/xp-service');
    await awardXp(supabase, userId, { type: 'workout', level: 5, volumeXp: 0 } as any, 'Zone 2 Foundation Complete');

    return { advanced: false, completed: true, xp: 500 };
  }

  // Advance to next week
  await supabase.from('program_enrollments').update({
    current_week: nextWeek,
    week_minutes: 0,
    week_started_at: new Date().toISOString(),
  }).eq('id', progress.enrollmentId);

  return { advanced: true, completed: false, xp: 0 };
}
