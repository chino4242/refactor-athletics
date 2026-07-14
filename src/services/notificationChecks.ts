import { SupabaseClient } from '@supabase/supabase-js';
import { sendNotification } from './notifications';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationUser {
  id: string;
  timezone: string;
  notifications_enabled: boolean;
  experience_mode: string;
  selected_path?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns YYYY-MM-DD in the user's timezone.
 */
export function getUserLocalDate(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA gives YYYY-MM-DD format
}

/**
 * Returns the day of week (0=Sun, 1=Mon, ..., 6=Sat) in the user's timezone.
 */
export function getUserLocalDayOfWeek(timezone: string): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const day = formatter.format(now);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[day] ?? 0;
}

/**
 * Returns a date string N days before the given YYYY-MM-DD date.
 */
function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// All default habit/quest categories
// ---------------------------------------------------------------------------

const ALL_QUEST_CATEGORIES = [
  'habit_steps',
  'habit_sleep',
  'habit_exercise_minutes',
  'habit_stand_hours',
  'habit_creatine',
  'habit_cold_plunge',
  'habit_sauna',
  'habit_mobility',
  'habit_meditation',
  'macro_protein',
  'macro_carbs',
  'macro_fat',
  'habit_water',
  'habit_no_alcohol',
  'habit_no_vice',
  'habit_no_sugar',
];

// ---------------------------------------------------------------------------
// Check Functions
// ---------------------------------------------------------------------------

/**
 * Checks if a user's streak is at risk (no activity today + streak >= 3 days).
 * Sends a streak_at_risk notification if conditions are met.
 */
export async function checkStreakAtRisk(
  supabase: SupabaseClient,
  user: NotificationUser
): Promise<boolean> {
  try {
    const today = getUserLocalDate(user.timezone);

    // Check if user has ANY log today across all tables
    const [workoutsToday, habitsToday, nutritionToday] = await Promise.all([
      supabase
        .from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', today),
      supabase
        .from('habit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', today),
      supabase
        .from('nutrition_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', today),
    ]);

    const todayCount =
      (workoutsToday.count ?? 0) + (habitsToday.count ?? 0) + (nutritionToday.count ?? 0);

    // If any log exists today, user is active — no risk
    if (todayCount > 0) {
      return false;
    }

    // Calculate streak: get distinct dates from the last 30 days across all 3 tables
    const thirtyDaysAgo = subtractDays(today, 30);

    const [workoutDates, habitDates, nutritionDates] = await Promise.all([
      supabase
        .from('workouts')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo)
        .lt('date', today),
      supabase
        .from('habit_logs')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo)
        .lt('date', today),
      supabase
        .from('nutrition_logs')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo)
        .lt('date', today),
    ]);

    // Merge all dates into a unique set
    const allDates = new Set<string>();
    for (const row of workoutDates.data ?? []) allDates.add(row.date);
    for (const row of habitDates.data ?? []) allDates.add(row.date);
    for (const row of nutritionDates.data ?? []) allDates.add(row.date);

    // Count consecutive days backward from yesterday
    let streak = 0;
    let checkDate = subtractDays(today, 1);

    while (allDates.has(checkDate)) {
      streak++;
      checkDate = subtractDays(checkDate, 1);
    }

    // Streak must be at least 3 days to matter
    if (streak < 3) {
      return false;
    }

    // Send notification
    const result = await sendNotification({
      userId: user.id,
      category: 'streak_at_risk',
      variables: { streak_count: streak },
      priority: 4,
    });

    return result.sent;
  } catch (error) {
    console.error(
      `[notificationChecks] checkStreakAtRisk failed for user ${user.id}:`,
      error
    );
    return false;
  }
}

/**
 * Checks if a user has started but not finished their daily quests.
 * Sends a quest_incomplete notification if some (but not all) quests are done.
 */
