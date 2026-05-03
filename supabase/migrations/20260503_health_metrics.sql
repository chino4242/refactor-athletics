-- Add health metrics columns to body_measurements
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS lean_body_mass NUMERIC;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS vo2_max NUMERIC;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS bmr NUMERIC;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS height NUMERIC;
