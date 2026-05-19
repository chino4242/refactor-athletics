import { DefaultProgram } from './types';

export const HYBRID_PROGRAM: DefaultProgram = {
  training_path: 'hybrid',
  days: [
    // MONDAY — Push + Cardio
    {
      name: 'Push + Cardio',
      description: 'Treadmill intervals followed by chest, shoulders, and triceps.',
      day_of_week: 'monday',
      blocks: [
        // Treadmill intervals
        { block_order: 1, block_type: 'treadmill', section: 'cardio', duration_seconds: 180, incline: 0, intensity: 'base', outdoor_alternative: '3 min easy jog' },
        { block_order: 2, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 4, intensity: 'push', outdoor_alternative: '1 min uphill push' },
        { block_order: 3, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min easy recovery' },
        { block_order: 4, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 6, intensity: 'all_out', outdoor_alternative: '1 min hard sprint' },
        { block_order: 5, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min easy recovery' },
        { block_order: 6, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 4, intensity: 'push', outdoor_alternative: '1 min uphill push' },
        { block_order: 7, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min easy recovery' },
        { block_order: 8, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 6, intensity: 'all_out', outdoor_alternative: '1 min hard sprint' },
        { block_order: 9, block_type: 'treadmill', section: 'cardio', duration_seconds: 120, incline: 0, intensity: 'base', outdoor_alternative: '2 min cooldown jog' },
        // Push strength
        { block_order: 10, block_type: 'exercise', section: 'main', exercise_id: 'bench_press', target_sets: 4, target_reps: 8, rest_seconds: 90, alt_exercise_id: 'dumbbell_bench_press', alt_equipment: ['barbell', 'bench'] },
        { block_order: 11, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_incline_bench_press', target_sets: 3, target_reps: 10, rest_seconds: 60 },
        { block_order: 12, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_standing_shoulder_press', target_sets: 3, target_reps: 10, rest_seconds: 60 },
        { block_order: 13, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_lateral_raise', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        { block_order: 14, block_type: 'exercise', section: 'main', exercise_id: 'tricep_pushdowns', target_sets: 3, target_reps: 12, rest_seconds: 60, alt_exercise_id: 'dumbbell_overhead_tricep_extension', alt_equipment: ['cables'] },
        // Core
        { block_order: 15, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 2, target_duration_seconds: 45, rest_seconds: 30 },
        { block_order: 16, block_type: 'exercise', section: 'core', exercise_id: 'ab_crunch', target_sets: 2, target_reps: 15, rest_seconds: 30 },
      ],
    },
    // TUESDAY — Pull + Cardio
    {
      name: 'Pull + Cardio',
      description: 'Treadmill incline work followed by back and biceps.',
      day_of_week: 'tuesday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'cardio', duration_seconds: 180, incline: 0, intensity: 'base', outdoor_alternative: '3 min easy jog' },
        { block_order: 2, block_type: 'treadmill', section: 'cardio', duration_seconds: 120, incline: 8, intensity: 'push', outdoor_alternative: '2 min hill climb' },
        { block_order: 3, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min recovery' },
        { block_order: 4, block_type: 'treadmill', section: 'cardio', duration_seconds: 120, incline: 10, intensity: 'push', outdoor_alternative: '2 min steep hill' },
        { block_order: 5, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min recovery' },
        { block_order: 6, block_type: 'treadmill', section: 'cardio', duration_seconds: 120, incline: 8, intensity: 'push', outdoor_alternative: '2 min hill climb' },
        { block_order: 7, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min recovery' },
        // Pull strength
        { block_order: 8, block_type: 'exercise', section: 'main', exercise_id: 'barbell_row', target_sets: 4, target_reps: 8, rest_seconds: 90, alt_exercise_id: 'dumbbell_bent_over_row', alt_equipment: ['barbell'] },
        { block_order: 9, block_type: 'exercise', section: 'main', exercise_id: 'lat_pulldown', target_sets: 3, target_reps: 10, rest_seconds: 60, alt_exercise_id: 'pull_ups', alt_equipment: ['cables'] },
        { block_order: 10, block_type: 'exercise', section: 'main', exercise_id: 'cable_row', target_sets: 3, target_reps: 10, rest_seconds: 60, alt_exercise_id: 'dumbbell_incline_bench_row', alt_equipment: ['cables'] },
        { block_order: 11, block_type: 'exercise', section: 'main', exercise_id: 'face_pulls', target_sets: 3, target_reps: 15, rest_seconds: 60, alt_exercise_id: 'dumbbell_lying_rear_lateral_raise', alt_equipment: ['cables'] },
        { block_order: 12, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_bicep_curl', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        // Core
        { block_order: 13, block_type: 'exercise', section: 'core', exercise_id: 'hanging_leg_raise', target_sets: 2, target_reps: 12, rest_seconds: 30, alt_exercise_id: 'lying_straight_leg_raise', alt_equipment: ['pull_up_bar'] },
        { block_order: 14, block_type: 'exercise', section: 'core', exercise_id: 'russian_twists', target_sets: 2, target_reps: 20, rest_seconds: 30 },
      ],
    },
    // WEDNESDAY — Active Recovery
    {
      name: 'Active Recovery',
      description: 'Light movement, mobility, and stretching.',
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
    // THURSDAY — Legs + Cardio
    {
      name: 'Legs + Cardio',
      description: 'Treadmill intervals followed by lower body strength.',
      day_of_week: 'thursday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'cardio', duration_seconds: 180, incline: 0, intensity: 'base', outdoor_alternative: '3 min easy jog' },
        { block_order: 2, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 3, intensity: 'push', outdoor_alternative: '1 min push pace' },
        { block_order: 3, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min recovery' },
        { block_order: 4, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 5, intensity: 'all_out', outdoor_alternative: '1 min sprint' },
        { block_order: 5, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min recovery' },
        { block_order: 6, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 3, intensity: 'push', outdoor_alternative: '1 min push pace' },
        { block_order: 7, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 0, intensity: 'base', outdoor_alternative: '1 min recovery' },
        { block_order: 8, block_type: 'treadmill', section: 'cardio', duration_seconds: 60, incline: 5, intensity: 'all_out', outdoor_alternative: '1 min sprint' },
        { block_order: 9, block_type: 'treadmill', section: 'cardio', duration_seconds: 120, incline: 0, intensity: 'base', outdoor_alternative: '2 min cooldown jog' },
        // Legs
        { block_order: 10, block_type: 'exercise', section: 'main', exercise_id: 'back_squat', target_sets: 4, target_reps: 8, rest_seconds: 120, alt_exercise_id: 'goblet_squat', alt_equipment: ['barbell', 'squat_rack'] },
        { block_order: 11, block_type: 'exercise', section: 'main', exercise_id: 'rdl', target_sets: 3, target_reps: 10, rest_seconds: 90, alt_exercise_id: 'dumbbell_rdl', alt_equipment: ['barbell'] },
        { block_order: 12, block_type: 'exercise', section: 'main', exercise_id: 'bulgarian_split_squat', target_sets: 3, target_reps: 10, rest_seconds: 60 },
        { block_order: 13, block_type: 'exercise', section: 'main', exercise_id: 'calf_raises', target_sets: 3, target_reps: 15, rest_seconds: 60 },
        // Core
        { block_order: 14, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 2, target_duration_seconds: 45, rest_seconds: 30 },
        { block_order: 15, block_type: 'exercise', section: 'core', exercise_id: 'v_up', target_sets: 2, target_reps: 12, rest_seconds: 30 },
      ],
    },
    // FRIDAY — Full Body Power
    {
      name: 'Full Body Power',
      description: 'Compound movements at moderate intensity. Finish the week strong.',
      day_of_week: 'friday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 1, intensity: 'zone2', outdoor_alternative: '10 min brisk walk or light jog' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'barbell_overhead_press', target_sets: 3, target_reps: 8, rest_seconds: 90, alt_exercise_id: 'dumbbell_standing_shoulder_press', alt_equipment: ['barbell'] },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'deadlift', target_sets: 3, target_reps: 6, rest_seconds: 120, alt_exercise_id: 'dumbbell_deadlift', alt_equipment: ['barbell'] },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'dip', target_sets: 3, target_reps: 10, rest_seconds: 60, alt_exercise_id: 'push_up', alt_equipment: ['bodyweight_only'] },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'chin_up', target_sets: 3, target_reps: 8, rest_seconds: 60, alt_exercise_id: 'lat_pulldown', alt_equipment: ['pull_up_bar'] },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_hammer_bicep_curl', target_sets: 2, target_reps: 12, rest_seconds: 60 },
        { block_order: 7, block_type: 'exercise', section: 'core', exercise_id: 'ab_roller', target_sets: 3, target_reps: 10, rest_seconds: 30, alt_exercise_id: 'ab_crunch', alt_equipment: ['ab_roller'] },
        { block_order: 8, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min full body stretch' },
      ],
    },
    // SATURDAY — Cardio + Core
    {
      name: 'Cardio & Core',
      description: 'Steady-state cardio with a core finisher. Great day to get outside.',
      day_of_week: 'saturday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'main', duration_seconds: 1800, incline: 2, intensity: 'zone2', outdoor_alternative: '30 min easy run, bike, or hike' },
        { block_order: 2, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 60, rest_seconds: 30 },
        { block_order: 3, block_type: 'exercise', section: 'core', exercise_id: 'flutter_kick', target_sets: 3, target_reps: 20, rest_seconds: 30 },
        { block_order: 4, block_type: 'exercise', section: 'core', exercise_id: 'russian_twists', target_sets: 3, target_reps: 20, rest_seconds: 30 },
        { block_order: 5, block_type: 'exercise', section: 'core', exercise_id: 'v_up', target_sets: 3, target_reps: 15, rest_seconds: 30 },
        { block_order: 6, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min full body stretch' },
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
