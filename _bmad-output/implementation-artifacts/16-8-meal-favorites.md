---
story_id: "16.8"
story_key: "16-8-meal-favorites"
title: "Meal Favorites — Saved Meals for Instant Re-Logging"
status: "ready-for-dev"
epic: 16 — Fuel Screen
created: 2026-06-30
---

# Story 16-8: Meal Favorites — Saved Meals for Instant Re-Logging

## User Story

**As a** user who eats similar meals regularly,
**I want** to save parsed meals and re-log them instantly from a favorites list,
**So that** I don't wait for AI parsing or spend API tokens on meals I've already logged before.

## Business Value

- Reduces Claude API costs (each food-parse call costs tokens)
- Dramatically speeds up daily logging (one tap vs type → wait → confirm)
- Reduces friction = higher tracking consistency = better retention

## Acceptance Criteria

### AC1: Save a meal to favorites
- After confirming a parsed meal, show a "★ Save to Favorites" button
- Tapping it saves the full meal breakdown (name, items with individual macros, totals) to a `meal_favorites` table
- User can optionally rename the favorite before saving (default: the original text input)
- Provide feedback ("Saved to favorites ✓")

### AC2: Display favorites on Fuel screen
- Replace the current "recent meals" pills with true favorites from `meal_favorites`
- Show up to 8 favorites, sorted by frequency (use_count DESC, then created_at DESC)
- Each pill shows the meal name (truncated to ~15 chars)
- Long-press (or hold 500ms) on a favorite to delete it

### AC3: One-tap instant re-log from favorites
- Tapping a favorite immediately shows the confirmation card with pre-filled macros (NO AI call)
- User can adjust meal tag (breakfast/lunch/etc.) and confirm
- Confirm logs all macros via existing `logHabitAction` calls (same as normal flow)
- Increment `use_count` on the favorite after successful log

### AC4: Auto-suggest saving to favorites
- After a user confirms a meal that was AI-parsed (not from favorites), check if it's "new"
- If the meal text doesn't match any existing favorite name, briefly show "★ Save?" chip for 5 seconds
- If dismissed or timed out, don't persist — user can always manually save later

---

## BDD Scenarios

### AC1: Save a meal to favorites

**Scenario 1: Save after confirming a new meal**
```
Given I have just confirmed a parsed meal ("Chicken breast, rice, and broccoli")
When the macros are logged successfully
Then I see a "★ Save to Favorites" button below the confirmation
And the button is visible for 5 seconds before fading
```

**Scenario 2: Saving stores the full breakdown**
```
Given I tap "★ Save to Favorites" after logging a meal
When the save completes
Then a row is created in meal_favorites with:
  - name: "Chicken breast, rice, and broccoli"
  - items: [{name: "Chicken breast", protein: 43, carbs: 0, fat: 5, calories: 215}, ...]
  - total_protein, total_carbs, total_fat, total_calories populated
  - use_count: 1
And I see a brief "Saved ✓" confirmation
```

**Scenario 3: Rename before saving**
```
Given the "★ Save to Favorites" prompt is showing
When I tap the meal name text
Then it becomes editable (inline text input)
And I can rename it to "Post-workout meal" before saving
```

**Scenario 4: Don't show save prompt for meals logged from favorites**
```
Given I logged a meal by tapping an existing favorite
When the log completes
Then the "★ Save to Favorites" button does NOT appear
And the favorite's use_count is incremented instead
```

### AC2: Display favorites on Fuel screen

**Scenario 5: Favorites load and display**
```
Given I have 3 saved favorites (use_counts: 8, 3, 12)
When I open the Fuel screen
Then I see 3 pill buttons below the input
And they are sorted by use_count descending: most-used first
And each pill shows the meal name truncated to ~15 characters
```

**Scenario 6: No favorites state**
```
Given I have no saved favorites
When I open the Fuel screen
Then the favorites section does not render
And there is no empty state or placeholder
```

**Scenario 7: Delete a favorite via long-press**
```
Given I see my favorites pills
When I long-press (hold 500ms) on "Chicken + rice"
Then a confirmation appears: "Remove from favorites?"
And if I confirm, the favorite is deleted from the database
And the pill disappears from the list
```

### AC3: One-tap instant re-log from favorites

**Scenario 8: Tap favorite → instant confirm card**
```
Given I have a favorite "Protein shake" (protein: 50, carbs: 8, fat: 3, calories: 260)
When I tap the "Protein shake" pill
Then the confirmation card appears immediately (no loading spinner)
And it shows: P:50g C:8g F:3g 260cal
And the meal tag defaults to the auto-detected time-of-day tag
And no API call is made to /api/food-parse
```

**Scenario 9: Confirm re-logged favorite**
```
Given the confirmation card is showing from a favorite tap
When I tap ✓ to confirm
Then logHabitAction is called 4 times (protein, carbs, fat, calories)
And the favorite's use_count increments by 1
And the FuelScreen macro bars update via onLog callback
```

