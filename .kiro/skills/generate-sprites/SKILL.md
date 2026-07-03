# Generate Exercise Sprites

Generate pixel-art enemy sprites for new ranked exercises in Refactor Athletics.

## Trigger
Use when the user says "generate sprites for [exercise]", "create enemy art for [exercise]", or "I need bestiary images for [exercise]".

## What It Does
1. Takes an exercise ID and creature names per theme (Samurai, Dragon, Viking, Dinosaur)
2. Generates 12 images (4 themes × 3 tiers) via Gemini Imagen API
3. Removes checkerboard/solid backgrounds automatically
4. Resizes to 64×64 PNG
5. Saves to `public/enemies/{theme}/{exercise_id}_t{0,1,2}.png`

## How to Run

```bash
GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d= -f2) npx tsx scripts/generate-exercise-sprites.ts <exercise_id> \
  --samurai "Creature Name" \
  --dragon "Creature Name" \
  --viking "Creature Name" \
  --dinosaur "Creature Name" \
  --desc "Brief description of the creature's concept/movement quality"
```

## Creature Naming Conventions

Each creature should:
- Represent the **movement quality** of the exercise (stability, flexibility, speed, suspension, etc.)
- Evolve across 3 tiers: small/cute → medium/menacing → boss/legendary
- Fit the theme's world (Japanese mythology for Samurai, fire/dragons for Draconic, Norse for Viking, prehistoric/jungle for Dinosaur)

### Theme Palettes
- **Samurai**: Indigo/deep purple + cherry-blossom pink accents
- **Dragon**: Deep red/crimson + gold accents
- **Viking**: Steel blue + ice white accents
- **Dinosaur**: Forest green + amber accents

### Existing Creature Names (for reference)
| Exercise | Samurai | Dragon | Viking | Dinosaur |
|----------|---------|--------|--------|----------|
| back_squat | Oni | Golem | Frost Troll | Mammoth |
| deadlift | Earth Yokai | Iron Wyrm | Draugr | T-Rex |
| bench_press | Armor | Fire Shield | War Shield | Triceratops |
| pull_up | Tengu | Sky Drake | Storm Raven | Pterodactyl |
| overhead_press | Thunder Oni | Thunder Dragon | Lightning Giant | Brachiosaurus |
| run_1_mile | Fox Spirit | Wind Serpent | Fenrir | Velociraptor |
| plank | Kappa | Lava Tortoise | Glacier | Ankylosaurus |
| push_ups | Ninjas | Fire Sprites | Berserkers | Compys |
| deep_squat_hold | Jade Tortoise | Magma Toad | Frost Crab | Anchor Turtle |
| cossack_squat | Mirror Kitsune | Split Wyrm | Ice Dancer | Split Raptor |
| l_sit_hold | Floating Monk | Ember Wraith | Hovering Draugr | Vine Phantom |
| dead_hang | Chain Spirit | Gravity Phantom | Anchor Wraith | Tar Pit |
| barbell_row | Kraken | Deep Wyrm | Sea Serpent | Mosasaurus |
| run_400m | Kunai | Lightning Drake | Valkyrie | Raptor |
| run_5k | Wind Kami | Storm Dragon | Odin's Hunt | Migration |

## Post-Processing Only

If sprites already exist but need background removal/resize:
```bash
npx tsx scripts/process-sprites.ts "public/enemies/**/{exercise_id}_t*.png"
```

## Adding Creatures to the Code

After generating sprites, update `ENEMY_NAMES_PL` in `src/components/v2/PowerLevelScreen.tsx`:
```typescript
samurai: { ..., exercise_id: 'Creature Name' },
dragon: { ..., exercise_id: 'Creature Name' },
viking: { ..., exercise_id: 'Creature Name' },
dinosaur: { ..., exercise_id: 'Creature Name' },
```
