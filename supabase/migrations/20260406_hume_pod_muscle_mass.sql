-- Add Hume Pod muscle mass columns to body_measurements
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS left_arm_muscle numeric,
  ADD COLUMN IF NOT EXISTS right_arm_muscle numeric,
  ADD COLUMN IF NOT EXISTS trunk_muscle numeric,
  ADD COLUMN IF NOT EXISTS left_leg_muscle numeric,
  ADD COLUMN IF NOT EXISTS right_leg_muscle numeric,
  ADD COLUMN IF NOT EXISTS measurement_mode text DEFAULT 'tape';

-- Store user's preferred measurement mode
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS measurement_mode text DEFAULT 'tape';