**Scenario 10: Change meal tag before confirming favorite**
```
Given the confirmation card is showing from a favorite tap
And the auto-detected tag is "Lunch"
When I tap the meal tag button to cycle to "Snack"
Then the tag updates to "Snack"
And when I confirm, the macros are logged with label "snack"
```

### AC4: Auto-suggest saving to favorites

**Scenario 11: New meal triggers save suggestion**
```
Given I have favorites: ["Protein shake", "Chicken bowl"]
When I log a new AI-parsed meal with text "Oatmeal with berries"
And "Oatmeal with berries" does not match any existing favorite name
Then after logging, the "★ Save?" chip appears for 5 seconds
```

**Scenario 12: Duplicate meal does NOT trigger save suggestion**
```
Given I have a favorite named "Chicken bowl"
When I type "Chicken bowl" and AI-parse it
And I confirm the log
Then the "★ Save?" chip does NOT appear
Because a matching favorite already exists
```

**Scenario 13: Save suggestion timeout**
```
Given the "★ Save?" chip is showing after a new meal log
When 5 seconds pass without interaction
Then the chip fades out
And no favorite is saved
And this is not an error — the user simply didn't opt in
```

---

## Technical Requirements

### New Database Table: `meal_favorites`

```sql
CREATE TABLE meal_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_protein numeric NOT NULL DEFAULT 0,
  total_carbs numeric NOT NULL DEFAULT 0,
  total_fat numeric NOT NULL DEFAULT 0,
  total_calories numeric NOT NULL DEFAULT 0,
  meal_tag text,
  use_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE meal_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own favorites" ON meal_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast retrieval
CREATE INDEX idx_meal_favorites_user ON meal_favorites(user_id, use_count DESC);
```

### `items` JSONB shape:
```json
[
  {"name": "Chicken breast", "protein": 43, "carbs": 0, "fat": 5, "calories": 215},
  {"name": "White rice", "protein": 4, "carbs": 45, "fat": 1, "calories": 206},
  {"name": "Broccoli", "protein": 3, "carbs": 7, "fat": 0, "calories": 35}
]
```

---

## Implementation Guide

### Files to Modify

| File | Change |
|------|--------|
| `src/components/v2/NutritionInputV2.tsx` | Replace `recentMeals` with favorites fetch; add save-to-favorites flow; one-tap re-log |
| `src/app/actions.ts` | Add `saveMealFavoriteAction` and `deleteMealFavoriteAction` server actions |

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/2026XXXX_meal_favorites.sql` | New table migration |

### Data Flow

1. **Save favorite:** After `confirmLog()` succeeds → show "★ Save to Favorites" → call `saveMealFavoriteAction(userId, name, items, totals, mealTag)`
2. **Load favorites:** In `fetchProgress()`, replace the `recentMeals` query with: `supabase.from('meal_favorites').select('*').eq('user_id', userId).order('use_count', { ascending: false }).limit(8)`
3. **Re-log from favorite:** Tap pill → `setPending({ protein: fav.total_protein, carbs: fav.total_carbs, fat: fav.total_fat, calories: fav.total_calories, items: fav.items })` → confirm card shows immediately (no AI call)
4. **Increment use_count:** After successful log from favorite → `supabase.from('meal_favorites').update({ use_count: use_count + 1 }).eq('id', favId)`

### Key Architectural Decisions

- **NO new component needed** — this augments NutritionInputV2 with state changes
- **Server actions for writes** (following existing pattern in `actions.ts`)
- **Client-side reads** (following existing pattern — fetchProgress already reads nutrition_logs directly)
- **Meal text is stored in `name` field** — this is what's currently NOT persisted anywhere
- **Items array preserves full breakdown** — enables showing individual food items in the confirm card
- **use_count for sorting** — most-used meals float to top, not just most recent

### What the "Recent Meals" Replacement Looks Like

**Before (current broken behavior):**
- Pills show meal tags ("breakfast", "lunch") — not actual food descriptions
- Clicking populates text → requires AI re-parse → costs tokens + 2-3s latency

**After (favorites):**
- Pills show actual meal names ("Chicken + rice", "Protein shake")
- Clicking instantly shows confirm card with saved macros — zero API calls, instant

---

## Dev Notes

### Gotchas to Avoid
- The `pending` state in NutritionInputV2 uses `ParsedMeal` interface: `{ protein, carbs, fat, calories, items? }`. Favorites map directly to this shape.
- The `confirmLog` function already handles the full log flow. Re-logging from favorites just needs to set `pending` state — no code duplication needed.
- The `label` parameter in `logHabitAction` is the meal TAG (breakfast/lunch/etc.), not the meal name. Don't confuse these.
- RLS must be enabled on the new table (Supabase won't allow client reads without it).

### Testing Approach
- Unit test: `saveMealFavoriteAction` writes correct shape
- Unit test: `deleteMealFavoriteAction` removes row
- Component test: tapping favorite pill sets pending state without API call
- Integration: save → refresh → pill appears → tap → confirm → macros logged

---

## Dependencies

- None — this is self-contained within the Fuel screen
- No other stories block or are blocked by this

## Estimated Effort

Small-medium: 1 migration + modify 2 files + ~100 lines of new logic
