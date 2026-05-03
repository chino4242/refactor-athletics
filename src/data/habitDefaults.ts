// All habit IDs in the system
export const ALL_HABITS = [
  'habit_steps', 'habit_sleep', 'habit_exercise_minutes', 'habit_stand_hours',
  'habit_creatine', 'habit_no_alcohol', 'habit_no_vice', 'habit_sugar',
  'habit_journaling', 'habit_reading', 'habit_mobility', 'habit_cold_plunge',
  'habit_sauna', 'habit_meditation', 'habit_fasting',
  'habit_day_strain', 'habit_recovery', 'habit_hrv',
] as const;

// Habits visible by default for everyone
const CORE = ['habit_steps', 'habit_sleep', 'habit_no_alcohol', 'habit_no_vice'];

// Additional habits shown per path (RPG mode)
const PATH_EXTRAS: Record<string, string[]> = {
  hybrid:    ['habit_exercise_minutes', 'habit_creatine', 'habit_mobility'],
  strength:  ['habit_exercise_minutes', 'habit_creatine', 'habit_fasting'],
  endurance: ['habit_exercise_minutes', 'habit_stand_hours', 'habit_mobility'],
  mobility:  ['habit_exercise_minutes', 'habit_mobility', 'habit_meditation'],
};

// Classic mode: simple wellness set
const CLASSIC_VISIBLE = ['habit_steps', 'habit_sleep', 'habit_exercise_minutes', 'habit_no_alcohol', 'habit_no_vice'];

export function getDefaultHiddenHabits(mode: 'rpg' | 'classic', path?: string): string[] {
  const visible = mode === 'classic'
    ? CLASSIC_VISIBLE
    : [...CORE, ...(PATH_EXTRAS[path || 'hybrid'] || PATH_EXTRAS.hybrid)];

  return ALL_HABITS.filter(h => !visible.includes(h));
}
