-- Add sync token for webhook-based health data sync
-- Users generate a token in profile settings, then use it in Apple Shortcuts / Tasker / etc.

ALTER TABLE users ADD COLUMN IF NOT EXISTS sync_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_sync_token ON users(sync_token) WHERE sync_token IS NOT NULL;
