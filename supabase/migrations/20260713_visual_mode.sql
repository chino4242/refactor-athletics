-- Visual mode preference (vibrant or retro)
ALTER TABLE users ADD COLUMN IF NOT EXISTS visual_mode text DEFAULT 'vibrant';
