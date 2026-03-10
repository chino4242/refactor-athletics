"use client";

import { CharacterConfig, getPowerLevelTier } from '@/types/character';

interface CharacterAvatarProps {
  character: CharacterConfig;
  powerLevel: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export default function CharacterAvatar({ 
  character, 
  powerLevel, 
  size = 'md',
  animated = false 
}: CharacterAvatarProps) {
  const dimensions = {
    sm: 64,
    md: 128,
    lg: 256,
  }[size];
  
  // Calculate Power Level tier (overrides character.powerLevelTier)
  const tier = getPowerLevelTier(powerLevel);
  
  return (
    <div 
      className="relative"
      style={{ width: dimensions, height: dimensions }}
    >
      {/* Layer 1: Base body SVG (determined by Power Level tier) */}
      <img 
        src={`/characters/bodies/${character.baseBody}-tier${tier}.svg`}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ 
          filter: `hue-rotate(${character.skinTone})` 
        }}
        alt="Character body"
        onError={(e) => {
          // Fallback to placeholder if image doesn't exist
          e.currentTarget.src = '/characters/placeholder.svg';
        }}
      />
      
      {/* Layer 2: Aura/Effects (Tier 3+) */}
      {tier >= 3 && character.auraEnabled && (
        <img 
          src={`/characters/effects/aura-tier${tier}.png`}
          className={`absolute inset-0 w-full h-full object-contain ${animated ? 'animate-pulse' : ''}`}
          alt="Aura effect"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      
      {/* Layer 3: Torso gear */}
      {character.gear.torso && (
        <img 
          src={`/characters/gear/torso/${character.gear.torso}.png`}
          className="absolute inset-0 w-full h-full object-contain"
          alt="Torso gear"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      
      {/* Layer 4: Legs gear */}
      {character.gear.legs && (
        <img 
          src={`/characters/gear/legs/${character.gear.legs}.png`}
          className="absolute inset-0 w-full h-full object-contain"
          alt="Legs gear"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      
      {/* Layer 5: Head gear (on top) */}
      {character.gear.head && (
        <img 
          src={`/characters/gear/head/${character.gear.head}.png`}
          className="absolute inset-0 w-full h-full object-contain"
          alt="Head gear"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      
      {/* Layer 6: Accessories (cape, belt, etc.) */}
      {character.gear.accessory && (
        <img 
          src={`/characters/gear/accessories/${character.gear.accessory}.png`}
          className="absolute inset-0 w-full h-full object-contain"
          alt="Accessory"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      
      {/* Layer 7: Weapon (optional, held in hand) */}
      {character.gear.weapon && (
        <img 
          src={`/characters/gear/weapons/${character.gear.weapon}.png`}
          className="absolute inset-0 w-full h-full object-contain"
          alt="Weapon"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      
      {/* Layer 8: Particle effects (Tier 4+) */}
      {tier >= 4 && character.particleEffects && animated && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
          <div className="absolute bottom-0 left-1/4 w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-75" style={{ animationDelay: '75ms' }} />
        </div>
      )}
    </div>
  );
}
