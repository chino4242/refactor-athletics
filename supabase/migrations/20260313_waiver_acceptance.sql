-- Add waiver acceptance tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS waiver_accepted_at TIMESTAMPTZ;

-- Add index for querying users who haven't accepted
CREATE INDEX IF NOT EXISTS idx_users_waiver_accepted ON users(waiver_accepted_at) WHERE waiver_accepted_at IS NULL;
