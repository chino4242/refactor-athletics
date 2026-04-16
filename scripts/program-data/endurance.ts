import { DefaultProgram } from './types';

export const ENDURANCE_PROGRAM: DefaultProgram = {
  training_path: 'endurance',
  days: [
    // MONDAY — Intervals
    {
      name: 'Interval Day',
      description: 'High-intensity intervals to build speed and VO2 max.',
      day_of_week: 'monday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 300, incline: 0, intensity: 'zone2', outdoor_alternative: '5 min easy jog' },
        { block_order: 2, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 1, intensity: 'all_out', outdoor_alternative: '1 min hard sprint', notes: 'Repeat 8x: 1 min hard / 1 min easy' },
        { block_order: 3, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min easy jog recovery' },
        { block_order: 4, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 1, intensity: 'all_out', outdoor_alternative: '1 min hard sprint' },
        { block_order: 5, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min easy jog recovery' },
        { block_order: 6, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 1, intensity: 'all_out', outdoor_alternative: '1 min hard sprint' },
        { block_order: 7, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min easy jog recovery' },
        { block_order: 8, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 1, intensity: 'all_out', outdoor_alternative: '1 min hard sprint' },
        { block_order: 9, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min easy jog recovery' },
        { block_order: 10, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 1, intensity: 'all_out' },
        { block_order: 11, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 0, intensity: 'base' },
        { block_order: 12, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 1, intensity: 'all_out' },
        { block_order: 13, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 0, intensity: 'base' },
        { block_order: 14, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 1, intensity: 'all_out' },
        { block_order: 15, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 0, intensity: 'base' },
        { block_order: 16, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 1, intensity: 'all_out' },
        { block_order: 17, block_type: 'treadmill', section: 'main', duration_seconds: 60, incline: 0, intensity: 'base' },
        // Light upper body
        { block_order: 18, block_type: 'exercise', section: 'main', exercise_id: 'push_up', target_sets: 3, target_reps: 15, rest_seconds: 60 },
        { block_order: 19, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_bent_over_row', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        { block_order: 20, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_lateral_raise', target_sets: 2, target_reps: 12, rest_seconds: 60 },
        { block_order: 21, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min stretch' },
      ],
    },
    // TUESDAY — Steady State + Strength
    {
      name: 'Steady State + Strength',
      description: 'Zone 2 cardio followed by compound lifts for maintenance.',
      day_of_week: 'tuesday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'main', duration_seconds: 1800, incline: 2, intensity: 'zone2', outdoor_alternative: '30 min easy run at conversational pace' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'goblet_squat', target_sets: 3, target_reps: 12, rest_seconds: 60, alt_exercise_id: 'back_squat', alt_equipment: ['dumbbells'] },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_bench_press', target_sets: 3, target_reps: 10, rest_seconds: 60, alt_exercise_id: 'bench_press', alt_equipment: ['dumbbells', 'bench'] },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_bent_over_row', target_sets: 3, target_reps: 10, rest_seconds: 60 },
        { block_order: 5, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 45, rest_seconds: 30 },
        { block_order: 6, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min stretch' },
      ],
    },
    // WEDNESDAY — Active Recovery
    {
      name: 'Active Recovery',
      description: 'Easy movement and mobility. Let your body recover.',
      day_of_week: 'wednesday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 1200, incline: 0, intensity: 'zone2', outdoor_alternative: '20 min easy walk' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'deep_squat_hold', target_sets: 3, target_duration_seconds: 30, rest_seconds: 30 },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'wall_slide', target_sets: 3, target_reps: 10, rest_seconds: 30 },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'shoulder_dislocate', target_sets: 3, target_reps: 10, rest_seconds: 30 },
        { block_order: 5, block_type: 'exercise', section: 'cooldown', exercise_id: 'foam_rolling', target_duration_seconds: 600, notes: '10 min foam roll' },
        { block_order: 6, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 600, notes: '10 min full body stretch' },
      ],
    },
    // THURSDAY — Tempo
    {
      name: 'Tempo Day',
      description: 'Sustained effort at threshold pace. Builds lactate tolerance.',
      day_of_week: 'thursday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 300, incline: 0, intensity: 'zone2', outdoor_alternative: '5 min easy jog' },
        { block_order: 2, block_type: 'treadmill', section: 'main', duration_seconds: 1200, incline: 1, intensity: 'push', outdoor_alternative: '20 min tempo run — comfortably hard, can speak in short phrases', notes: '20 min at tempo pace' },
        { block_order: 3, block_type: 'treadmill', section: 'main', duration_seconds: 300, incline: 0, intensity: 'base', outdoor_alternative: '5 min easy jog cooldown' },
        // Core circuit
        { block_order: 4, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 60, rest_seconds: 30 },
        { block_order: 5, block_type: 'exercise', section: 'core', exercise_id: 'flutter_kick', target_sets: 3, target_reps: 20, rest_seconds: 30 },
        { block_order: 6, block_type: 'exercise', section: 'core', exercise_id: 'plank_hip_twist', target_sets: 3, target_reps: 16, rest_seconds: 30 },
        { block_order: 7, block_type: 'exercise', section: 'core', exercise_id: 'v_up', target_sets: 3, target_reps: 12, rest_seconds: 30 },
        { block_order: 8, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min stretch' },
      ],
    },
    // FRIDAY — Strength for Runners
    {
      name: 'Runner Strength',
      description: 'Lower body and posterior chain. Prevents injuries and builds power.',
      day_of_week: 'friday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 1, intensity: 'zone2', outdoor_alternative: '10 min easy jog' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'rdl', target_sets: 3, target_reps: 10, rest_seconds: 90, alt_exercise_id: 'dumbbell_rdl', alt_equipment: ['barbell'] },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'bulgarian_split_squat', target_sets: 3, target_reps: 10, rest_seconds: 90 },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'step_ups', target_sets: 3, target_reps: 10, rest_seconds: 60 },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'calf_raises', target_sets: 3, target_reps: 15, rest_seconds: 60 },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'hip_thrusts', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        { block_order: 7, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 45, rest_seconds: 30 },
        { block_order: 8, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 600, notes: '10 min lower body stretch' },
      ],
    },
    // SATURDAY — Long Effort
    {
      name: 'Long Effort',
      description: 'Your weekly long session. Build endurance at an easy pace.',
      day_of_week: 'saturday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'main', duration_seconds: 2700, incline: 1, intensity: 'zone2', outdoor_alternative: '45 min easy run, bike, or hike — conversational pace' },
        { block_order: 2, block_type: 'exercise', section: 'cooldown', exercise_id: 'deep_squat_hold', target_sets: 2, target_duration_seconds: 30, rest_seconds: 30 },
        { block_order: 3, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 600, notes: '10 min full body stretch' },
      ],
    },
    // SUNDAY — Rest
    {
      name: 'Rest Day',
      description: 'Full rest. Recover, hydrate, and prepare for next week.',
      day_of_week: 'sunday',
      blocks: [],
    },
  ],
};
