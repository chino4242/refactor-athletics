// Maps each ranked exercise ID to its radar axis (STR/END/PWR/MOB)
// Used by BestiaryRadar to compute average level per category

export type RadarAxis = 'STR' | 'END' | 'PWR' | 'MOB';

export const EXERCISE_RADAR_CATEGORY: Record<string, RadarAxis> = {
  // Universal Core
  back_squat: 'STR',
  deadlift: 'STR',
  bench_press: 'STR',
  overhead_press: 'STR',
  pull_up: 'PWR',
  push_ups: 'PWR',
  run_1_mile: 'END',
  plank: 'MOB',

  // Strength path specialty
  barbell_row: 'STR',
  incline_bench: 'STR',
  rdl: 'STR',
  dip: 'PWR',

  // Endurance path specialty
  run_400m: 'END',
  run_5k: 'END',
  row_6min: 'END',

  // Mobility path specialty
  deep_squat_hold: 'MOB',
  cossack_squat: 'MOB',
  l_sit_hold: 'MOB',

  // Shared across paths
  dead_hang: 'MOB',
};

export const RADAR_AXES: RadarAxis[] = ['STR', 'END', 'PWR', 'MOB'];

export const RADAR_LABELS: Record<RadarAxis, string> = {
  STR: 'Strength',
  END: 'Endurance',
  PWR: 'Power',
  MOB: 'Mobility',
};
