// Populate swap_group values for catalog exercises
// Run: npx tsx scripts/populate-swap-groups.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// swap_group: exercises that can substitute for each other (same movement pattern / muscle target)
const SWAP_GROUPS: Record<string, string[]> = {
  // === CHEST PRESS (horizontal push) ===
  horizontal_press: [
    'bench_press', 'barbell_bench_press_flat', 'dumbbell_bench_press', 'smith_bench_press',
    'floor_press', 'floor_military_press', 'barbell_close_grip_bench_press', 'close_grip_bench',
    'band_alternating_chest_press', 'landmine_press',
  ],
  incline_press: [
    'barbell_incline_bench_press', 'dumbbell_incline_bench_press', 'incline_dumbbell_press',
    'smith_incline_press', 'incline_bench', 'incline_fly_to_press',
  ],
  decline_press: [
    'decline_bench_press', 'smith_decline_press', 'band_alternating_decline_chest_press',
  ],
  chest_fly: [
    'cable_flys', 'cable_standing_chest_fly', 'cable_standing_high_fly',
    'dumbbell_incline_bench_chest_fly', 'pec_deck', 'pec_fly', 'svend_press',
  ],
  push_up: [
    'push_up', 'push_ups', 'decline_push_up', 'incline_push_up',
  ],
  dip: [
    'dip', 'dips', 'bench_dip',
  ],

  // === SHOULDER PRESS (vertical push) ===
  vertical_press: [
    'overhead_press', 'barbell_overhead_press', 'barbell_overhead_push_press',
    'barbell_seated_shoulder_press', 'dumbbell_seated_shoulder_press',
    'dumbbell_standing_shoulder_press', 'dumbbell_arnold_shoulder_press', 'arnold_press',
    'machine_shoulder_press', 'smith_overhead_press', 'military_press',
    'push_press', 'band_alternating_shoulder_press', 'landmine_shoulder_press',
    'seated_dumbbell_press',
  ],
  lateral_raise: [
    'dumbbell_lateral_raise', 'lateral_raises', 'dumbbell_front_raise', 'front_raises',
    'front_plate_raise', 'hip_huggers',
  ],
  rear_delt: [
    'rear_delt_flys', 'seated_reverse_fly', 'dumbbell_lying_rear_lateral_raise',
    'dumbbell_lying_reverse_lateral_raise', 'face_pull', 'face_pulls',
  ],
  upright_row: [
    'barbell_upright_row', 'dumbbell_upright_row', 'ez_bar_upright_row', 'upright_row',
    'kettlebell_upright_row', 'dumbbell_high_pull',
  ],
  shrug: [
    'shrugs', 'db_shrug', 'smith_shrug',
  ],

  // === BACK (pull) ===
  horizontal_row: [
    'barbell_row', 'barbell_bent_over_row', 'dumbbell_bent_over_row', 'dumbbell_row',
    'db_single_arm_row', 'cable_seated_row', 'cable_seated_wide_grip_row', 'cable_row',
    'smith_row', 't_bar_row', 't-bar_close_grip_row', 'band_alternating_row',
    'db_incline_row', 'dumbbell_incline_bench_row', 'barbell_rear_delt_row',
  ],
  vertical_pull: [
    'pull_up', 'pull_ups', 'wide_grip_pull_up', 'chin_up', 'chin_ups',
    'lat_pulldown', 'lat_machine_reverse_grip', 'lat_machine_wide_bar_close_grip_pulldown',
    'cable_pull_down',
  ],
  back_fly: [
    'db_incline_fly', 'dumbbell_incline_bench_back_fly', 'dumbbell_standing_back_fly',
  ],
  hip_hinge: [
    'deadlift', 'barbell_deadlift', 'dumbbell_deadlift', 'sumo_deadlift',
    'rdl', 'barbell_romanian_deadlift', 'dumbbell_rdl', 'smith_rdl',
    'good_mornings', 'rack_pulls',
  ],

  // === LEGS (squat / lunge / isolation) ===
  squat: [
    'back_squat', 'barbell_back_squat', 'barbell_front_squat', 'front_squat',
    'goblet_squat', 'goblet_squat_heels_elevated', 'kettlebell_goblet_squat',
    'dumbbell_squat', 'hack_squat', 'leg_press', 'smith_squat',
    'body_weight_squat', 'overhead_squat',
  ],
  lunge: [
    'barbell_forward_lunge', 'barbell_reverse_lunge', 'dumbbell_forward_lunge',
    'dumbbell_reverse_lunge', 'bulgarian_split_squat',
    'dumbbell_rear_foot_elevated_split_squat', 'lunges', 'step_ups',
    'body_weight_step_up', 'sandbag_lunges',
  ],
  leg_extension: [
    'leg_extensions', 'machine_seated_leg_extension',
  ],
  leg_curl: [
    'hamstring_curls', 'machine_lying_leg_curl',
  ],
  hip_thrust: [
    'hip_thrusts', 'smith_hip_thrust',
  ],
  calf_raise: [
    'calf_raises', 'machine_seated_calf_raise', 'smith_machine_calf_raise', 'smith_calf_raise',
  ],

  // === ARMS ===
  bicep_curl: [
    'barbell_bicep_curl', 'bicep_curls', 'barbell_narrow_grip_bicep_curl',
    'barbell_wide_grip_bicep_curl', 'barbell_21_bicep_curl',
    'dumbbell_bicep_curl', 'dumbbell_alternating_bicep_curl', 'dumbbell_curls',
    'dumbbell_concentration_curl', 'dumbbell_hammer_bicep_curl', 'hammer_curls',
    'cable_bicep_curl', 'cable_reverse_curl', 'ez-bar_curl', 'preacher_curls',
    'reverse_grip_ez_bar_curls_narrow', 'zottman_curl',
    'band_alternating_bicep_curl', 'band_alternating_incline_curl',
  ],
  tricep_extension: [
    'barbell_skullcrusher', 'skull_crushers', 'ez_bar_incline_bench_skull_crusher',
    'cable_straight_bar_tricep_pushdown', 'cable_reverse_grip_tricep_pulldown',
    'cable_v_bar_standing_tricep_extension', 'tricep_pushdowns',
    'dumbbell_lying_tricep_extension', 'dumbbell_overhead_tricep_extension',
    'standing_overhead_dumbbell_tricep_extension', 'overhead_tricep_ext',
  ],

  // === CORE ===
  core_flexion: [
    'ab_crunch', 'plate_weighted_crunch', 'plate_weighted_sit_up', 'sit_ups',
    'cable_kneeling_crunch', 'v_up', 'ab_roller', 'ab_roller_wheel_abdominal_roll_out',
  ],
  core_stability: [
    'plank', 'elbow_plank', 'high_plank', 'plank_hip_twist', 'russian_twists',
  ],
  leg_raise: [
    'hanging_leg_raise', 'hanging_leg_raises', 'lying_straight_leg_raise',
    'flutter_kick', 'toes_to_bar',
  ],

  // === CARDIO ===
  steady_cardio: [
    'running_generic', 'cycling', 'swimming', 'elliptical', 'rowing_general',
    'stair_climber', 'ski_erg', 'spinning',
  ],
  sprint: [
    'run_400m', 'running_5_miles',
  ],
  distance_run: [
    'run_1_mile',
  ],
  jump_rope: [
    'jump_rope', 'double_unders',
  ],
  conditioning: [
    'burpee', 'burpees', 'assault_bike', 'kettlebell_swing', 'kettlebell_swings_generic',
    'kettlebell_swing_test', 'wall_balls', 'thrusters', 'dumbbell_thruster',
  ],

  // === POWER ===
  carry: [
    'farmers_carry', 'sled_pull', 'sled_push',
  ],
  hang: [
    'dead_hang', 'active_hang',
  ],
  olympic_lift: [
    'clean_and_jerk', 'hang_clean', 'power_clean', 'snatch', 'split_jerk',
  ],
  explosive: [
    'box_jumps', 'burpee_broad_jumps', 'squat_jump',
  ],
  gymnastics: [
    'handstand_pushups', 'muscle_ups', 'rope_climbs',
  ],

  // === BIKE ===
  echo_bike: [
    'echo_bike_watts', 'max_calorie_echo_bike',
  ],

  // === ROW TEST ===
  row_test: [
    'row_6min',
  ],

  // === MOBILITY ===
  squat_mobility: [
    'deep_squat_hold', 'cossack_squat', 'overhead_squat_hold',
  ],
  shoulder_mobility: [
    'wall_slide', 'shoulder_dislocate',
  ],

  // === WEIGHTED PULL ===
  weighted_pullup: [
    'weighted_pullup',
  ],

  // === PULLOVER ===
  pullover: [
    'dumbbell_pullover',
  ],

  // === ANKLE ===
  ankle_mobility: [
    'ankle_inversion_and_eversion', 'ankle_plantar_and_dorsiflexion',
  ],
};

async function main() {
  let updated = 0;
  for (const [group, ids] of Object.entries(SWAP_GROUPS)) {
    const { error, count } = await sb
      .from('catalog')
      .update({ swap_group: group })
      .in('id', ids);
    if (error) console.error(`Error updating ${group}:`, error.message);
    else { updated += ids.length; console.log(`✓ ${group}: ${ids.length} exercises`); }
  }
  console.log(`\nDone. Updated ${updated} exercises.`);

  // Check for exercises without a swap group
  const { data: unmatched } = await sb.from('catalog').select('id, name, category').is('swap_group', null);
  if (unmatched?.length) {
    console.log(`\n${unmatched.length} exercises without swap_group:`);
    unmatched.forEach(e => console.log(`  ${e.category} | ${e.id} | ${e.name}`));
  }
}

main();
