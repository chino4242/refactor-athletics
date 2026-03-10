# Character Creation System - Design Document

## Overview
Add RPG-style character creation and customization to Refactor Athletics, giving users a visual avatar that evolves with their fitness journey.

## Core Concept

### Dual Progression System

**Power Level (Performance-Based) → Visual "Cool Factor"**
- Represents actual fitness achievement and strength
- Calculated from max level achieved per exercise × 100
- Maximum possible: 6,000 (60 exercises × Level 5 × 100)
- **Dictates character's base appearance, physique, and visual effects**

**Power Level Tiers:**
- **Tier 1 (0-1,200)**: Novice
  - Basic character model, simple stance
  - Minimal visual effects
  - Standard proportions
  
- **Tier 2 (1,201-2,400)**: Intermediate
  - Enhanced physique, better posture
  - Subtle glow effects on equipped gear
  - Slightly more muscular build
  
- **Tier 3 (2,401-3,600)**: Advanced
  - Noticeably muscular build
  - Confident, powerful stance
  - Glowing accents and aura hints
  - Gear has enhanced visual effects
  
- **Tier 4 (3,601-4,800)**: Elite
  - Heroic proportions
  - Dynamic idle animations (breathing, flexing)
  - Particle effects around character
  - Gear glows and pulses
  
- **Tier 5 (4,801-6,000)**: Legendary
  - Maximum visual impact
  - Full aura effects (theme-colored)
  - Epic idle animations
  - Gear has legendary particle trails
  - Screen effects when viewing character

**Career XP (Consistency-Based) → Customization Currency**
- Earned from all activities: workouts, habits, nutrition, streaks
- Accumulates forever (never resets)
- **Used to unlock and purchase cosmetic gear**

**XP Sources:**
- Logging workouts (even if performance doesn't improve)
- Tracking macros daily
- Hitting habit targets (steps, water, sleep)
- Maintaining streaks
- Completing challenges and duels
- Daily login bonuses

**The Philosophy:**
- **Power Level** = "How strong are you?" (outcome-based, harder to increase)
- **Career XP** = "How dedicated are you?" (process-based, always progressing)

**Example Scenarios:**
- **Beginner (PL: 400, XP: 50,000)**: Unlocked lots of cool gear through consistency, but character looks novice-tier because performance is still developing
- **Veteran (PL: 4,200, XP: 200,000)**: Elite-tier character with heroic proportions AND extensive gear collection
- **Talented Newcomer (PL: 2,800, XP: 15,000)**: Advanced-tier character from strong performance, but limited gear options due to low consistency
- **Grinder (PL: 1,800, XP: 150,000)**: Intermediate-tier character but owns nearly every cosmetic item from years of logging

Users build and customize a visual character that:
- Represents them in the app
- Base appearance reflects Power Level (performance)
- Customization options reflect Career XP (dedication)
- Displays on dashboard, profile, and in duels

## Technical Approach: SVG Base + PNG Overlays

### Why This Approach?
- **Lightweight**: SVGs are small, PNGs only load what's equipped
- **Scalable**: Works at any size (dashboard thumbnail to full editor)
- **Easy to create**: Can commission or create assets without 3D modeling
- **Performance**: Fast rendering, no heavy libraries needed
- **Customizable**: Easy color shifts with CSS filters

### Character Data Structure

```typescript
interface Character {
  // Base attributes (determined by Power Level tier)
  baseBody: 'male' | 'female';
  powerLevelTier: 1 | 2 | 3 | 4 | 5; // Auto-calculated from Power Level
  skinTone: string; // Hex color or hue-rotate degree
  
  // Equipped gear (purchased with Career XP)
  gear: {
    head?: string;      // 'warrior-helm', 'runner-headband', 'dragon-crown'
    torso?: string;     // 'gym-tank', 'samurai-armor', 'viking-tunic'
    legs?: string;      // 'shorts', 'gi-pants', 'warrior-greaves'
    accessory?: string; // 'belt', 'wristbands', 'cape'
    weapon?: string;    // 'sword', 'dumbbell', 'staff' (cosmetic)
  };
  
  // Visual effects (determined by Power Level tier)
  auraEnabled: boolean;
  particleEffects: boolean;
  
  // Pose/animation state (unlocked by tier)
  pose?: 'idle' | 'flexing' | 'running' | 'lifting';
}
```

### Database Schema

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN character_config jsonb DEFAULT '{
  "baseBody": "male",
  "powerLevelTier": 1,
  "skinTone": "#d4a574",
  "gear": {},
  "auraEnabled": false,
  "particleEffects": false
}'::jsonb;

