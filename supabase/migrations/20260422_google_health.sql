-- Google Health API (Fitbit) OAuth integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_health_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_health_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_health_token_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_health_connected_at TIMESTAMPTZ;
