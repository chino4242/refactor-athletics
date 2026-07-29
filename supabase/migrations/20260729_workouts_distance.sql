-- Add distance_meters to workouts for tracking actual run distances
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS distance_meters numeric;
