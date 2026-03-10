# Character Creation System - Design Document

## Overview
Add RPG-style character creation and customization to Refactor Athletics, giving users a visual avatar that evolves with their fitness journey.

## Core Concept
Users build and customize a visual character that:
- Represents them in the app
- Unlocks gear/cosmetics through achievements and XP
- Reflects their training progress (muscle mass, body type)
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
  // Base attributes
  baseBody: 'male' | 'female';
  bodyType: 'lean' | 'athletic' | 'muscular'; // Affects SVG used
  skinTone: string; // Hex color or hue-rotate degree
  
  // Equipped gear (unlocked items)
  gear: {
    head?: string;      // 'warrior-helm', 'runner-headband', 'dragon-crown'
    torso?: string;     // 'gym-tank', 'samurai-armor', 'viking-tunic'
    legs?: string;      // 'shorts', 'gi-pants', 'warrior-greaves'
    accessory?: string; // 'belt', 'wristbands', 'cape'
    weapon?: string;    // 'sword', 'dumbbell', 'staff' (cosmetic)
  };
  
  // Progression-based attributes
  muscleMass?: number; // 0-100, could scale body SVG
  
  // Pose/animation state (future)
  pose?: 'idle' | 'flexing' | 'running' | 'lifting';
}
```

### Database Schema

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN character_config jsonb DEFAULT '{
  "baseBody": "male",
  "bodyType": "athletic",
  "skinTone": "#d4a574",
  "gear": {}
}'::jsonb;

-- New table for gear catalog
CREATE TABLE gear_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  slot text NOT NULL, -- 'head', 'torso', 'legs', 'accessory', 'weapon'
  image_path text NOT NULL,
  unlock_type text NOT NULL, -- 'xp', 'achievement', 'premium'
  unlock_requirement jsonb, -- { "xp": 5000 } or { "achievement": "run_100_miles" }
  theme text, -- 'athlete', 'warrior', 'samurai', 'dragon', 'viking'
  rarity text DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
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
      male-lean.svg
      male-athletic.svg
      male-muscular.svg
      female-lean.svg
      female-athletic.svg
      female-muscular.svg
    
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

**Unlock Types:**

1. **XP Purchase**
   - Common gear: 1,000 - 5,000 XP
   - Rare gear: 10,000 - 25,000 XP
   - Epic gear: 50,000+ XP

2. **Achievement-Based**
   - "First Workout" → Basic gym outfit
   - "100 Mile Club" → Runner's gear set
   - "Deadlift 2x Bodyweight" → Warrior helm
   - "30 Day Streak" → Legendary cape

3. **Theme-Locked**
   - Selecting "Samurai" theme unlocks basic samurai gear
   - Premium themes unlock exclusive gear sets

4. **Premium/Special**
   - Limited-time event gear
   - Seasonal cosmetics
   - Supporter/patron exclusive items

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
export function CharacterAvatar({ character, size = 'md' }: Props) {
  const dimensions = {
    sm: 64,
    md: 128,
    lg: 256,
  }[size];
  
  return (
    <div 
      className="relative" 
      style={{ width: dimensions, height: dimensions }}
    >
      {/* Layer 1: Base body SVG */}
      <img 
        src={`/characters/bodies/${character.baseBody}-${character.bodyType}.svg`}
        className="absolute inset-0 w-full h-full"
        style={{ 
          filter: `hue-rotate(${character.skinTone}deg)` 
        }}
        alt="Character body"
      />
      
      {/* Layer 2: Torso gear */}
      {character.gear.torso && (
        <img 
          src={`/characters/gear/torso/${character.gear.torso}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Torso gear"
        />
      )}
      
      {/* Layer 3: Legs gear */}
      {character.gear.legs && (
        <img 
          src={`/characters/gear/legs/${character.gear.legs}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Legs gear"
        />
      )}
      
      {/* Layer 4: Head gear (on top) */}
      {character.gear.head && (
        <img 
          src={`/characters/gear/head/${character.gear.head}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Head gear"
        />
      )}
      
      {/* Layer 5: Accessories (cape, belt, etc.) */}
      {character.gear.accessory && (
        <img 
          src={`/characters/gear/accessories/${character.gear.accessory}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Accessory"
        />
      )}
      
      {/* Layer 6: Weapon (optional, held in hand) */}
      {character.gear.weapon && (
        <img 
          src={`/characters/gear/weapons/${character.gear.weapon}.png`}
          className="absolute inset-0 w-full h-full"
          alt="Weapon"
        />
      )}
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
- 6 base body SVGs (male/female × lean/athletic/muscular)
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

## Success Metrics

- % of users who customize their character
- Average time spent in character editor
- Gear unlock rate (XP vs achievement)
- Character sharing frequency
- Correlation between character engagement and retention

## Notes

- Start with simple, clean art style (easier to produce at scale)
- Consider hiring a pixel artist or vector illustrator
- Could use AI generation for initial prototypes
- Theme gear should be visually distinct but cohesive
- Mobile-first: ensure editor works on small screens
