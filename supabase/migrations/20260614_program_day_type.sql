-- Program system improvements: day_type for explicit rest days

ALTER TABLE workout_programs ADD COLUMN IF NOT EXISTS day_type TEXT DEFAULT 'training';
-- values: 'training', 'rest', 'active_recovery', 'deload'

-- Mark existing rest-day programs
UPDATE workout_programs SET day_type = 'rest' 
WHERE name ILIKE '%rest%' OR name ILIKE '%off%';

UPDATE workout_programs SET day_type = 'active_recovery'
WHERE name ILIKE '%recovery%' OR name ILIKE '%mobility%';