ALTER TABLE users ADD COLUMN career_xp integer DEFAULT 0;

-- New table for gear catalog
CREATE TABLE gear_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  slot text NOT NULL, -- 'head', 'torso', 'legs', 'accessory', 'weapon'
  image_path text NOT NULL,
  xp_cost integer NOT NULL, -- Career XP required to unlock
  theme text, -- 'athlete', 'warrior', 'samurai', 'dragon', 'viking'
  rarity text DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  min_power_level integer DEFAULT 0, -- Some gear requires minimum Power Level
  created_at timestamp DEFAULT now()
);

-- Track user's unlocked gear
CREATE TABLE user_gear (
  user_id uuid REFERENCES users(id),
  gear_id text REFERENCES gear_catalog(id),
  unlocked_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id, gear_id)
);
```

### Asset Structure

```
public/
  characters/
    bodies/
      # 5 tiers × 2 genders = 10 base body SVGs
      male-tier1.svg    # Novice - basic proportions
      male-tier2.svg    # Intermediate - slightly enhanced
      male-tier3.svg    # Advanced - muscular
      male-tier4.svg    # Elite - heroic proportions
      male-tier5.svg    # Legendary - maximum impact
      female-tier1.svg
      female-tier2.svg
      female-tier3.svg
      female-tier4.svg
      female-tier5.svg
    
    effects/
      # Visual effects overlays for higher tiers
      aura-tier3.png    # Subtle glow
      aura-tier4.png    # Particle effects
      aura-tier5.png    # Epic aura with particles
    
    gear/
      head/
        warrior-helm.png
        runner-headband.png
        dragon-crown.png
        samurai-kabuto.png
        viking-helm.png
      
      torso/
        gym-tank.png
        samurai-armor.png
        viking-tunic.png
        dragon-scales.png
      
      legs/
        shorts.png
        gi-pants.png
        warrior-greaves.png
      
      accessories/
        belt.png
        wristbands.png
        cape.png
      
      weapons/
        sword.png
        dumbbell.png
        staff.png
```

### Component Architecture

```typescript
// components/character/CharacterAvatar.tsx
// Renders the character at any size (dashboard, profile, duels)
export function CharacterAvatar({ 
  character: Character, 
  size: 'sm' | 'md' | 'lg' = 'md',
  animated?: boolean 
}) {
  // Layers: body SVG + gear PNGs
}

// components/character/CharacterEditor.tsx
// Full character customization interface
export function CharacterEditor({ 
  userId: string,
  character: Character,
  unlockedGear: string[],
  onSave: (character: Character) => void
}) {
  // Tabs: Body, Gear, Preview
  // Shows locked/unlocked gear
  // Real-time preview
}

