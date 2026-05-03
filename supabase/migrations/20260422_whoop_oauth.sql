-- WHOOP OAuth integration columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS whoop_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whoop_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whoop_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whoop_token_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whoop_connected_at TIMESTAMPTZ;
