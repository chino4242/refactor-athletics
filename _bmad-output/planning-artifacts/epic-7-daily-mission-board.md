# Epic 7: Train Screen — Daily Mission Board

**Status:** planned
**Priority:** High — directly impacts daily engagement loop
**Created:** 2026-06-19

---

## Vision

The Train screen becomes a living daily progress tracker that knows what you've accomplished across multiple sessions and motivates you to finish everything prescribed. It shows accomplishment for what's done AND pushes you toward what's left.

**Hierarchy:**
1. All workouts prescribed for a day (the full battle)
2. → Workout Sessions (user may workout 1-to-many times per day)
3. → → Individual Cards (each exercise within a session)

**Key Principles:**
- Each finished session group should feel impactful
- Push and reward finishing everything
- User can end a session and come back later (not just pause — leave and resume)
- Earning XP as they go, but bonus for completing ALL

---

## Target UX

```
TODAY'S BATTLE
━━━━━━━━━━━━━━━━━━━━━━━━━ 4/12 exercises · 180 XP earned

✓ Strength (Push)        [4/4]  +120 XP
○ Cardio                 [0/1]  ~80 XP
○ Core                   [0/3]  ~90 XP

Complete all → +200 XP BONUS

▸ CONTINUE BATTLE
```

- Each group is tappable to start/resume that session
- Groups check off as completed across the day
- XP accumulates visibly
- When all done — bonus drops + celebration

---

## Stories

### 7-1: Daily Progress Tracker on Train Screen

**As a** user returning to the Train screen after a partial workout,
**I want** to see what I've completed today and what's left,
**So that** I feel accomplishment and motivation to finish.

**Acceptance Criteria:**
- Query today's completed workouts from `workouts` table
- Group prescribed exercises by session type (Strength/Cardio/Core based on program block types)
- Show completed vs total per group with XP earned
- Overall progress bar + total XP
- Show estimated XP for incomplete groups
- Show completion bonus target ("Complete all → +200 XP BONUS")

---

### 7-2: Multi-Session Battle State

**As a** user who wants to split my workout across the day,
**I want** to end a battle mid-workout and come back later to finish the rest,
**So that** I can do strength in the morning and cardio in the evening.

**Acceptance Criteria:**
- "Save & Exit" option in battle (distinct from "End Workout" which submits report)
- Preserves which cards are defeated in localStorage keyed by date
- Train screen shows "CONTINUE BATTLE" when partial session exists
- Tapping resumes with only the remaining (non-defeated) cards
- Battle state resets at midnight (new day = fresh slate)
- Tapping a specific session group starts battle with only those cards

---

### 7-3: Completion Bonus

**As a** user who completed all prescribed exercises for the day,
**I want** to receive a bonus XP reward and celebration,
**So that** I feel the satisfaction of a fully completed day.

**Acceptance Criteria:**
- Detect when all prescribed exercises for today are marked done in DB
- Award bonus XP (+200 or scaled to workout size)
- "DAY COMPLETE" celebration on Train screen (pixel art, theme-colored)
- Write bonus to xp_ledger with label "Day Complete Bonus"
- Update weekly grid to show ✓ for today

---

### 7-4: Session-Type Grouping & Routing

**As a** user looking at my daily plan,
**I want** to start just one section (e.g., only Cardio),
**So that** I can focus on what I have time/energy for right now.

**Acceptance Criteria:**
- Each session group on Train screen is tappable
- Tapping a group starts Battle Mode with ONLY that group's cards
- "Start All" option starts the full prescribed workout as one battle
- Program blocks are categorized: exercises with weights → Strength, treadmill/cardio → Cardio, plank/abs/core → Core
- Completed groups are not re-startable (show as ✓ with XP earned)

---

## Dependencies

- Requires the program resolver to provide exercise-to-session-type mapping
- Builds on existing Battle Mode save/restore (localStorage `battle_session`)
- Extends the weekly grid completion logic already in TrainScreen

## Open Questions

- Should the completion bonus scale with workout size? (Bigger day = bigger bonus?)
- Should there be a "streak" for consecutive complete days? (e.g., 5 days in a row = multiplier)
- How does this interact with quick-logged exercises? (Do they count toward the daily total?)
