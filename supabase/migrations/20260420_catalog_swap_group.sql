-- Add swap_group column to catalog for exercise substitution
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS swap_group text;
CREATE INDEX IF NOT EXISTS idx_catalog_swap_group ON catalog(swap_group);
