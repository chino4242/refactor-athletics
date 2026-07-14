export interface NotificationTemplate {
  rpg: { title: string; body: string };
  classic: { title: string; body: string };
  deepLink: string;
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  streak_at_risk: {
    rpg: {
      title: 'Quest Chain in Peril!',
      body: '🔥 Your {streak_count}-day quest chain breaks at dawn. Keep the fire alive!',
    },
    classic: {
      title: 'Streak Reminder',
      body: '🔥 Your {streak_count}-day streak ends at midnight! 2 mins to log something.',
    },
    deepLink: '/dashboard',
  },
  quest_incomplete: {
    rpg: {
      title: 'Missions Await!',
      body: '🎯 {completed}/{total} missions complete. Claim full XP before nightfall!',
    },
    classic: {
      title: 'Daily Goals',
      body: '🎯 {completed}/{total} goals done today. Finish strong?',
    },
    deepLink: '/dashboard',
  },
  rank_proximity: {
    rpg: {
      title: 'The Beast Weakens!',
      body: '🏆 {distance} {unit} separate you from {rank_name}. Strike now!',
    },
    classic: {
      title: 'Almost There!',
      body: "🏆 You're {distance} {unit} from {rank_name} on {exercise_name}!",
    },
    deepLink: '/test',
  },
  duel_received: {
    rpg: {
      title: 'A Challenger Approaches!',
      body: '⚔️ {challenger_name} demands combat! A {metric} duel awaits your answer.',
    },
    classic: {
      title: 'New Challenge',
      body: '⚔️ {challenger_name} challenged you to a {metric} duel!',
    },
    deepLink: '/arena',
  },
  workout_reminder: {
    rpg: {
      title: 'Prepare for Battle!',
      body: '⚔️ {program_name} awaits. Prepare for battle!',
    },
    classic: {
      title: 'Training Day',
      body: '🗓️ {program_name} today — ready to train?',
    },
    deepLink: '/train',
  },
};

/**
 * Interpolates {variable_name} placeholders in a notification template
 * with the provided variables and returns the rendered title, body, and deepLink.
 */
export function renderTemplate(
  category: string,
  mode: 'rpg' | 'classic',
  variables: Record<string, string | number>
): { title: string; body: string; deepLink: string } {
  const template = NOTIFICATION_TEMPLATES[category];
  if (!template) {
    throw new Error(`Unknown notification category: ${category}`);
  }

  const variant = template[mode];

  const interpolate = (text: string): string =>
    text.replace(/\{(\w+)\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });

  return {
    title: interpolate(variant.title),
    body: interpolate(variant.body),
    deepLink: template.deepLink,
  };
}