export async function checkQuestIncomplete(
  supabase: SupabaseClient,
  user: NotificationUser
): Promise<boolean> {
  try {
    const today = getUserLocalDate(user.timezone);

    // Get user's hidden_habits to determine visible quests
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('hidden_habits')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(
        `[notificationChecks] Failed to fetch profile for user ${user.id}:`,
        profileError.message
      );
      return false;
    }

    const hiddenHabits: string[] = (profile?.hidden_habits as string[]) ?? [];

    // Calculate total visible quests
    const visibleQuests = ALL_QUEST_CATEGORIES.filter(
      (category) => !hiddenHabits.includes(category)
    );
    const totalVisible = visibleQuests.length;

    if (totalVisible === 0) {
      return false;
    }

    // Count completed quests today
    const [habitLogsResult, nutritionLogsResult] = await Promise.all([
      supabase
        .from('habit_logs')
        .select('habit')
        .eq('user_id', user.id)
        .eq('date', today),
      supabase
        .from('nutrition_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today),
    ]);

    // Count distinct habit types logged today
    const completedHabits = new Set<string>();

    for (const row of habitLogsResult.data ?? []) {
      if (row.habit && visibleQuests.includes(row.habit)) {
        completedHabits.add(row.habit);
      }
    }

    // If nutrition logs exist, count macro categories as completed
    if ((nutritionLogsResult.data ?? []).length > 0) {
      const macroCategories = visibleQuests.filter((q) => q.startsWith('macro_'));
      for (const macro of macroCategories) {
        completedHabits.add(macro);
      }
    }

    const completed = completedHabits.size;

    // If nothing completed → streak warning handles this case
    if (completed === 0) {
      return false;
    }

    // If all done → no notification needed
    if (completed >= totalVisible) {
      return false;
    }

    // Send notification
    const result = await sendNotification({
      userId: user.id,
      category: 'quest_incomplete',
      variables: { completed, total: totalVisible },
      priority: 2,
    });

    return result.sent;
  } catch (error) {
    console.error(
      `[notificationChecks] checkQuestIncomplete failed for user ${user.id}:`,
      error
    );
    return false;
  }
}

/**
 * Checks if a user has a scheduled workout today that hasn't been logged yet.
 * Sends a workout_reminder notification if a program is scheduled but not started.
 */
export async function checkWorkoutReminder(
  supabase: SupabaseClient,
  user: NotificationUser
): Promise<boolean> {
  try {
    const today = getUserLocalDate(user.timezone);
    const dayOfWeek = getUserLocalDayOfWeek(user.timezone);

    // Check if user has a program scheduled today
    const { data: schedules, error: scheduleError } = await supabase
      .from('program_schedule')
      .select('program_id, workout_programs(name)')
      .eq('user_id', user.id)
      .eq('day_of_week', dayOfWeek)
      .limit(1);

    if (scheduleError) {
      console.error(
        `[notificationChecks] Failed to fetch schedule for user ${user.id}:`,
        scheduleError.message
      );
      return false;
    }

    if (!schedules || schedules.length === 0) {
      return false;
    }

    // Extract program name from the join
    const schedule = schedules[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const programData = schedule.workout_programs as any;
    const programName: string =
      (Array.isArray(programData) ? programData[0]?.name : programData?.name) ?? 'Your Workout';

    // Check if user already logged a workout today
    const { count: workoutCount, error: workoutError } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('date', today);

    if (workoutError) {
      console.error(
        `[notificationChecks] Failed to check workouts for user ${user.id}:`,
        workoutError.message
      );
      return false;
    }

    // Already logged a workout today — no reminder needed
    if ((workoutCount ?? 0) > 0) {
      return false;
    }

    // Send notification
    const result = await sendNotification({
      userId: user.id,
      category: 'workout_reminder',
      variables: { program_name: programName },
      priority: 1,
    });

    return result.sent;
  } catch (error) {
    console.error(
      `[notificationChecks] checkWorkoutReminder failed for user ${user.id}:`,
      error
    );
    return false;
  }
}
