import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import {
  checkWorkoutReminder,
  checkQuestIncomplete,
  checkStreakAtRisk,
} from '@/services/notificationChecks';

export const maxDuration = 60;

function getUserLocalHour(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });
    return parseInt(formatter.format(now));
  } catch {
    return new Date().getUTCHours(); // fallback to UTC
  }
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Query all users with notifications enabled and a timezone set
  const { data: users, error } = await supabase
    .from('users')
    .select('id, timezone, notifications_enabled, experience_mode, selected_path')
    .eq('notifications_enabled', true)
    .not('timezone', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!users?.length) {
    return NextResponse.json({ processed: 0, streak_sent: 0, quest_sent: 0, workout_sent: 0 });
  }

  // Group users by which notification check to run based on their local hour
  const workoutReminderUsers: typeof users = []; // 7 AM local
  const questIncompleteUsers: typeof users = []; // 7 PM local
  const streakAtRiskUsers: typeof users = []; // 8 PM local

  for (const user of users) {
    const localHour = getUserLocalHour(user.timezone);
    if (localHour === 7) workoutReminderUsers.push(user);
    if (localHour === 19) questIncompleteUsers.push(user);
    if (localHour === 20) streakAtRiskUsers.push(user);
  }

  let streakSent = 0;
  let questSent = 0;
  let workoutSent = 0;

  // Run workout reminder checks
  if (workoutReminderUsers.length > 0) {
    const results = await Promise.allSettled(
      workoutReminderUsers.map((user) => checkWorkoutReminder(supabase, user))
    );
    workoutSent = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true
    ).length;
  }

  // Run quest incomplete checks
  if (questIncompleteUsers.length > 0) {
    const results = await Promise.allSettled(
      questIncompleteUsers.map((user) => checkQuestIncomplete(supabase, user))
    );
    questSent = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true
    ).length;
  }

  // Run streak at risk checks
  if (streakAtRiskUsers.length > 0) {
    const results = await Promise.allSettled(
      streakAtRiskUsers.map((user) => checkStreakAtRisk(supabase, user))
    );
    streakSent = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true
    ).length;
  }

  const processed =
    workoutReminderUsers.length +
    questIncompleteUsers.length +
    streakAtRiskUsers.length;

  return NextResponse.json({
    processed,
    streak_sent: streakSent,
    quest_sent: questSent,
    workout_sent: workoutSent,
  });
}
