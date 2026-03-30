-- Remove duplicate pull-ups entry (keep pull_ups with xp_factor 1.5, remove pullups with 0.8)
DELETE FROM catalog WHERE id = 'pullups';

-- Add required_equipment column
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS required_equipment jsonb DEFAULT '[]'::jsonb;

-- Populate equipment mappings
UPDATE catalog SET required_equipment = '["barbell", "bench"]' WHERE id IN ('bench_press', 'decline_bench_press', 'floor_press', 'incline_bench');
UPDATE catalog SET required_equipment = '["barbell"]' WHERE id IN ('back_squat', 'deadlift', 'barbell_row', 'barbell_bent_over_row', 'rdl', 'rack_pulls', 'good_mornings', 'military_press', 'push_press', 'bicep_curls', 'skull_crushers', 'close_grip_bench', 'sumo_deadlift', 'front_squat', 'overhead_press', 'thrusters', 'landmine_press', 'snatch', 'power_clean', 'hang_clean', 'clean_and_jerk', 'overhead_squat', 'split_jerk', 'barbell_row', 't_bar_row', 'shrugs', 'upright_row');
UPDATE catalog SET required_equipment = '["barbell", "squat_rack"]' WHERE id IN ('back_squat', 'front_squat', 'overhead_press', 'rack_pulls');
UPDATE catalog SET required_equipment = '["dumbbells"]' WHERE id IN ('dumbbell_curls', 'hammer_curls', 'lateral_raises', 'front_raises', 'rear_delt_flys', 'arnold_press', 'seated_dumbbell_press', 'dumbbell_row', 'db_single_arm_row', 'db_shrug', 'goblet_squat', 'lunges', 'bulgarian_split_squat', 'step_ups', 'hip_thrusts');
UPDATE catalog SET required_equipment = '["dumbbells", "bench"]' WHERE id IN ('dumbbell_bench_press', 'incline_dumbbell_press', 'db_incline_fly', 'db_incline_row', 'preacher_curls');
UPDATE catalog SET required_equipment = '["kettlebells"]' WHERE id IN ('kettlebell_swing_test', 'kettlebell_swings_generic');
UPDATE catalog SET required_equipment = '["pull_up_bar"]' WHERE id IN ('pull_ups', 'chin_ups', 'hanging_leg_raises', 'toes_to_bar', 'dead_hang');
UPDATE catalog SET required_equipment = '["pull_up_bar"]' WHERE id IN ('weighted_pullup');
UPDATE catalog SET required_equipment = '["rings"]' WHERE id = 'muscle_ups';
UPDATE catalog SET required_equipment = '["cables"]' WHERE id IN ('cable_flys', 'cable_row', 'lat_pulldown', 'face_pulls', 'tricep_pushdowns', 'overhead_tricep_ext', 'pec_deck');
UPDATE catalog SET required_equipment = '["rower"]' WHERE id IN ('rowing_general', 'row_6min');
UPDATE catalog SET required_equipment = '["assault_bike"]' WHERE id IN ('echo_bike_watts', 'max_calorie_echo_bike');
UPDATE catalog SET required_equipment = '["ski_erg"]' WHERE id = 'ski_erg';
UPDATE catalog SET required_equipment = '["box"]' WHERE id = 'box_jumps';
UPDATE catalog SET required_equipment = '["outdoor_running"]' WHERE id IN ('run_400m', 'run_1_mile', 'running_generic');
UPDATE catalog SET required_equipment = '["bodyweight_only"]' WHERE id IN ('push_ups', 'dips', 'burpees', 'burpee_broad_jumps', 'plank', 'sit_ups', 'russian_twists', 'handstand_pushups', 'wall_balls', 'rope_climbs', 'ab_roller', 'calf_raises', 'svend_press');
UPDATE catalog SET required_equipment = '["treadmill"]' WHERE id = 'stair_climber';

-- Machines that don't map to onboarding equipment (gym machines)
UPDATE catalog SET required_equipment = '["machines"]' WHERE id IN ('leg_press', 'hack_squat', 'leg_extensions', 'hamstring_curls', 'elliptical');

-- Cardio that needs minimal/no equipment
UPDATE catalog SET required_equipment = '["bodyweight_only"]' WHERE id IN ('jump_rope', 'double_unders', 'cycling', 'swimming');
UPDATE catalog SET required_equipment = '["resistance_bands"]' WHERE id = 'sled_push';
