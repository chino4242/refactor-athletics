# Story 4-11: Battle Celebrations — Rank-Up Flash, Defeat Card, PR Detection, Exercise Trend

**Status:** ready-for-dev
**Epic:** 4 — Game Feel & Battle Visuals
**Created:** 2026-06-19

---

## User Story

**As a** user in Battle Mode,
**I want** to feel the impact of rank-ups, PRs, and exercise defeats,
**So that** the workout feels meaningful and I'm motivated to keep pushing.

---

## Features

### 1. Rank-Up Flash Moment

**Trigger:** `logTrainingAction` returns `result.level > result.previous_level`

**Behavior:**
- Full-screen overlay flash (theme accent color, 200ms)
- Large centered display (holds ~2.5 seconds):
  - "⬆ RANK UP" header (pixel font)
  - Exercise name: "Back Squat → LV 2"
  - Next threshold: "Next: 155 lbs to reach LV 3"
- Sound: distinct ascending chord (not a beep)
- Then dismisses automatically

**Key:** This celebrates the EXERCISE ranking up, not the enemy. The user needs to know:
1. What ranked up
2. What level they're now at
3. What the next target is

**Data available from `logTrainingAction` result:**
- `result.level` — new level
- `result.previous_level` — old level  
- `result.rank_name` — rank tier name
- `result.next_threshold` — need to add this to the API response (or compute client-side from catalog standards)

### 2. Enemy Defeat Overlay

**Trigger:** Final set completed on a card (`newCompleted >= card.totalSets`)

**Behavior:**
- Card shows a 2-second "defeated" overlay instead of immediately advancing:
  - Enemy sprite shatters/dissolves
  - Exercise name + total XP earned for this exercise
  - "Last 3" trend line (see #4)
  - If PR was hit: gold "★ NEW PR" badge
- After 2 seconds, card marks as defeated and carousel advances

**Current behavior being replaced:** Card immediately marks defeated + poofing animation. New behavior adds a pause with info before advancing.

### 3. PR Detection + Celebration

**Trigger:** After each set, compare `raw_value` (Epley 1RM for lifting, or raw value for reps/time) against the user's historical best for that exercise.

**Behavior:**
- If current set's value > all-time best:
  - Gold flash on the card border (300ms)
  - "★ NEW PR" text appears above the HP bar
  - +50 bonus XP
  - Distinct sound (higher pitch than normal attack)
- PR state persists on the card until next set

**Data needed:** Historical best per exercise. Already available from `historyArr` in BattleView (used for `lastWeight`). Extend to track `bestValue` (max raw_value) per exercise.

### 4. Exercise Trend (Last 3)

**Where:** Shown on the defeat overlay card

**Format:** 
```
Last 3: 185 → 195 → 205 ↑
```
or for reps-based:
```
Last 3: 8 → 10 → 12 reps ↑
```

**Arrow:** ↑ if trending up (last > first), ↓ if down, → if flat

**Data:** Pull from `historyArr` — last 3 sessions for this exercise_id, show the `raw_value` from each.

---

## Technical Context

### Files to modify:
- `src/components/v2/BattleView.tsx` — all changes are here

### Current rank-up handling (line ~435):
```ts
if (result?.level > 0 && result?.level > (result?.previous_level || 0)) {
  setRankUpToast(`${card.name} → LV${result.level} ${result.rank_name || ''}`);
  setTimeout(() => setRankUpToast(null), 3000);
}
```
Replace with full-screen overlay component.

### Current defeat handling (line ~481):
```ts
setCards(prev => prev.map(c => {
  if (c.id !== card.id) return c;
  const newCompleted = c.completedSets + 1;
  const defeated = newCompleted >= c.totalSets;
  return { ...c, completedSets: newCompleted, defeated, poofing: defeated };
}));
```
Add a delay before marking defeated — show overlay first.

### Data for PR detection:
Add `bestValue` to BattleCard interface (populated from historyArr during card building, same as `lastWeight`).

### Data for trend:
Add `lastThree` to BattleCard interface: `number[]` — last 3 raw_values for this exercise from history.

### What NOT to change:
- XP pop (floating number) — keep it, it's per-set feedback
- Session bounties — keep as-is
- Perfect Strike — keep as-is (complementary, not conflicting)

---

## Questions for Chino

1. For the rank-up flash — you mentioned "more notes on how that may work later on." Should I build the basic version now (full-screen overlay with level + next threshold) and you'll refine it, or wait for your notes?

2. For the defeat overlay — should it auto-dismiss after 2 seconds, or require a tap to continue? (Auto is better for flow, tap gives control.)

3. For PR detection — should this compare against the single-set Epley 1RM, or just raw weight? (e.g., 225×5 is a PR even if you've done 235×3 before, because the calculated 1RM is higher)

---

## Testing Plan

- Manual: Log a set that crosses a rank threshold, verify full-screen flash + next threshold shown
- Manual: Complete final set on a card, verify 2-second defeat overlay with XP + trend
- Manual: Log a weight higher than historical best, verify "★ NEW PR" flash
- Manual: Check trend shows correct last 3 values from workout history
