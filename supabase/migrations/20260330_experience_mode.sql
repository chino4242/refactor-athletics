-- Add experience mode to users table
-- 'rpg' = full RPG experience (themes, ranks, character, arena)
-- 'classic' = clean/minimal UI (percentages, personal bests, streaks)
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_mode TEXT DEFAULT 'rpg';
