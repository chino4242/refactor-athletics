# Epic 16: Fuel Screen — Dedicated Nutrition Tab

**Status:** planned
**Priority:** High — daily use, currently misplaced on Train
**Created:** 2026-06-20

---

## Vision

Fuel gets its own tab. It's a daily ritual that happens at meals — completely separate from the training mindset. The screen owns: logging food, viewing today's meals, net calories, macro progress, weekly consistency, and favorites for quick re-logging.

**Navigation:** POWER / ARENA / FUEL / TRAIN (4 tabs)

---

## What Moves

**FROM Train screen → TO Fuel screen:**
- NutritionInputV2 (text input + camera + AI parsing)
- Quick-log favorites
- Daily progress dots (weekly consistency)
- Meal tag selector

**FROM Power Level screen → stays but simplified:**
- NutritionBar stays on PL as a compact read-only summary (NET, macros)
- Tapping NutritionBar on PL navigates to Fuel tab (instead of opening a sheet)

---

## Fuel Screen Layout

```
┌─────────────────────────────────┐
│ FUEL                            │
│                                 │
│ P 70g  C 61g  F 12g            │
│ IN 1,450  BURNED 2,041  NET -591│
│ ████████████░░░░░░░░░ protein   │
│ ████████░░░░░░░░░░░░░ carbs     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Chicken breast, rice...     │ │  ← large textarea input
│ │                             │ │
│ └─────────────────────────────┘ │
│ [🌅 Breakfast] [☀️ Lunch] ...   │  ← meal tags
│                                 │
│ FAVORITES                       │
│ [Chicken + rice] [Protein shake]│  ← tappable chips
│                                 │
│ TODAY'S MEALS                   │
│ 🌅 Oatmeal + berries    380cal │
│ ☀️ Chicken bowl          620cal │
│ 🍎 Protein bar           210cal │
│                                 │
│ M T W T F S S                   │  ← weekly dots
│ ● ● ● ○ ○ ○ ○                  │
└─────────────────────────────────┘
```

---

## Stories

### 16-1: Create Fuel Tab + Move Nutrition Components

**As a** user,
**I want** nutrition tracking on its own dedicated tab,
**So that** I can log food without navigating to the Train screen.

**Acceptance Criteria:**
- Add 4th tab to bottom nav: POWER / ARENA / FUEL / TRAIN
- Tab icon: 🍽️ or flame icon
- Move NutritionInputV2 from TrainScreen to new FuelScreen
- Move quick-log favorites to FuelScreen
- Remove nutrition section from TrainScreen
- NutritionBar on PowerLevelScreen becomes tappable → navigates to /fuel tab

### 16-2: Macro Progress Bars

**As a** user tracking macros,
**I want** to see visual progress toward my daily targets,
**So that** I know if I'm on track without doing math.

**Acceptance Criteria:**
- Show progress bars for protein, carbs, fat (with targets from user profile)
- Color fills as you approach target (green when hit)
- Shows current/target: "70g / 170g protein"
- Compact — doesn't dominate the screen

### 16-3: Today's Meal Log (Inline)

**As a** user,
**I want** to see everything I've logged today on the Fuel screen,
**So that** I have a complete picture without tapping into a sheet.

**Acceptance Criteria:**
- List of today's meals grouped by meal tag
- Each entry shows: food name/label + calories
- Swipe-to-delete (from Epic 10 work, already built)
- Shows below the input area

### 16-4: Enhanced Favorites

**As a** user who eats similar things regularly,
**I want** favorites to be prominent and easy to re-log,
**So that** daily tracking takes seconds.

**Acceptance Criteria:**
- "FAVORITES" section with tappable chips (already built — moves here)
- Long-press a favorite to remove it
- "Add to favorites" option after confirming a meal
- Favorites sorted by frequency (most used first)

### 16-5: Weekly Consistency View

**As a** user,
**I want** to see my weekly nutrition consistency at a glance,
**So that** I'm motivated to track every day.

**Acceptance Criteria:**
- M T W T F S S dots (already built — moves here)
- Filled = tracked 3+ meals that day
- Current week visible
- Ties into the bounty "Track meals 4/7 days"

---

## Technical Notes

- New route: `/fuel` or use existing tab routing system
- New component: `src/components/v2/FuelScreen.tsx`
- Bottom nav: update the tab bar component to include 4 tabs
- NutritionBar on PL: change from sheet-open to navigation (`router.push` or tab switch)
- TrainScreen: remove the NutritionInputV2 section entirely

---

## Lore Connection (Light)

The Fuel screen can have a subtle theme line if needed:
- Samurai: "A blade's edge depends on the steel it's forged from."
- Draconic: "Fire needs fuel. So do you."
- Viking: "A warrior's feast determines tomorrow's battle."
- Athlete: (none — clean)

But keep it minimal. Fuel is functional first.

---

## Open Questions

1. Should the tab order be POWER / FUEL / ARENA / TRAIN or POWER / ARENA / FUEL / TRAIN?
2. Should the NutritionBar on Power Level screen remain, or remove it entirely now that Fuel has its own tab?
3. Should there be a net calories target line (e.g., "Target: -500 deficit") configurable in profile?
