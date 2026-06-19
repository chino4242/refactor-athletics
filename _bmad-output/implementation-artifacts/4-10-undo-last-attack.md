# Story 4-10: Undo Last Attack

**Status:** ready-for-dev
**Epic:** 4 — Game Feel & Battle Visuals
**Created:** 2026-06-19

---

## User Story

**As a** user who accidentally tapped STRIKE with wrong weight/reps or hit it prematurely,
**I want** to undo my last attack,
**So that** my tracking stays accurate without having to abandon the entire workout.

---

## Problem Statement

The STRIKE button is a single tap with no confirmation. Once pressed:
- A set is logged to the `workouts` table in Supabase
- `completedSets` increments on the card
- XP is awarded
- Rest timer starts

There's no way to reverse this. Users either live with bad data or abandon the workout.

---

## Acceptance Criteria

### AC1: Undo button appears during rest
```gherkin
GIVEN I just logged a set (rest timer is active)
THEN an "UNDO" button is visible near the rest timer area
AND it disappears when rest ends or next attack starts
```

### AC2: Undo reverses the set count
```gherkin
GIVEN I tap UNDO during rest
THEN completedSets decrements by 1 on the current card
AND the rest timer stops
AND the weight/reps inputs restore to what they were
```

### AC3: Undo removes the DB entry
```gherkin
GIVEN I tap UNDO
THEN the most recent workout row for this exercise+session is deleted from Supabase
AND any XP awarded for that set is not re-deducted (too complex — acceptable loss)
```

### AC4: Single undo only
```gherkin
GIVEN I have already undone the last attack
THEN the UNDO button is no longer visible
AND I cannot undo multiple times in a row
```

---

## Technical Context

### Files to modify:
- `src/components/v2/BattleView.tsx` — logAttack function + rest state rendering

### How to delete the last set:
The `logTrainingAction` inserts a row in `workouts` with `session_id = sessionId.current`. To undo:
```ts
await supabase.from('workouts')
  .delete()
  .eq('user_id', userId)
  .eq('exercise_id', exerciseId)
  .eq('session_id', sessionId.current)
  .order('timestamp', { ascending: false })
  .limit(1);
```

### State to track:
```ts
const [lastAttack, setLastAttack] = useState<{ cardId: string; exerciseId: string; weight: string; reps: string } | null>(null);
```

Set after each successful logAttack. Clear on undo or next attack. Undo button visible when `lastAttack !== null && isResting`.

### What NOT to change:
- XP deduction (too complex, acceptable to lose a few XP on undo)
- Career XP recalculation
- Perfect Strike / combo count (just don't undo those — rare case)

---

## Dev Notes

- Keep it simple: one level of undo, only during rest period
- The undo button should be small and secondary (zinc-700 border, not prominent) to avoid accidental undo
- Supabase delete needs `.order().limit(1)` — verify PostgREST supports this pattern or use a subquery
- If the set was the FINAL set (card defeated), undo should un-defeat the card and restore it

---

## Testing Plan

- Manual: Log a set, hit UNDO during rest, verify set count decrements
- Manual: Verify UNDO disappears after rest ends
- Manual: Verify can't undo twice
- Manual: Verify defeating a card then undoing restores the card
