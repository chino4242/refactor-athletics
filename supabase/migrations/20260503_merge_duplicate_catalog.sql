-- Merge duplicate catalog entries: remap references then delete duplicates
-- Keep the entry with standards (or the plural form when neither has standards)

-- 1. Remap workout logs
UPDATE workouts SET exercise_id = 'dip' WHERE exercise_id = 'dips';
UPDATE workouts SET exercise_id = 'chin_ups' WHERE exercise_id = 'chin_up';
UPDATE workouts SET exercise_id = 'face_pulls' WHERE exercise_id = 'face_pull';
UPDATE workouts SET exercise_id = 'smith_calf_raise' WHERE exercise_id = 'smith_machine_calf_raise';
UPDATE workouts SET exercise_id = 'hanging_leg_raises' WHERE exercise_id = 'hanging_leg_raise';
UPDATE workouts SET exercise_id = 'burpees' WHERE exercise_id = 'burpee';
UPDATE workouts SET exercise_id = 'pull_up' WHERE exercise_id = 'pull_ups';
UPDATE workouts SET exercise_id = 'push_ups' WHERE exercise_id = 'push_up';

-- 2. Remap program blocks
UPDATE program_blocks SET exercise_id = 'dip' WHERE exercise_id = 'dips';
UPDATE program_blocks SET exercise_id = 'chin_ups' WHERE exercise_id = 'chin_up';
UPDATE program_blocks SET exercise_id = 'face_pulls' WHERE exercise_id = 'face_pull';
UPDATE program_blocks SET exercise_id = 'smith_calf_raise' WHERE exercise_id = 'smith_machine_calf_raise';
UPDATE program_blocks SET exercise_id = 'hanging_leg_raises' WHERE exercise_id = 'hanging_leg_raise';
UPDATE program_blocks SET exercise_id = 'burpees' WHERE exercise_id = 'burpee';
UPDATE program_blocks SET exercise_id = 'pull_up' WHERE exercise_id = 'pull_ups';
UPDATE program_blocks SET exercise_id = 'push_ups' WHERE exercise_id = 'push_up';

-- 3. Delete the duplicate entries (the ones WITHOUT standards or the singular form)
DELETE FROM catalog WHERE id IN (
  'dips',                    -- keep dip (has standards)
  'chin_up',                 -- keep chin_ups
  'face_pull',               -- keep face_pulls
  'smith_machine_calf_raise',-- keep smith_calf_raise (same name, shorter id)
  'hanging_leg_raise',       -- keep hanging_leg_raises
  'burpee',                  -- keep burpees (has standards)
  'pull_ups',                -- keep pull_up (has standards)
  'push_up'                  -- keep push_ups (has standards)
);
