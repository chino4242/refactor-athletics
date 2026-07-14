import { createServiceClient } from '@/utils/supabase/service';
import { getMessaging } from '@/utils/firebase/admin';
import { renderTemplate } from './notificationTemplates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SendNotificationParams {
  userId: string;
  category: string;
  variables: Record<string, string | number>;
  deepLink?: string; // override template deepLink
  priority?: number; // 1-5, higher wins in cap competition
}

interface SendResult {
  sent: boolean;
  reason?:
    | 'delivered'
    | 'daily_cap'
    | 'category_disabled'
    | 'quiet_hours'
    | 'no_devices'
    | 'firebase_not_configured';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_TOGGLE_MAP: Record<string, string> = {
  streak_at_risk: 'streak_daily',
  quest_incomplete: 'streak_daily',
  rank_proximity: 'rank_warnings',
  duel_received: 'social',
  workout_reminder: 'workout_schedule',
};

/**
 * Maps a notification category to its preference toggle key.
 */
export function getCategoryToggleKey(category: string): string {
  return CATEGORY_TOGGLE_MAP[category] ?? category;
}

/**
 * Determines if the current moment (in the user's timezone) falls within
 * a quiet hours window. Handles overnight spans (e.g. 22:00–07:00).
 */
function isInQuietHours(
  quietHours: { start: string; end: string } | null,
  timezone: string
): boolean {
  if (!quietHours) return false;

  const { start, end } = quietHours;
  if (!start || !end) return false;

  // Get current hour:minute in user's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const currentHour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const currentMinute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const currentMinutes = currentHour * 60 + currentMinute;

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day window (e.g. 09:00–17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window (e.g. 22:00–07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Returns the start-of-day ISO string for "today" in the given timezone.
 */
function getTodayStartInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now); // YYYY-MM-DD
  return `${dateStr}T00:00:00`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Core notification delivery service.
 * Handles preference checks, quiet hours, daily cap, FCM delivery, and logging.
 */
export async function sendNotification(params: SendNotificationParams): Promise<SendResult> {
  const { userId, category, variables, deepLink: deepLinkOverride, priority = 3 } = params;

  const supabase = createServiceClient();

  // 1. Fetch user settings
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('experience_mode, notification_preferences, quiet_hours, timezone')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    console.error('[notifications] Failed to fetch user:', userError?.message ?? 'not found');
    // Default to delivering if we can't fetch user prefs
    // but we still need timezone — fall through with defaults
  }

  const mode: 'rpg' | 'classic' = user?.experience_mode === 'classic' ? 'classic' : 'rpg';
  const timezone: string = user?.timezone ?? 'UTC';
  const notificationPreferences = user?.notification_preferences as Record<string, boolean> | null;
  const quietHours = user?.quiet_hours as { start: string; end: string } | null;

  // 2. Check category toggle
  if (notificationPreferences) {
    const toggleKey = getCategoryToggleKey(category);
    if (notificationPreferences[toggleKey] === false) {
      console.log(`[notifications] Suppressed (category_disabled): ${category} for user ${userId}`);
      return { sent: false, reason: 'category_disabled' };
    }
  }

  // 3. Check quiet hours
  if (isInQuietHours(quietHours, timezone)) {
    console.log(`[notifications] Suppressed (quiet_hours): ${category} for user ${userId}`);
    return { sent: false, reason: 'quiet_hours' };
  }

  // 4. Check daily cap (max 2 delivered notifications per day)
  const todayStart = getTodayStartInTimezone(timezone);
  const { count: todayCount, error: countError } = await supabase
    .from('notifications_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('delivered', true)
    .gte('sent_at', todayStart);

  if (!countError && (todayCount ?? 0) >= 2) {
    // Cap reached — do not unsend previous notifications
    console.log(`[notifications] Suppressed (daily_cap): ${category} for user ${userId}, count=${todayCount}`);
    return { sent: false, reason: 'daily_cap' };
  }

  // 5. Render template
  const rendered = renderTemplate(category, mode, variables);
  const finalDeepLink = deepLinkOverride ?? rendered.deepLink;

  // 6. Fetch devices
  const { data: devices, error: devicesError } = await supabase
    .from('user_devices')
    .select('id, token')
    .eq('user_id', userId);

  if (devicesError) {
    console.error('[notifications] Failed to fetch devices:', devicesError.message);
  }

  if (!devices || devices.length === 0) {
    console.log(`[notifications] No devices for user ${userId}`);
    return { sent: false, reason: 'no_devices' };
  }

  // 7. Send via FCM
  let messaging;
  try {
    messaging = getMessaging();
  } catch {
    console.warn('[notifications] Firebase not configured, skipping FCM delivery');
    return { sent: false, reason: 'firebase_not_configured' };
  }

  if (!messaging) {
    return { sent: false, reason: 'firebase_not_configured' };
  }

  const tokensToRemove: string[] = [];

  for (const device of devices) {
    try {
      await messaging.send({
        token: device.token,
        notification: {
          title: rendered.title,
          body: rendered.body,
        },
        data: {
          url: finalDeepLink,
          category,
        },
      });
    } catch (err: unknown) {
      const errorCode =
        err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';

      if (
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-registration-token'
      ) {
        tokensToRemove.push(device.id);
      } else {
        console.error(`[notifications] FCM send failed for device ${device.id}:`, err);
      }
    }
  }

  // 8. Remove invalid tokens
  if (tokensToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_devices')
      .delete()
      .in('id', tokensToRemove);

    if (deleteError) {
      console.error('[notifications] Failed to remove invalid tokens:', deleteError.message);
    }
  }

  // 9. Log to notifications_log
  const { error: logError } = await supabase.from('notifications_log').insert({
    user_id: userId,
    category,
    title: rendered.title,
    body: rendered.body,
    deep_link: finalDeepLink,
    priority,
    delivered: true,
    sent_at: new Date().toISOString(),
  });

  if (logError) {
    console.error('[notifications] Failed to log notification:', logError.message);
  }

  return { sent: true, reason: 'delivered' };
}
