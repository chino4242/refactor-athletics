# Story 4-9: Treadmill Cardio UX — Full-Screen Zone Colors + Audio Coaching

**Status:** ready-for-dev
**Epic:** 4 — Game Feel & Battle Visuals
**Created:** 2026-06-19

---

## User Story

**As a** user doing a treadmill HIIT workout,
**I want** the entire card to visually scream what zone I'm in and what incline/speed I should be doing,
**So that** I can glance at my phone from the treadmill and instantly know my targets without squinting at small text.

---

## Problem Statement

The current cardio card shows zone info as small colored text in the center of a dark card. During a treadmill workout:
- Text is too small to read while running
- Incline/speed (stored in the `note` field) is easy to miss
- The only audio cues are a single beep at 3 seconds and one at zone transition
- There's no visceral sense of "this is a red zone" vs "this is a recovery zone"

---

## Acceptance Criteria

### AC1: Full-card zone coloring
```gherkin
GIVEN I am in an active cardio interval
WHEN the current zone is "Comfortable" / "Challenging" / "Full Send"
THEN the entire card background changes to green / orange / red (muted, not blinding)
AND the card border matches the zone color
AND the transition between colors is immediate on zone change
```

### AC2: Large, readable incline display
```gherkin
GIVEN I am in an active cardio interval with a note containing incline (e.g., "3%" or "@ 3% incline")
THEN the incline percentage is displayed in LARGE text (minimum 24px)
AND it is the most prominent data element on the card
AND if no incline is present, only the zone name is shown large
```

### AC3: Flash + pulse on zone transition
```gherkin
GIVEN a zone transition occurs
THEN the card flashes white briefly (100ms)
AND the new zone color pulses (scale 1.0 → 1.02) for one cycle
```

### AC3: Countdown beep sequence (3-2-1)
```gherkin
GIVEN the current interval has 3 seconds remaining
THEN three distinct beeps play at 3, 2, and 1 seconds
AND the final beep (1 second) is a higher pitch indicating transition
```

### AC4: Zone transition audio announcement
```gherkin
GIVEN a zone transition occurs
THEN a distinct "zone change" sound plays (different from countdown beeps)
AND if the next zone is "Full Send" the sound is more urgent/aggressive
```

### AC5: Visual countdown emphasis
```gherkin
GIVEN the interval has ≤5 seconds remaining
THEN the countdown number grows larger (scale animation)
AND pulses on each second
```

---

## Technical Context

### Files to modify:
- `src/components/v2/BattleView.tsx` — CardioCard function (~line 1150+)

### Current CardioCard data flow:
- `card.intervals[]` — array of `{ zone: string, seconds: number, color: string, note?: string }`
- `color` field contains Tailwind bg class: `bg-green-500`, `bg-orange-500`, `bg-red-500`
- `note` field contains freeform text like "6.0 mph @ 3% incline"
- Timer runs via `useEffect` with `setInterval(1000ms)`
- Audio via `src/utils/audio.ts` → `playCountdownBeep(freq, duration)`

### Current audio system:
- `playCountdownBeep(600, 0.1)` — warning beep at T-3
- `playCountdownBeep(1000, 0.15)` — zone transition beep
- Haptic on transition: `haptic('medium')`

### Zone → Color mapping:
| Zone | color field | Target card bg |
|------|------------|----------------|
| Comfortable | bg-green-500 | bg-green-900/40 (muted dark green) |
| Challenging | bg-orange-500 | bg-orange-900/40 (muted dark orange) |
| Full Send | bg-red-500 | bg-red-900/40 (muted dark red) |

### What NOT to change:
- Engine choice screen (HIIT vs Zone 2 selection)
- Overall progress bar logic
- Zone 2 steady state behavior (it's one long green interval — fine as-is)
- The interval data model (zone/seconds/color/note stays the same)

---

## Dev Notes

### Approach for full-card coloring:
Use the existing `current.color` field to derive a muted background. The pattern:
```tsx
const cardBg = current.color.includes('red') ? 'bg-red-950/60 border-red-700'
  : current.color.includes('orange') ? 'bg-orange-950/60 border-orange-700'
  : 'bg-green-950/60 border-green-700';
```
Apply to the card's outer div replacing the static `bg-zinc-900`. Transition with `transition-colors duration-300`.

### Approach for large speed/incline:
Parse the `note` field for structured data. Common patterns:
- "6.0 mph @ 3% incline"
- "4.0 @ 8%"
- "Sprint pace"

Display speed and incline as separate large elements:
```
   6.0 mph
   3% incline
```
Font size: `text-2xl` minimum for the primary value. Pixel font for the RPG feel.

### Approach for 3-2-1 beeps:
Change the single beep at T-3 to three separate beeps:
- T-3: `playCountdownBeep(600, 0.1)` (low)
- T-2: `playCountdownBeep(800, 0.1)` (medium)
- T-1: `playCountdownBeep(1000, 0.15)` (high)

### Approach for zone transition sound:
On zone change, play a distinctive double-beep or chord:
- Normal transition: `playCountdownBeep(800, 0.05)` + `playCountdownBeep(1200, 0.1)` with 50ms gap
- Full Send transition: triple rapid beep at ascending pitch

### Approach for countdown emphasis:
Last 5 seconds: apply `text-4xl` + `animate-pulse` to the countdown number. Scale increases per second (3xl → 4xl → 5xl for last 3).

---

## Retro Commitments Applied

- **Integration spike**: CardioCard is self-contained within BattleView. No cross-system dependencies. Audio util already exists and works on both platforms.
- **Epic boundary**: Pure web-layer change. No native plugin involvement. Works on iOS and Android identically.
- **BattleView extraction note**: CardioCard is a good candidate for extraction to its own file, but for this story we modify in place. Extraction is a separate task.

---

## Testing Plan

- Manual: Start a HIIT workout, verify color transitions on each zone change
- Manual: Verify note/incline text is readable from arm's length
- Manual: Listen for 3-2-1 beep sequence before transitions
- Manual: Verify Zone 2 (single green interval) doesn't break
- Automated: None required (pure UI/audio — no data logic changes)
