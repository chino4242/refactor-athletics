// Character Creation System Types

export interface CharacterConfig {
  baseBody: 'male' | 'female';
  powerLevelTier: 1 | 2 | 3 | 4 | 5;
  skinTone: string; // Hex color
  gear: {
    head?: string;
    torso?: string;
    legs?: string;
    accessory?: string;
    weapon?: string;
  };
  auraEnabled: boolean;
  particleEffects: boolean;
  pose?: 'idle' | 'flexing' | 'running' | 'lifting';
}

export interface GearItem {
  id: string;
  name: string;
  slot: 'head' | 'torso' | 'legs' | 'accessory' | 'weapon';
  image_path: string;
  xp_cost: number;
  theme?: 'athlete' | 'warrior' | 'samurai' | 'dragon' | 'viking';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  min_power_level: number;
  description?: string;
  unlocked?: boolean; // Client-side flag
}

export interface UserGear {
  user_id: string;
  gear_id: string;
  unlocked_at: string;
}

// Helper function to calculate Power Level tier from raw Power Level
export function getPowerLevelTier(powerLevel: number): 1 | 2 | 3 | 4 | 5 {
  if (powerLevel === 0) return 1;
  if (powerLevel <= 1200) return 1;
  if (powerLevel <= 2400) return 2;
  if (powerLevel <= 3600) return 3;
  if (powerLevel <= 4800) return 4;
  return 5;
}

// Helper function to get tier name
export function getTierName(tier: number): string {
  const names = {
    1: 'Novice',
    2: 'Intermediate',
    3: 'Advanced',
    4: 'Elite',
    5: 'Legendary'
  };
  return names[tier as keyof typeof names] || 'Unknown';
}

// Helper function to get rarity color
export function getRarityColor(rarity: string): string {
  const colors = {
    common: 'text-zinc-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-orange-400'
  };
  return colors[rarity as keyof typeof colors] || 'text-zinc-400';
}

// Helper function to get rarity border color
export function getRarityBorderColor(rarity: string): string {
  const colors = {
    common: 'border-zinc-700',
    rare: 'border-blue-700',
    epic: 'border-purple-700',
    legendary: 'border-orange-700'
  };
  return colors[rarity as keyof typeof colors] || 'border-zinc-700';
}
