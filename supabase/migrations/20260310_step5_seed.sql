-- Step 5: Seed gear data
INSERT INTO gear_catalog (id, name, slot, image_path, xp_cost, theme, rarity, description) VALUES
  ('gym-tank', 'Gym Tank', 'torso', '/characters/gear/torso/gym-tank.png', 0, null, 'common', 'Basic athletic tank top'),
  ('shorts', 'Athletic Shorts', 'legs', '/characters/gear/legs/shorts.png', 0, null, 'common', 'Comfortable workout shorts'),
  ('wristbands', 'Wristbands', 'accessory', '/characters/gear/accessories/wristbands.png', 1000, null, 'common', 'Classic athletic wristbands'),
  ('runner-headband', 'Runner Headband', 'head', '/characters/gear/head/runner-headband.png', 5000, 'athlete', 'common', 'Keeps sweat out of your eyes'),
  ('track-jersey', 'Track Jersey', 'torso', '/characters/gear/torso/track-jersey.png', 10000, 'athlete', 'rare', 'Professional athlete jersey'),
  ('warrior-helm', 'Warrior Helm', 'head', '/characters/gear/head/warrior-helm.png', 15000, 'warrior', 'rare', 'Battle-tested helmet'),
  ('warrior-armor', 'Warrior Armor', 'torso', '/characters/gear/torso/warrior-armor.png', 25000, 'warrior', 'epic', 'Heavy plate armor'),
  ('warrior-greaves', 'Warrior Greaves', 'legs', '/characters/gear/legs/warrior-greaves.png', 20000, 'warrior', 'rare', 'Reinforced leg armor'),
  ('sword', 'Warrior Sword', 'weapon', '/characters/gear/weapons/sword.png', 30000, 'warrior', 'epic', 'Legendary blade'),
  ('samurai-kabuto', 'Samurai Kabuto', 'head', '/characters/gear/head/samurai-kabuto.png', 15000, 'samurai', 'rare', 'Traditional samurai helmet'),
  ('samurai-armor', 'Samurai Armor', 'torso', '/characters/gear/torso/samurai-armor.png', 25000, 'samurai', 'epic', 'Ornate samurai armor'),
  ('gi-pants', 'Gi Pants', 'legs', '/characters/gear/legs/gi-pants.png', 8000, 'samurai', 'common', 'Traditional martial arts pants'),
  ('dragon-crown', 'Dragon Crown', 'head', '/characters/gear/head/dragon-crown.png', 75000, 'dragon', 'legendary', 'Crown of the dragon lord'),
  ('dragon-scales', 'Dragon Scale Armor', 'torso', '/characters/gear/torso/dragon-scales.png', 100000, 'dragon', 'legendary', 'Armor forged from dragon scales'),
  ('viking-helm', 'Viking Helm', 'head', '/characters/gear/head/viking-helm.png', 15000, 'viking', 'rare', 'Horned viking helmet'),
  ('viking-tunic', 'Viking Tunic', 'torso', '/characters/gear/torso/viking-tunic.png', 20000, 'viking', 'rare', 'Fur-lined viking tunic')
ON CONFLICT (id) DO NOTHING;
