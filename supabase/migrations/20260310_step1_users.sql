-- Step 1: Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS character_config jsonb DEFAULT '{
  "baseBody": "male",
  "powerLevelTier": 1,
  "skinTone": "#d4a574",
  "gear": {},
  "auraEnabled": false,
  "particleEffects": false
}'::jsonb;

ALTER TABLE users ADD COLUMN IF NOT EXISTS career_xp integer DEFAULT 0;
