-- Add per-region fat % columns to body_measurements
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS left_arm_fat numeric,
  ADD COLUMN IF NOT EXISTS right_arm_fat numeric,
  ADD COLUMN IF NOT EXISTS trunk_fat numeric,
  ADD COLUMN IF NOT EXISTS left_leg_fat numeric,
  ADD COLUMN IF NOT EXISTS right_leg_fat numeric;

-- Rename measurement_mode values from 'muscle' to 'scale'
UPDATE public.body_measurements SET measurement_mode = 'scale' WHERE measurement_mode = 'muscle';
UPDATE public.users SET measurement_mode = 'scale' WHERE measurement_mode = 'muscle';
