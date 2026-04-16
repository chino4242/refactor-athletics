import { DefaultProgram } from './types';

export const STRENGTH_PROGRAM: DefaultProgram = {
  training_path: 'strength',
  days: [
    // MONDAY — Push (Chest/Shoulders/Triceps)
    {
      name: 'Push Day',
      description: 'Chest, shoulders, and triceps. Compound movements first, then accessories.',
      day_of_week: 'monday',
      blocks: [
        // Warmup: 10 min treadmill
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 1, intensity: 'zone2', outdoor_alternative: '10 min brisk walk or light jog' },
        // Main: Push compounds + accessories
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'bench_press', target_sets: 4, target_reps: 8, rest_seconds: 120, alt_exercise_id: 'dumbbell_bench_press', alt_equipment: ['barbell', 'bench'] },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'barbell_incline_bench_press', target_sets: 3, target_reps: 10, rest_seconds: 90, alt_exercise_id: 'dumbbell_incline_bench_press', alt_equipment: ['barbell'] },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'military_press', target_sets: 3, target_reps: 10, rest_seconds: 90, alt_exercise_id: 'dumbbell_standing_shoulder_press', alt_equipment: ['barbell'] },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_lateral_raise', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'tricep_pushdowns', target_sets: 3, target_reps: 12, rest_seconds: 60, alt_exercise_id: 'dumbbell_overhead_tricep_extension', alt_equipment: ['cables'] },
        // Core
        { block_order: 7, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 45, rest_seconds: 30 },
        { block_order: 8, block_type: 'exercise', section: 'core', exercise_id: 'ab_crunch', target_sets: 3, target_reps: 15, rest_seconds: 30 },
        // Cooldown
        { block_order: 9, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min upper body stretch' },
      ],
    },
    // TUESDAY — Pull (Back/Biceps)
    {
      name: 'Pull Day',
      description: 'Back and biceps. Heavy rows and pulls, then isolation work.',
      day_of_week: 'tuesday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 1, intensity: 'zone2', outdoor_alternative: '10 min brisk walk or light jog' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'barbell_row', target_sets: 4, target_reps: 8, rest_seconds: 120, alt_exercise_id: 'dumbbell_bent_over_row', alt_equipment: ['barbell'] },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'lat_pulldown', target_sets: 3, target_reps: 10, rest_seconds: 90, alt_exercise_id: 'pull_ups', alt_equipment: ['cables'] },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'cable_row', target_sets: 3, target_reps: 10, rest_seconds: 90, alt_exercise_id: 'dumbbell_incline_bench_row', alt_equipment: ['cables'] },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'face_pulls', target_sets: 3, target_reps: 15, rest_seconds: 60, alt_exercise_id: 'dumbbell_lying_rear_lateral_raise', alt_equipment: ['cables'] },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_bicep_curl', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        { block_order: 7, block_type: 'exercise', section: 'core', exercise_id: 'hanging_leg_raise', target_sets: 3, target_reps: 12, rest_seconds: 30, alt_exercise_id: 'lying_straight_leg_raise', alt_equipment: ['pull_up_bar'] },
        { block_order: 8, block_type: 'exercise', section: 'core', exercise_id: 'russian_twists', target_sets: 3, target_reps: 20, rest_seconds: 30 },
        { block_order: 9, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min upper body stretch' },
      ],
    },
    // WEDNESDAY — Active Recovery
    {
      name: 'Active Recovery',
      description: 'Light movement, mobility work, and stretching. Keep it easy.',
      day_of_week: 'wednesday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 1200, incline: 0, intensity: 'zone2', outdoor_alternative: '20 min easy walk' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'deep_squat_hold', target_sets: 3, target_duration_seconds: 30, rest_seconds: 30 },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'wall_slide', target_sets: 3, target_reps: 10, rest_seconds: 30 },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'shoulder_dislocate', target_sets: 3, target_reps: 10, rest_seconds: 30 },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'cossack_squat', target_sets: 3, target_reps: 8, rest_seconds: 30 },
        { block_order: 6, block_type: 'exercise', section: 'cooldown', exercise_id: 'foam_rolling', target_duration_seconds: 600, notes: '10 min foam roll — quads, hamstrings, back, lats' },
        { block_order: 7, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 600, notes: '10 min full body stretch' },
      ],
    },
    // THURSDAY — Legs
    {
      name: 'Leg Day',
      description: 'Quads, hamstrings, and glutes. Build your foundation.',
      day_of_week: 'thursday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 1, intensity: 'zone2', outdoor_alternative: '10 min brisk walk or light jog' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'back_squat', target_sets: 4, target_reps: 8, rest_seconds: 120, alt_exercise_id: 'goblet_squat', alt_equipment: ['barbell', 'squat_rack'] },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'rdl', target_sets: 3, target_reps: 10, rest_seconds: 90, alt_exercise_id: 'dumbbell_rdl', alt_equipment: ['barbell'] },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'bulgarian_split_squat', target_sets: 3, target_reps: 10, rest_seconds: 90 },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'hamstring_curls', target_sets: 3, target_reps: 12, rest_seconds: 60, alt_exercise_id: 'dumbbell_rdl', alt_equipment: ['machines'] },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'calf_raises', target_sets: 3, target_reps: 15, rest_seconds: 60 },
        { block_order: 7, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 45, rest_seconds: 30 },
        { block_order: 8, block_type: 'exercise', section: 'core', exercise_id: 'v_up', target_sets: 3, target_reps: 12, rest_seconds: 30 },
        { block_order: 9, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min lower body stretch' },
      ],
    },
    // FRIDAY — Upper Power
    {
      name: 'Upper Power',
      description: 'Compound upper body with heavier loads and accessories.',
      day_of_week: 'friday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 1, intensity: 'zone2', outdoor_alternative: '10 min brisk walk or light jog' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'barbell_overhead_press', target_sets: 4, target_reps: 6, rest_seconds: 120, alt_exercise_id: 'dumbbell_seated_shoulder_press', alt_equipment: ['barbell'] },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'barbell_bent_over_row', target_sets: 4, target_reps: 6, rest_seconds: 120, alt_exercise_id: 'dumbbell_bent_over_row', alt_equipment: ['barbell'] },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'dip', target_sets: 3, target_reps: 10, rest_seconds: 90 },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'chin_up', target_sets: 3, target_reps: 8, rest_seconds: 90, alt_exercise_id: 'lat_pulldown', alt_equipment: ['pull_up_bar'] },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_hammer_bicep_curl', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        { block_order: 7, block_type: 'exercise', section: 'core', exercise_id: 'ab_roller', target_sets: 3, target_reps: 10, rest_seconds: 30 },
        { block_order: 8, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min full body stretch' },
      ],
    },
    // SATURDAY — Outdoor Cardio + Core
    {
      name: 'Cardio & Core',
      description: 'Steady-state cardio with core finisher. Great day to get outside.',
      day_of_week: 'saturday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 1800, incline: 2, intensity: 'zone2', outdoor_alternative: '30 min easy run, bike, or hike' },
        { block_order: 2, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 60, rest_seconds: 30 },
        { block_order: 3, block_type: 'exercise', section: 'core', exercise_id: 'flutter_kick', target_sets: 3, target_reps: 20, rest_seconds: 30 },
        { block_order: 4, block_type: 'exercise', section: 'core', exercise_id: 'russian_twists', target_sets: 3, target_reps: 20, rest_seconds: 30 },
        { block_order: 5, block_type: 'exercise', section: 'core', exercise_id: 'v_up', target_sets: 3, target_reps: 15, rest_seconds: 30 },
        { block_order: 6, block_type: 'exercise', section: 'cooldown', exercise_id: 'deep_squat_hold', target_sets: 2, target_duration_seconds: 30, rest_seconds: 30 },
        { block_order: 7, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 300, notes: '5 min full body stretch' },
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