// components/character/GearShop.tsx
// Browse and unlock gear with XP or achievements
export function GearShop({ 
  userId: string,
  userXp: number,
  achievements: string[]
}) {
  // Grid of gear cards
  // Shows unlock requirements
  // Purchase/unlock flow
}
```

### Gear Unlock System

**Career XP Pricing:**

1. **Common Gear (1,000 - 5,000 XP)**
   - Basic gym outfits
   - Simple accessories
   - Starter weapons
   - Available to all players

2. **Rare Gear (10,000 - 25,000 XP)**
   - Theme-specific outfits
   - Enhanced accessories
   - Unique weapons
   - Requires some dedication

3. **Epic Gear (50,000 - 100,000 XP)**
   - Legendary armor sets
   - Glowing accessories
   - Prestigious weapons
   - For committed players

4. **Legendary Gear (150,000+ XP)**
   - Ultimate cosmetics
   - Full armor sets with effects
   - Mythical weapons
   - Status symbols

**Power Level Gates:**
Some gear requires minimum Power Level to unlock:
- Basic gear: No requirement
- Intermediate gear: 1,200+ Power Level
- Advanced gear: 2,400+ Power Level
- Elite gear: 3,600+ Power Level
- Legendary gear: 4,800+ Power Level

**Example:**
- "Dragon Crown" costs 75,000 Career XP AND requires 3,600 Power Level
- This ensures only players who both grind (XP) and perform (Power Level) can access top-tier cosmetics

**Theme Integration:**
- Selecting a theme unlocks 1-2 basic gear items for that theme (free)
- Additional theme gear must be purchased with Career XP
- Encourages players to commit to a theme aesthetic

### UI Flow

**Dashboard Integration:**
```
┌─────────────────────────────┐
│  [Small Character Avatar]   │  ← 64x64px, shows equipped gear
│  Power Level: 1,247         │
│  Level 12 Warrior           │
└─────────────────────────────┘
```

**Profile Page:**
```
┌─────────────────────────────────────┐
│  [Large Character Preview]          │  ← 256x256px, animated
│                                     │
│  [Edit Character] [Gear Shop]       │
└─────────────────────────────────────┘
```

**Character Editor:**
```
┌──────────────────────────────────────┐
│  ┌─────────────┐  ┌────────────────┐ │
│  │  Preview    │  │  Customization │ │
│  │             │  │                │ │
│  │     🧍      │  │  Body Type:    │ │
│  │             │  │  ○ Lean        │ │
│  │             │  │  ● Athletic    │ │
│  │             │  │  ○ Muscular    │ │
│  │             │  │                │ │
│  │             │  │  Skin Tone:    │ │
│  │             │  │  [Color Picker]│ │
│  └─────────────┘  └────────────────┘ │
│                                      │
│  Gear Slots:                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │ Head │ │Torso │ │ Legs │ │Access││
│  │  👑  │ │  👕  │ │  👖  │ │  ⌚  ││
│  │ Equip│ │ Equip│ │ Equip│ │🔒Lock││
│  └──────┘ └──────┘ └──────┘ └──────┘│
│                                      │
│  [Save Character]                    │
└──────────────────────────────────────┘
```

**Gear Shop:**
```
┌──────────────────────────────────────┐
│  Gear Shop                           │
│  Your XP: 12,450                     │
│                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ 🎩     │ │ 👕     │ │ 🔒     │   │
│  │Warrior │ │Samurai │ │Dragon  │   │
│  │ Helm   │ │ Armor  │ │ Crown  │   │
│  │        │ │        │ │        │   │
│  │5,000 XP│ │✓ Owned │ │50k XP  │   │
│  │[Unlock]│ │[Equip] │ │[Locked]│   │
│  └────────┘ └────────┘ └────────┘   │
└──────────────────────────────────────┘
```

### Rendering Logic

```typescript
// CharacterAvatar.tsx
export function CharacterAvatar({ 
  character, 
  powerLevel, 
  size = 'md' 
}: Props) {
  const dimensions = {
    sm: 64,
    md: 128,
    lg: 256,
  }[size];
  
  // Calculate Power Level tier
  const tier = powerLevel === 0 ? 1 :
    powerLevel <= 1200 ? 1 :
    powerLevel <= 2400 ? 2 :
    powerLevel <= 3600 ? 3 :
    powerLevel <= 4800 ? 4 : 5;
  
  return (
    <div 
      className="relative" 
      style={{ width: dimensions, height: dimensions }}
    >
      {/* Layer 1: Base body SVG (determined by Power Level tier) */}
      <img 
        src={`/characters/bodies/${character.baseBody}-tier${tier}.svg`}
        className="absolute inset-0 w-full h-full"
        style={{ 
          filter: `hue-rotate(${character.skinTone}deg)` 
        }}
        alt="Character body"
      />
      
      {/* Layer 2: Aura/Effects (Tier 3+) */}
      {tier >= 3 && (
        <img 
          src={`/characters/effects/aura-tier${tier}.png`}
          className="absolute inset-0 w-full h-full animate-pulse"
          alt="Aura effect"
        />
      )}
      
      {/* Layer 3: Torso gear */}
      {character.gear.torso && (
        <img 
          src={`/characters/gear/torso/${character.gear.torso}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Torso gear"
        />
      )}
      
      {/* Layer 4: Legs gear */}
      {character.gear.legs && (
        <img 
          src={`/characters/gear/legs/${character.gear.legs}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Legs gear"
        />
      )}
      
      {/* Layer 5: Head gear (on top) */}
      {character.gear.head && (
        <img 
          src={`/characters/gear/head/${character.gear.head}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Head gear"
        />
      )}
      
      {/* Layer 6: Accessories (cape, belt, etc.) */}
      {character.gear.accessory && (
        <img 
          src={`/characters/gear/accessories/${character.gear.accessory}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Accessory"
        />
      )}
      
      {/* Layer 7: Weapon (optional, held in hand) */}
      {character.gear.weapon && (
        <img 
          src={`/characters/gear/weapons/${character.gear.weapon}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Weapon"
        />
      )}
      
      {/* Layer 8: Particle effects (Tier 4+) */}
      {tier >= 4 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
          <div className="absolute bottom-0 left-1/4 w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-75" />
        </div>
      )}
    </div>
  );
    </div>
  );
}
```

### API Endpoints

```typescript
// GET /api/character/gear
// Returns all gear in catalog with unlock status for user
export async function GET(request: Request) {
  const userId = await getUserId(request);
  const allGear = await supabase.from('gear_catalog').select('*');
  const unlockedGear = await supabase
    .from('user_gear')
    .select('gear_id')
    .eq('user_id', userId);
  
  return allGear.map(gear => ({
    ...gear,
    unlocked: unlockedGear.some(ug => ug.gear_id === gear.id),
  }));
}

// POST /api/character/unlock
// Unlock gear with XP or achievement
export async function POST(request: Request) {
  const { gearId } = await request.json();
  const userId = await getUserId(request);
  
  // Check if user meets requirements
  // Deduct XP if needed
  // Insert into user_gear
  // Return updated character
}

// PUT /api/character/equip
// Equip/unequip gear
export async function PUT(request: Request) {
  const { gear } = await request.json();
  const userId = await getUserId(request);
  
  // Update users.character_config
  // Return updated character
}
```

### Progression Integration

**Body Type Changes:**
- Track total weight lifted over time
- After X lbs lifted, suggest upgrading to "muscular" body type
- Visual feedback: "Your training is paying off! Upgrade to Muscular build?"

**Theme-Specific Gear:**
- Selecting "Samurai" theme unlocks basic samurai outfit
- Completing samurai-themed challenges unlocks legendary samurai gear

**Duel Integration:**
- Show both characters facing off in duel UI
- Winner's character does victory pose
- Loser's character shows defeat animation

### Future Enhancements

1. **Animations**
   - Idle breathing animation
   - Victory/defeat poses
   - Workout-specific animations (lifting, running)

2. **Backgrounds**
   - Unlock training environments (gym, dojo, mountain)
   - Display behind character in profile

3. **Pets/Companions**
   - Unlock animal companions (dragon, wolf, eagle)
   - Follows character around

4. **Emotes**
   - Character reactions (flex, thumbs up, fist pump)
   - Use in duels or social features

5. **Character Sharing**
   - Export character as image
   - Share on social media
   - QR code to profile

6. **AR Integration**
   - View character in real world via phone camera
   - Take photos with your character

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Database schema (character_config, gear_catalog, user_gear)
- [ ] Basic CharacterAvatar component
- [ ] 3 body types × 2 genders = 6 base SVGs
- [ ] 10 starter gear items (2 per slot)
- [ ] Display character on dashboard

### Phase 2: Editor (Week 2)
- [ ] CharacterEditor component
- [ ] Body type selector
- [ ] Skin tone picker
- [ ] Gear equip/unequip
- [ ] Save character to profile

### Phase 3: Gear System (Week 3)
- [ ] GearShop component
- [ ] XP-based unlocks
- [ ] Achievement-based unlocks
- [ ] 30+ gear items across all themes
- [ ] Unlock notifications

### Phase 4: Polish (Week 4)
- [ ] Animations (idle, victory, defeat)
- [ ] Duel integration
- [ ] Character sharing/export
- [ ] Mobile optimization
- [ ] Performance optimization

## Asset Requirements

**To Commission/Create:**
- 10 base body SVGs (male/female × 5 Power Level tiers)
- 3 aura/effect overlays (tiers 3, 4, 5)
- 50+ gear PNG overlays:
  - 10 head items
  - 15 torso items
  - 10 legs items
  - 10 accessories
  - 5 weapons

**Design Guidelines:**
- Consistent art style across all assets
- Transparent backgrounds (PNG)
- Aligned to same anchor points
- 512x512px base resolution
- Optimized file sizes (<50kb per item)
- Progressive visual enhancement across tiers (subtle → epic)

## Success Metrics

- % of users who customize their character
- Average time spent in character editor
- Gear purchase rate (Career XP spending)
- Character sharing frequency
- Correlation between Power Level tier and engagement
- Correlation between Career XP and retention

## Key Takeaways

**The Dual Progression Philosophy:**

1. **Power Level = Visual Prestige**
   - Your character's base appearance reflects your actual fitness achievements
   - Can't "buy" your way to looking powerful - must earn it through performance
   - Creates aspirational goals: "I want my character to reach Tier 4"

2. **Career XP = Customization Freedom**
   - Rewards consistency and dedication, not just performance
   - Beginners can still unlock cool gear by showing up daily
   - Creates engagement loop: "Just 5,000 more XP until I can buy that helmet"

3. **Combined System = Depth**
   - Elite players (high PL + high XP) have the most impressive characters
   - Prevents pay-to-win: can't buy Power Level, only cosmetics
   - Encourages both performance improvement AND daily engagement
   - Visual progression is earned, not purchased

**Example Player Journeys:**

- **The Grinder**: Logs everything daily for a year → 150k Career XP, 1,800 PL
  - Owns tons of gear but character looks Tier 2 (intermediate)
  - Motivated to improve performance to unlock higher tier appearance

- **The Athlete**: Strong performer, inconsistent logger → 15k Career XP, 3,200 PL
  - Character looks Tier 3 (advanced) but limited gear options
  - Motivated to log more consistently to unlock cosmetics

- **The Legend**: Years of dedication + elite performance → 250k Career XP, 5,200 PL
  - Tier 5 character with full legendary gear collection
  - Ultimate visual status symbol in the app

## Notes

- Start with simple, clean art style (easier to produce at scale)
- Consider hiring a pixel artist or vector illustrator
- Could use AI generation for initial prototypes
- Theme gear should be visually distinct but cohesive
- Mobile-first: ensure editor works on small screens
- Power Level tier transitions should feel rewarding (celebration animation)
- Consider "prestige" system at 6,000 PL for infinite progression
