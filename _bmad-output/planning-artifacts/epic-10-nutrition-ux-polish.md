# Epic 10: Nutrition UX Polish — Frictionless Tracking + Edit/Delete

**Status:** planned
**Priority:** High — daily use feature, ties into body composition and net calories
**Created:** 2026-06-19

---

## Vision

Nutrition tracking should feel effortless. AI handles the estimation, but the user needs to be able to correct mistakes, remove accidental entries, and adjust portions without starting over. The input should be prominent and inviting — not a tiny field you have to squint at.

This ties directly into:
- **Net calories on Power Level screen** (NutritionBar — already shows IN vs BURNED)
- **Body Recomp Streak** (Epic 8 — tracks weekly body comp trend)
- **Bounty "Track meals 4/7 days"** (consistency bounty)

---

## Current State

- Text field on Train screen: "What did you eat?"
- AI parses text → returns food items with estimated macros
- User confirms → logged to `nutrition_logs`
- Photo option: camera → AI estimates → same flow
- Meal tags: Breakfast / Lunch / Dinner / Snack
- Daily progress dots (weekly view)
- XP pop on confirm

**Pain points (from user):**
- Input field is too small
- Can't edit quantities after AI suggests
- Can't delete individual food items from a meal
- Can't adjust macros if AI got it wrong
- No way to see or modify what was already logged today

---

## Stories

### 10-1: Larger, More Inviting Input

**As a** user,
**I want** the nutrition input to be prominent and easy to use,
**So that** I'm encouraged to log meals without friction.

**Acceptance Criteria:**
- Input field is larger (min height 48px, full-width, multiline-capable)
- Placeholder text is friendly: "Chicken breast, rice, and broccoli..." or "What did you eat?"
- Auto-expands as user types (multiline for complex meals)
- Camera button is clearly visible alongside the text input
- Meal tag selector (Breakfast/Lunch/Dinner/Snack) shown before/during input, not after

---

### 10-2: Edit AI Suggestions Before Confirming

**As a** user reviewing AI-estimated macros,
**I want** to adjust quantities and macros before confirming,
**So that** I can correct obvious mistakes without re-typing.

**Acceptance Criteria:**
- After AI returns food items, each item is shown as an editable card:
  - Food name (editable — e.g., change "chicken" to "chicken thigh")
  - Serving size / quantity (editable — e.g., "200g" → "150g", recalculates macros proportionally)
  - Protein / Carbs / Fat / Calories (individually editable for override)
- Swipe-to-remove individual items from the suggestion list
- "Add another item" button to manually add a food not caught by AI
- Confirm logs ALL items in the list as one meal entry

---

### 10-3: View & Edit Today's Logged Meals

**As a** user who already logged meals today,
**I want** to see what I've logged and make corrections,
**So that** my daily totals stay accurate.

**Acceptance Criteria:**
- Tapping the NutritionBar (or a "view meals" link on Train screen) opens a daily log view
- Shows all logged meals grouped by meal tag (Breakfast, Lunch, Dinner, Snack)
- Each food item shows: name, protein, carbs, fat, calories
- Tap a food item → edit modal (same as 10-2 edit card)
- Swipe-to-delete individual food items
- Delete removes from `nutrition_logs` and recalculates daily totals
- Daily totals update in real-time as edits/deletes happen

---

### 10-4: Delete Individual Food Items

**As a** user who accidentally logged the wrong food,
**I want** to delete it,
**So that** my macros aren't inflated by mistakes.

**Acceptance Criteria:**
- Swipe left on any food item → red "Delete" button
- Tap Delete → item removed from `nutrition_logs`
- NutritionBar updates immediately (protein, carbs, fat, calories adjust)
- XP is NOT clawed back (too complex, acceptable loss — same as workout undo)
- Confirmation not required for single-item delete (swipe is intentional enough)

---

### 10-5: Quick-Log Favorites / Recent Meals

**As a** user who eats similar things regularly,
**I want** to quickly re-log a recent meal,
**So that** I don't have to type the same thing every day.

**Acceptance Criteria:**
- Below the input field, show 3-5 recent/frequent meals as tappable chips
- Tapping a chip pre-fills the suggestion list with that meal's items
- User can confirm immediately or adjust
- Recent meals sourced from last 14 days of `nutrition_logs` grouped by meal tag + time proximity
- Most frequent items bubble to the top

---

### 10-6: Net Calories Integration

**As a** user tracking both nutrition and activity,
**I want** to see my net calories clearly,
**So that** I know if I'm in a deficit or surplus for the day.

**Acceptance Criteria:**
- NutritionBar shows: `IN: 1,850 | BURNED: 2,200 | NET: -350`
- Color coding: surplus = amber, deficit = green (for fat loss goal), neutral = white
- If user has a calorie target set (from onboarding macros), show progress toward it
- Tapping NET opens the daily log (story 10-3)

*Note: NutritionBar already shows this data. This story is about making it clearer and more actionable with color coding and tap-to-detail.*

---

## Technical Context

### Files involved:
- `src/components/v2/NutritionInputV2.tsx` — the input component
- `src/app/api/food-parse/route.ts` — AI macro estimation
- `src/components/v2/TrainScreen.tsx` — where input lives
- `src/components/v2/PowerLevelScreen.tsx` — NutritionBar

### Current nutrition_logs schema:
```
nutrition_logs:
  id, user_id, date, timestamp, macro_type, amount, xp, label, meal_tag
```
Each macro is a separate row (protein=70, carbs=200, fat=50, calories=1450 = 4 rows).

### Consideration for edit/delete:
The current schema stores macros as individual rows without a "meal_id" grouping. To support editing/deleting a specific food item, we may need:
- Option A: Add a `meal_id` column that groups rows from the same confirmation action
- Option B: Add a `food_items` jsonb column that stores the structured food list per meal
- Option C: Store foods in a separate `food_items` table linked to nutrition_logs

Option B is simplest — one row per meal confirmation with `food_items: [{name, protein, carbs, fat, calories, grams}]` and the macro totals as the existing columns.

---

## Connections

- **NutritionBar** (Power Level screen) — real-time display of daily IN/BURNED/NET
- **Bounty "Track meals 4/7 days"** — logging counts toward weekly consistency
- **Body Recomp Streak** (Epic 8) — nutrition tracking supports the recomp narrative
- **XP** — 3+ meals/day = daily nutrition XP bonus (already implemented)

---

## Open Questions

1. Should the edit flow change the underlying data model? (meal_id grouping vs current per-macro rows)
2. Should there be a "copy yesterday's meals" shortcut for people with routine diets?
3. Should the camera input show a preview/crop before sending to AI?
