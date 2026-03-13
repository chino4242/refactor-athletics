# Refactor Athletics — Story Map

> A fitness RPG where real-world progress drives in-game power. Users track workouts, macros, and habits while building a character, progressing through a narrative, and battling alongside friends.

## Vision

Refactor Athletics is a macro, workout, and habit tracker that is also part of a larger game. Users choose a class/path that determines their training focus and the exercises that contribute to their Power Level. They pick a theme that shapes their character's visual identity and the story setting. As users train in the real world, their character grows stronger in the game.

Users can party up with friends, experience a linear narrative together, and face weekly PvE encounters. Duels and challenges provide competitive outlets. The RPG layer is opt-in — users can use the app purely as a tracker if they prefer.

**Core Principle:** The good habits users track in the real world have benefits in the game. They can be the hero in their own story, and as their character gets stronger, so do they.

---

## Backbone (User Journey)

| # | Activity | Description |
|---|----------|-------------|
| 1 | Discover & Onboard | First experience, sign up, waiver |
| 2 | Build Character | Path/class, theme, avatar |
| 3 | Program Training | Default or custom workout programs |
| 4 | Track Daily | Log workouts, macros, habits |
| 5 | Grow Stronger | Level up, Power Level, stats, PRs |
| 6 | Join Party | Team up with friends |
| 7 | Experience Story | Narrative progression |
| 8 | Battle Together | Weekly PvE encounters |
| 9 | Compete | Duels, challenges, bragging rights |

---

## User Stories by Activity

### 1. Discover & Onboard
- View landing page / marketing site
- Sign up with email/password
- Display and sign waiver (track acceptance)
- Complete onboarding wizard
- See tutorial/intro to app mechanics

### 2. Build Character

**Path Selection:**
- Choose preset path (Hybrid, Strength, Endurance, Mobility)
- Create custom path (select which exercises contribute to Power Level)
- View exercises that contribute to Power Level for chosen path

**Path Details:**
| Path | Focus | RPG Archetype |
|------|-------|---------------|
| Hybrid | Strength, power, and endurance | Balanced (Paladin, etc.) |
| Strength | Heavy lifting, max effort | Tank / Fighter |
| Endurance | Cardio, conditioning | Ranger |
| Mobility | Flexibility, movement | Monk |

**Customization:**
- Select theme (visual/narrative style)
- Customize avatar appearance
- Name character

### 3. Program Training
- View default program for chosen path
- Edit default program
- Create custom workout program from scratch
- Add exercises and treadmill/cardio blocks
- Schedule program to calendar
- Copy week/month schedule

### 4. Track Daily

**Workout Logging:**
- Start active workout (timer, exercise list)
- Log exercise sets (weight, reps, time)
- Complete workout (calculate XP, rank, Power Level contribution)
- Log custom/untracked exercises
- Upload screenshot to auto-log workout
- Track personal records (PRs) per exercise

**Nutrition Tracking:**
- Log macros (protein, carbs, fat)
- Auto-calculate calories
- View daily macro targets
- Track water intake

**Habit Tracking:**
- Log daily habits (steps, sleep, etc.)
- Mark habits complete
- Hide/show specific habits
- Track streaks (no alcohol, no vice, etc.)
- View habit streaks

### 5. Grow Stronger

**Progression:**
- Earn XP from all activities
- Level up (Player Level)
- Increase Power Level from performance thresholds
- Grow character stats organically (STR/END/PWR/MOB based on exercise types and muscle groups targeted)
- View attribute balance radar
- View personal records dashboard
- Celebrate PR achievements

**Unlocks:**
- Unlock gear/cosmetics
- Unlock abilities (for story/combat)
- Unlock new exercises
- Unlock story chapters

### 6. Join Party
- Create a party
- Invite friends to party
- Accept party invitation
- View party members
- See party combined stats/progress
- Leave party
- Kick party member (if leader)

### 7. Experience Story
- View current story chapter
- Read narrative text
- Progress to next chapter
- View story history/log
- AI Game Master narration (Anthropic-powered)

### 8. Battle Together

**Weekly Encounters:**
- View available encounter
- Join encounter with party
- Combat mechanics (D&D-style rolls, character stats)
- Use abilities in combat
- Defeat enemies
- Earn rewards (bonus XP, special items)
- View encounter history/results

### 9. Compete
- Challenge friend to duel
- Accept/decline duel
- View duel results
- Join weekly challenge
- View leaderboards
- Earn bragging rights/badges

---

## Release Plan

### MVP — Core Experience
> Functional tracker with basic RPG elements and social foundation.

