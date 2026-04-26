-- Add missing mobility/recovery exercises
INSERT INTO catalog (id, name, category, type, xp_factor, standards)
VALUES
    ('cat_cow', 'Cat-Cow', 'Mobility', 'weight_reps', 0.5, '{"unit": "reps", "scoring": "higher_is_better", "brackets": {"male": [], "female": []}, "has_age_brackets": false}'),
    ('thread_the_needle', 'Thread the Needle', 'Mobility', 'timed', 0.5, '{"unit": "seconds", "scoring": "higher_is_better", "brackets": {"male": [], "female": []}, "has_age_brackets": false}'),
    ('couch_stretch', 'Couch Stretch (Hip Flexor)', 'Mobility', 'timed', 0.5, '{"unit": "seconds", "scoring": "higher_is_better", "brackets": {"male": [], "female": []}, "has_age_brackets": false}'),
    ('hip_90_90', '90/90 Hip Opener', 'Mobility', 'timed', 0.5, '{"unit": "seconds", "scoring": "higher_is_better", "brackets": {"male": [], "female": []}, "has_age_brackets": false}'),
    ('doorway_chest_stretch', 'Doorway Chest Stretch', 'Mobility', 'timed', 0.5, '{"unit": "seconds", "scoring": "higher_is_better", "brackets": {"male": [], "female": []}, "has_age_brackets": false}')
ON CONFLICT (id) DO NOTHING;

-- Create Wednesday Active Recovery program for each path
-- We'll create one default program that applies to all paths
INSERT INTO workout_programs (id, user_id, name, day_of_week, is_default, training_path, variant)
VALUES
    ('wed_recovery_hybrid', null, 'Active Recovery', 'wednesday', true, 'hybrid', 'A'),
    ('wed_recovery_strength', null, 'Active Recovery', 'wednesday', true, 'strength', 'A'),
    ('wed_recovery_endurance', null, 'Active Recovery', 'wednesday', true, 'endurance', 'A'),
    ('wed_recovery_mobility', null, 'Active Recovery', 'wednesday', true, 'mobility', 'A')
ON CONFLICT (id) DO NOTHING;

-- Program blocks for all Wednesday recovery programs (same content)
-- Section 1: Foam Rolling
INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 1, 'exercise', 'foam_rolling', 'warmup', 1, 600, 'Quads, hamstrings, back, shoulders — 2 min each'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');

-- Section 2: Mobility Circuit (2 rounds)
INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 2, 'exercise', 'doorway_chest_stretch', 'main', 2, 30, '30 sec per side'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 3, 'exercise', 'dead_hang', 'main', 2, 30, 'Lat hang — decompress the spine'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 4, 'exercise', 'shoulder_dislocate', 'main', 2, 15, 'Slow and controlled'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 5, 'exercise', 'hip_90_90', 'main', 2, 30, '30 sec per side'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 6, 'exercise', 'deep_squat_hold', 'main', 2, 45, 'Sink deep, chest up'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_reps, notes)
SELECT id, 7, 'exercise', 'cat_cow', 'main', 2, 10, 'Slow — match breath to movement'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 8, 'exercise', 'thread_the_needle', 'main', 2, 30, '30 sec per side — thoracic rotation'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');

INSERT INTO program_blocks (workout_id, block_order, block_type, exercise_id, section, target_sets, target_duration_seconds, notes)
SELECT id, 9, 'exercise', 'couch_stretch', 'main', 2, 30, '30 sec per side — open up hip flexors'
FROM workout_programs WHERE id IN ('wed_recovery_hybrid', 'wed_recovery_strength', 'wed_recovery_endurance', 'wed_recovery_mobility');
