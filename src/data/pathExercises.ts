// v2: 12 ranked exercises per path (8 universal core + 4 specialty)
// Only these contribute to Power Level. Max PL = 60.
export const PATH_KEY_EXERCISES: Record<string, string[]> = {
  // Universal core (all paths): back_squat, deadlift, bench_press, pull_up, overhead_press, run_1_mile, plank, push_ups
  strength: [
    'back_squat', 'deadlift', 'bench_press', 'pull_up', 'overhead_press', 'run_1_mile', 'plank', 'push_ups',
    'barbell_row', 'incline_bench', 'rdl', 'dip',
  ],
  endurance: [
    'back_squat', 'deadlift', 'bench_press', 'pull_up', 'overhead_press', 'run_1_mile', 'plank', 'push_ups',
    'run_400m', 'run_5k', 'row_6min', 'dead_hang',
  ],
  mobility: [
    'back_squat', 'deadlift', 'bench_press', 'pull_up', 'overhead_press', 'run_1_mile', 'plank', 'push_ups',
    'deep_squat_hold', 'dead_hang', 'cossack_squat', 'l_sit_hold',
  ],
  hybrid: [
    'back_squat', 'deadlift', 'bench_press', 'pull_up', 'overhead_press', 'run_1_mile', 'plank', 'push_ups',
    'run_400m', 'dead_hang', 'barbell_row', 'run_5k',
  ],
};
