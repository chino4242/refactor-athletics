ALTER TABLE users ADD COLUMN IF NOT EXISTS available_equipment jsonb DEFAULT '[]'::jsonb;
