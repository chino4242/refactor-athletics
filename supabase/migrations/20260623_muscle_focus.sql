-- Add muscle_focus column to workout_programs
ALTER TABLE public.workout_programs ADD COLUMN IF NOT EXISTS muscle_focus text;
