-- Fix core blocks: delete broken/thin ones and replace with proper circuits
-- Delete existing core blocks for hybrid programs
DELETE FROM program_blocks
WHERE section = 'core'
AND workout_id IN (
    SELECT id FROM workout_programs WHERE is_default = true AND training_path = 'hybrid'
);

-- Monday: Plank + Hanging Leg Raises + Russian Twists
INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 20, 'exercise', 'plank', 'core', 3, 45, 'Hold steady — squeeze glutes and brace core'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'monday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 21, 'exercise', 'hanging_leg_raise', 'core', 3, 12, 'Control the descent — no swinging'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'monday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 22, 'exercise', 'russian_twists', 'core', 3, 20, '20 total (10 per side)'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'monday';

-- Tuesday: Plank + Flutter Kicks + V-Ups
INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 20, 'exercise', 'plank', 'core', 3, 45, 'Hold steady — squeeze glutes and brace core'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'tuesday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 21, 'exercise', 'flutter_kick', 'core', 3, 20, 'Keep lower back pressed to floor'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'tuesday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 22, 'exercise', 'v_up', 'core', 3, 12, 'Touch toes at the top'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'tuesday';

-- Thursday: Plank Hip Twist + Cable Crunch + Toes to Bar
INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 20, 'exercise', 'plank_hip_twist', 'core', 3, 20, '20 total (10 per side) — controlled rotation'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'thursday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 21, 'exercise', 'cable_kneeling_crunch', 'core', 3, 15, 'Squeeze at the bottom'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'thursday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 22, 'exercise', 'toes_to_bar', 'core', 3, 10, 'Controlled — no kipping'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'thursday';

-- Friday: Elbow Plank + Ab Roller + Sit-Ups
INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 20, 'exercise', 'elbow_plank', 'core', 3, 45, 'Elbows under shoulders — flat back'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'friday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 21, 'exercise', 'ab_roller', 'core', 3, 10, 'Slow and controlled — full extension'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'friday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 22, 'exercise', 'sit_ups', 'core', 3, 15, 'Full range of motion'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'friday';

-- Saturday: Plank + Lying Leg Raises + Russian Twists
INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 20, 'exercise', 'plank', 'core', 3, 60, 'Push for 60 seconds'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'saturday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 21, 'exercise', 'lying_straight_leg_raise', 'core', 3, 15, 'Slow descent — keep legs straight'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'saturday';

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 22, 'exercise', 'russian_twists', 'core', 3, 20, '20 total (10 per side)'
FROM workout_programs WHERE is_default = true AND training_path = 'hybrid' AND day_of_week ILIKE 'saturday';
