-- Fix: Remove foreign key constraint on workouts.exercise_id
-- This allows workout blocks (block_*) to be logged without existing in catalog

ALTER TABLE workouts 
DROP CONSTRAINT IF EXISTS workouts_exercise_id_fkey;

-- Optionally, add it back but only for non-block exercises
-- (This is more complex, so we'll just remove it for now)
