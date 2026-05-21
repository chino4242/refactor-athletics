// Key exercises per training path — only these contribute to Power Level
export const PATH_KEY_EXERCISES: Record<string, string[]> = {
  strength: [
    'bench_press', 'back_squat', 'deadlift', 'overhead_press', 'barbell_row',
    'pull_up', 'dip', 'rdl', 'incline_bench', 'bulgarian_split_squat',
    'barbell_bicep_curl', 'plank',
  ],
  endurance: [
    'run_1_mile', 'run_400m', 'run_5k', 'run_2_mile', 'row_6min', 'dead_hang', 'plank',
    'burpees', 'back_squat', 'deadlift', 'push_ups', 'pull_up',
    'bulgarian_split_squat', 'calf_raises',
  ],
  mobility: [
    'deep_squat_hold', 'active_hang', 'overhead_squat_hold', 'cossack_squat',
    'wall_slide', 'shoulder_dislocate', 'plank', 'push_ups',
    'body_weight_squat', 'pull_up', 'goblet_squat', 'rdl',
    'turkish_get_up', 'kettlebell_swing', 'kettlebell_windmill', 'kettlebell_halo',
  ],
  hybrid: [
    'bench_press', 'back_squat', 'deadlift', 'pull_up', 'run_1_mile',
    'plank', 'overhead_press', 'run_400m', 'run_5k', 'deep_squat_hold',
    'barbell_row', 'push_ups', 'dead_hang',
  ],
};
