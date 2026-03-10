-- Character Creation System - Database Schema
-- Phase 1: Foundation

-- Add character configuration to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS character_config jsonb DEFAULT '{
  "baseBody": "male",
  "powerLevelTier": 1,
  "skinTone": "#d4a574",
  "gear": {},
  "auraEnabled": false,
  "particleEffects": false
}'::jsonb;

-- Add career XP tracking (separate from power level)
ALTER TABLE users ADD COLUMN IF NOT EXISTS career_xp integer DEFAULT 0;

-- Gear catalog table
CREATE TABLE IF NOT EXISTS gear_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  slot text NOT NULL, -- 'head', 'torso', 'legs', 'accessory', 'weapon'
  image_path text NOT NULL,
  xp_cost integer NOT NULL,
  theme text, -- 'athlete', 'warrior', 'samurai', 'dragon', 'viking', null for universal
  rarity text DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  min_power_level integer DEFAULT 0,
  description text,
  created_at timestamp DEFAULT now()
);

-- User's unlocked gear
CREATE TABLE IF NOT EXISTS user_gear (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  gear_id text REFERENCES gear_catalog(id) ON DELETE CASCADE,
  unlocked_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id, gear_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gear_catalog_slot ON gear_catalog(slot);
CREATE INDEX IF NOT EXISTS idx_gear_catalog_theme ON gear_catalog(theme);
CREATE INDEX IF NOT EXISTS idx_gear_catalog_xp_cost ON gear_catalog(xp_cost);
CREATE INDEX IF NOT EXISTS idx_user_gear_user_id ON user_gear(user_id);

-- RLS Policies
ALTER TABLE gear_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gear ENABLE ROW LEVEL SECURITY;

-- Everyone can read gear catalog
CREATE POLICY "Gear catalog is viewable by everyone"
  ON gear_catalog FOR SELECT
  USING (true);

-- Users can view their own unlocked gear
CREATE POLICY "Users can view their own gear"
  ON user_gear FOR SELECT
  USING (auth.uid() = user_id);

-- Users can unlock gear (insert)
CREATE POLICY "Users can unlock gear"
  ON user_gear FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Seed some starter gear
INSERT INTO gear_catalog (id, name, slot, image_path, xp_cost, theme, rarity, description) VALUES
  -- Universal starter gear (free/low cost)
  ('gym-tank', 'Gym Tank', 'torso', '/characters/gear/torso/gym-tank.png', 0, null, 'common', 'Basic athletic tank top'),
  ('shorts', 'Athletic Shorts', 'legs', '/characters/gear/legs/shorts.png', 0, null, 'common', 'Comfortable workout shorts'),
  ('wristbands', 'Wristbands', 'accessory', '/characters/gear/accessories/wristbands.png', 1000, null, 'common', 'Classic athletic wristbands'),
  
  -- Athlete theme
  ('runner-headband', 'Runner Headband', 'head', '/characters/gear/head/runner-headband.png', 5000, 'athlete', 'common', 'Keeps sweat out of your eyes'),
  ('track-jersey', 'Track Jersey', 'torso', '/characters/gear/torso/track-jersey.png', 10000, 'athlete', 'rare', 'Professional athlete jersey'),
  
  -- Warrior theme
  ('warrior-helm', 'Warrior Helm', 'head', '/characters/gear/head/warrior-helm.png', 15000, 'warrior', 'rare', 'Battle-tested helmet'),
  ('warrior-armor', 'Warrior Armor', 'torso', '/characters/gear/torso/warrior-armor.png', 25000, 'warrior', 'epic', 'Heavy plate armor'),
  ('warrior-greaves', 'Warrior Greaves', 'legs', '/characters/gear/legs/warrior-greaves.png', 20000, 'warrior', 'rare', 'Reinforced leg armor'),
  ('sword', 'Warrior Sword', 'weapon', '/characters/gear/weapons/sword.png', 30000, 'warrior', 'epic', 'Legendary blade'),
  
  -- Samurai theme
  ('samurai-kabuto', 'Samurai Kabuto', 'head', '/characters/gear/head/samurai-kabuto.png', 15000, 'samurai', 'rare', 'Traditional samurai helmet'),
  ('samurai-armor', 'Samurai Armor', 'torso', '/characters/gear/torso/samurai-armor.png', 25000, 'samurai', 'epic', 'Ornate samurai armor'),
  ('gi-pants', 'Gi Pants', 'legs', '/characters/gear/legs/gi-pants.png', 8000, 'samurai', 'common', 'Traditional martial arts pants'),
  
  -- Dragon theme
  ('dragon-crown', 'Dragon Crown', 'head', '/characters/gear/head/dragon-crown.png', 75000, 'dragon', 'legendary', 'Crown of the dragon lord'),
  ('dragon-scales', 'Dragon Scale Armor', 'torso', '/characters/gear/torso/dragon-scales.png', 100000, 'dragon', 'legendary', 'Armor forged from dragon scales'),
  
  -- Viking theme
  ('viking-helm', 'Viking Helm', 'head', '/characters/gear/head/viking-helm.png', 15000, 'viking', 'rare', 'Horned viking helmet'),
  ('viking-tunic', 'Viking Tunic', 'torso', '/characters/gear/torso/viking-tunic.png', 20000, 'viking', 'rare', 'Fur-lined viking tunic')
ON CONFLICT (id) DO NOTHING;
