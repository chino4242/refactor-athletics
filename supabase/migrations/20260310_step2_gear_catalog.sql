-- Step 2: Create gear_catalog table
CREATE TABLE IF NOT EXISTS gear_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  slot text NOT NULL,
  image_path text NOT NULL,
  xp_cost integer NOT NULL,
  theme text,
  rarity text DEFAULT 'common',
  min_power_level integer DEFAULT 0,
  description text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gear_catalog_slot ON gear_catalog(slot);
CREATE INDEX IF NOT EXISTS idx_gear_catalog_theme ON gear_catalog(theme);
CREATE INDEX IF NOT EXISTS idx_gear_catalog_xp_cost ON gear_catalog(xp_cost);