| Activity | Stories | Status |
|----------|---------|--------|
| **Discover & Onboard** | Sign up | ✅ Exists |
| | Onboarding wizard | ✅ Exists |
| | Display/sign waiver | 🆕 New |
| **Build Character** | Choose preset path (4 options) | 🆕 New |
| | Select theme | ✅ Exists |
| | View exercises for path | 🆕 New |
| | Basic avatar customization | 🔧 In Progress |
| **Program Training** | View default program | ✅ Exists |
| | Create custom program | ✅ Exists |
| | Schedule to calendar | ✅ Exists |
| **Track Daily** | Log workouts | ✅ Exists |
| | Log macros | ✅ Exists |
| | Log habits | ✅ Exists |
| | Track PRs | 🆕 New |
| | Track streaks (alcohol, vice) | 🆕 New |
| **Grow Stronger** | Earn XP | ✅ Exists |
| | Level up | ✅ Exists |
| | Power Level | ✅ Exists |
| | View PRs dashboard | 🆕 New |
| | Basic stat growth (STR/END/PWR/MOB) | 🆕 New |
| **Join Party** | Create party | 🆕 New |
| | Invite/accept invites | 🆕 New |
| | View party members | 🆕 New |
| **Experience Story** | View story chapter (text-based) | 🆕 New |
| | Progress to next chapter | 🆕 New |
| **Battle Together** | View weekly encounter | 🆕 New |
| | Basic combat (simple mechanics) | 🆕 New |
| | Earn rewards | 🆕 New |
| **Compete** | Duels | ✅ Exists |
| | Weekly challenges | ✅ Exists |

---

### V2 — Enhanced RPG
> Richer story, deeper social features, and more immersive progression.

| Activity | Stories |
|----------|---------|
| **Build Character** | Create custom path |
| | Advanced avatar customization |
| | Character naming |
| **Track Daily** | Active workout timer |
| | Screenshot auto-log improvements |
| **Grow Stronger** | Unlock abilities |
| | Unlock gear/cosmetics |
| | PR celebrations/animations |
| **Join Party** | Party chat/messaging |
| | Combined party stats |
| | Party achievements |
| **Experience Story** | AI Game Master (Anthropic) |
| | Richer narrative |
| | Story choices (light branching) |
| **Battle Together** | D&D-style combat mechanics |
| | Character abilities in combat |
| | Encounter history |
| **Compete** | Leaderboards |
| | Badges/achievements |
| | Party vs Party battles |

---

### Future — Full RPG Experience
> Deep immersion, community features, and long-term engagement.

| Activity | Stories |
|----------|---------|
| **Build Character** | Full D&D character sheet |
| | Skill trees |
| **Grow Stronger** | Equipment with stats |
| | Crafting system |
| **Experience Story** | Branching narratives |
| | Multiple story arcs |
| | Player choices affect outcomes |
| **Battle Together** | Boss battles |
| | Raid-style encounters |
| | Special events |
| **Compete** | Tournaments |
| | Seasonal rankings |
| | Guild wars |

---

## Path/Class System

### Preset Paths
Each path comes with:
- A default workout program
- A curated set of exercises that contribute to Power Level
- Path-specific thresholds/standards
- An RPG archetype that influences character appearance

| Path | Training Focus | Exercises | RPG Archetype |
|------|---------------|-----------|---------------|
| Hybrid | Strength + Power + Endurance | Mix of all categories | Balanced (Paladin) |
| Strength | Heavy lifting, max effort | Squat, Bench, Deadlift, OHP, etc. | Tank / Fighter |
| Endurance | Cardio, conditioning, capacity | Running, Rowing, Echo Bike, etc. | Ranger |
| Mobility | Flexibility, movement, bodyweight | Yoga, Stretching, Gymnastics, etc. | Monk |

### Custom Path
- User selects which exercises from the catalog contribute to their Power Level
- Uses preset standards/thresholds for those exercises
- No custom thresholds (too complex)
- Allows full flexibility for non-standard training styles

---

## Theme System

Themes affect visual style, character appearance, and narrative setting. They do **not** affect gameplay mechanics.

| Theme | Setting | Tier Names |
|-------|---------|------------|
| Athlete | Sports/Competition | Rookie → Varsity → All-Star → Pro → Hall of Fame |
| Draconic | Fantasy/Dragons | Hatchling → Whelp → Drake → Wyrm → Ancient Dragon |
| Samurai | Feudal Japan | Ronin → Samurai → Daimyo → Shogun → Legendary Warrior |
| Apex Predator | Prehistoric/Dinosaurs | Fossil → Compy → Raptor → Allosaurus → T-Rex |
| Viking | Norse Mythology | Thrall → Warrior → Berserker → Jarl → Einherjar |

---

## Progression Systems

### Power Level (Performance)
- Based on exercise performance against demographic thresholds
- Only exercises in the user's chosen path contribute
- Determines character appearance tier and in-game combat effectiveness
- Formula: Sum of (max_level × 100) per contributing exercise

### Player Level / Career XP (Consistency)
- Earned from all activities (workouts, macros, habits)
- Persistent — never spent, always growing
- Drives story progression and unlocks
- 1,000 XP per level

### Character Stats (Organic Growth)
- STR, END, PWR, MOB grow based on exercise types performed
- Emphasizes muscle groups targeted most frequently
- Feeds into D&D-style combat mechanics
- Displayed on attribute balance radar

### Streaks
- Track consecutive days of positive habits
- No alcohol streak
- No vice streak
- Custom streak tracking

### Personal Records
- Track best performance per exercise
- PR history over time
- Celebrate new PRs

---

*Last updated: March 13, 2026*
