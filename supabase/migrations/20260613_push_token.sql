-- Push notification token storage
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_platform TEXT; -- 'ios' or 'android'
