import { DefaultProgram } from './types';

export const MOBILITY_PROGRAM: DefaultProgram = {
  training_path: 'mobility',
  days: [
    // MONDAY — Lower Body Mobility + Light Strength
    {
      name: 'Lower Body Mobility',
      description: 'Hip, ankle, and hamstring mobility with light lower body strength.',
      day_of_week: 'monday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 0, intensity: 'zone2', outdoor_alternative: '10 min easy walk' },
        // Mobility flow
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'deep_squat_hold', target_sets: 4, target_duration_seconds: 30, rest_seconds: 15 },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'cossack_squat', target_sets: 3, target_reps: 8, rest_seconds: 30, notes: 'Slow and controlled, each side' },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'ankle_plantar_and_dorsiflexion', target_sets: 3, target_reps: 15, rest_seconds: 15 },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'body_weight_squat', target_sets: 3, target_reps: 15, rest_seconds: 30, notes: 'Full depth, slow tempo' },
        // Light strength
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'goblet_squat', target_sets: 3, target_reps: 10, rest_seconds: 60, alt_exercise_id: 'body_weight_squat', alt_equipment: ['dumbbells'] },
        { block_order: 7, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_forward_lunge', target_sets: 3, target_reps: 10, rest_seconds: 60, alt_exercise_id: 'barbell_forward_lunge', alt_equipment: ['dumbbells'] },
        // Core
        { block_order: 8, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 45, rest_seconds: 30 },
        { block_order: 9, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 600, notes: '10 min lower body stretch — hamstrings, hip flexors, calves' },
      ],
    },
    // TUESDAY — Upper Body Mobility + Light Strength
    {
      name: 'Upper Body Mobility',
      description: 'Shoulder and thoracic mobility with light upper body work.',
      day_of_week: 'tuesday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 0, intensity: 'zone2', outdoor_alternative: '10 min easy walk' },
        // Mobility flow
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'wall_slide', target_sets: 4, target_reps: 10, rest_seconds: 15 },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'shoulder_dislocate', target_sets: 4, target_reps: 10, rest_seconds: 15 },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'active_hang', target_sets: 3, target_duration_seconds: 20, rest_seconds: 30, alt_exercise_id: 'overhead_squat_hold', alt_equipment: ['pull_up_bar'] },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'overhead_squat_hold', target_sets: 3, target_duration_seconds: 20, rest_seconds: 30 },
        // Light strength
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'push_up', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        { block_order: 7, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_bent_over_row', target_sets: 3, target_reps: 10, rest_seconds: 60 },
        { block_order: 8, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_lateral_raise', target_sets: 2, target_reps: 12, rest_seconds: 60 },
        // Core
        { block_order: 9, block_type: 'exercise', section: 'core', exercise_id: 'plank_hip_twist', target_sets: 3, target_reps: 16, rest_seconds: 30 },
        { block_order: 10, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 600, notes: '10 min upper body stretch — shoulders, chest, lats, thoracic' },
      ],
    },
    // WEDNESDAY — Full Body Flow
    {
      name: 'Full Body Flow',
      description: 'Guided movement flow combining all mobility patterns.',
      day_of_week: 'wednesday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 0, intensity: 'zone2', outdoor_alternative: '10 min easy walk' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'deep_squat_hold', target_sets: 3, target_duration_seconds: 30, rest_seconds: 15 },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'wall_slide', target_sets: 3, target_reps: 10, rest_seconds: 15 },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'cossack_squat', target_sets: 3, target_reps: 8, rest_seconds: 15 },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'shoulder_dislocate', target_sets: 3, target_reps: 10, rest_seconds: 15 },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'overhead_squat_hold', target_sets: 3, target_duration_seconds: 20, rest_seconds: 15 },
        { block_order: 7, block_type: 'exercise', section: 'main', exercise_id: 'yoga', target_duration_seconds: 1200, notes: '20 min yoga flow — sun salutations, warrior poses, pigeon' },
        { block_order: 8, block_type: 'exercise', section: 'cooldown', exercise_id: 'meditation', target_duration_seconds: 300, notes: '5 min breathing — box breathing 4-4-4-4' },
      ],
    },
    // THURSDAY — Posterior Chain
    {
      name: 'Posterior Chain',
      description: 'Hip hinge and spinal mobility with light deadlift work.',
      day_of_week: 'thursday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 600, incline: 0, intensity: 'zone2', outdoor_alternative: '10 min easy walk' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'deep_squat_hold', target_sets: 3, target_duration_seconds: 30, rest_seconds: 15 },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'active_hang', target_sets: 3, target_duration_seconds: 20, rest_seconds: 30, alt_exercise_id: 'overhead_squat_hold', alt_equipment: ['pull_up_bar'] },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'cossack_squat', target_sets: 3, target_reps: 8, rest_seconds: 30 },
        // Light strength — posterior chain
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'dumbbell_rdl', target_sets: 3, target_reps: 10, rest_seconds: 60, alt_exercise_id: 'rdl', alt_equipment: ['dumbbells'] },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'hip_thrusts', target_sets: 3, target_reps: 12, rest_seconds: 60 },
        // Core
        { block_order: 7, block_type: 'exercise', section: 'core', exercise_id: 'plank', target_sets: 3, target_duration_seconds: 45, rest_seconds: 30 },
        { block_order: 8, block_type: 'exercise', section: 'core', exercise_id: 'lying_straight_leg_raise', target_sets: 3, target_reps: 12, rest_seconds: 30 },
        { block_order: 9, block_type: 'exercise', section: 'cooldown', exercise_id: 'foam_rolling', target_duration_seconds: 600, notes: '10 min foam roll — hamstrings, glutes, back' },
      ],
    },
    // FRIDAY — Test Day + Full Body
    {
      name: 'Test Day',
      description: 'Re-test your mobility exercises and see your Power Level grow.',
      day_of_week: 'friday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'warmup', duration_seconds: 900, incline: 0, intensity: 'zone2', outdoor_alternative: '15 min easy walk with dynamic stretches' },
        // Mobility tests — go for max
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'deep_squat_hold', target_sets: 1, target_duration_seconds: 120, rest_seconds: 60, notes: 'MAX EFFORT — hold as long as possible' },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'active_hang', target_sets: 1, target_duration_seconds: 90, rest_seconds: 60, notes: 'MAX EFFORT — hang as long as possible', alt_exercise_id: 'overhead_squat_hold', alt_equipment: ['pull_up_bar'] },
        { block_order: 4, block_type: 'exercise', section: 'main', exercise_id: 'wall_slide', target_sets: 1, target_reps: 30, rest_seconds: 60, notes: 'MAX EFFORT — full ROM reps' },
        { block_order: 5, block_type: 'exercise', section: 'main', exercise_id: 'overhead_squat_hold', target_sets: 1, target_duration_seconds: 60, rest_seconds: 60, notes: 'MAX EFFORT — hold as long as possible' },
        { block_order: 6, block_type: 'exercise', section: 'main', exercise_id: 'cossack_squat', target_sets: 1, target_reps: 20, rest_seconds: 60, notes: 'MAX EFFORT — each side' },
        { block_order: 7, block_type: 'exercise', section: 'main', exercise_id: 'shoulder_dislocate', target_sets: 1, target_reps: 30, rest_seconds: 60, notes: 'MAX EFFORT — full ROM reps' },
        // Light full body
        { block_order: 8, block_type: 'exercise', section: 'main', exercise_id: 'push_up', target_sets: 2, target_reps: 15, rest_seconds: 60 },
        { block_order: 9, block_type: 'exercise', section: 'main', exercise_id: 'body_weight_squat', target_sets: 2, target_reps: 15, rest_seconds: 60 },
        { block_order: 10, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 600, notes: '10 min full body stretch' },
      ],
    },
    // SATURDAY — Outdoor Movement
    {
      name: 'Outdoor Movement',
      description: 'Get outside. Walk, hike, or move with bodyweight mobility.',
      day_of_week: 'saturday',
      blocks: [
        { block_order: 1, block_type: 'treadmill', section: 'main', duration_seconds: 1800, incline: 0, intensity: 'zone2', outdoor_alternative: '30 min walk or hike' },
        { block_order: 2, block_type: 'exercise', section: 'main', exercise_id: 'deep_squat_hold', target_sets: 3, target_duration_seconds: 30, rest_seconds: 15 },
        { block_order: 3, block_type: 'exercise', section: 'main', exercise_id: 'cossack_squat', target_sets: 3, target_reps: 8, rest_seconds: 15 },
        { block_order: 4, block_type: 'exercise', section: 'cooldown', exercise_id: 'stretching', target_duration_seconds: 600, notes: '10 min full body stretch' },
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
