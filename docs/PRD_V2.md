# Refactor Athletics v2 — Product Requirements Document

## Overview

**Product:** Refactor Athletics
**Version:** 2.0 — "The Focused Product"
**One-liner:** Train. Rank up. Compete. Everything syncs from your wearable.
**Target user:** Busy fitness-minded people with wearables who want to see how they improve and stack up against others.

---

## Problem Statement

v1 has too many systems competing for attention (habits, streaks, heatmaps, quests, body recomp, Refactor Score, Daily Rites, nutrition sliders). The result: nothing feels polished, nothing feels fun, and the core differentiator (rank thresholds + competitive challenges) gets buried.

Users don't open the app excited. They open it confused about what to do next.

## Vision

Three screens. Three emotions. Three actions.

| Screen | Emotion | Action |
|--------|---------|--------|
| **Power Level** | Pride + hunger | "I see a gap → I want to train" |
| **Arena** | Competition + accountability | "My friend is ahead → I need to catch up" |
| **Train** | Flow + progress | "I tap Start and I'm in my workout" |

Everything else either supports these three or gets cut.

---

## Core Features

### 1. Power Level (Home Screen)

The scoreboard. Your fitness identity.

**What it shows:**
- Power Level number (large, bold) with letter grade (S/A/B/C/D/F)
- Closest rank-ups (2-3 exercises nearest to next threshold) with CTAs to train them
- Recent PRs (last 7 days)
- XP progress bar with level + what unlocks next
- Today's wearable sync summary (steps, calories burned, sleep) — informational only, no targets
- Theme banner (user's chosen identity)

**Data sources:**
- `workouts` table (max level per exercise → Power Level)
- `catalog` table (rank thresholds)
- Wearable sync (steps, calories, sleep)
- `xp_ledger` (today's XP)

### 2. Arena

The social engine. Why people stay.

**What it shows:**
- Active challenges (75-day, weekly, duels) — prominent cards with live progress per member
- Group/party members with their Power Levels and today's activity status
- "Challenge Someone" CTA
- Past results (collapsed)

**Challenge types supported:**
- 75-day challenge (custom metrics per member, shared fate option)
- Weekly metric challenges (steps, XP, workouts, weight lifted)
- 1v1 duels (specific exercise or total XP over duration)
- Group challenges (collaborative or competitive)

**Key behavior:** Challenges can use ANY metric — XP earned, steps, workouts completed, weight lost, exercises ranked up. The system is flexible.

### 3. Train

The daily action.

**What it shows:**
- Today's scheduled workout (hero card with exercise list, estimated XP, one "Start" button)
- If completed: workout summary with rank-ups and XP earned
- This week (Mon-Sun view with completion status per day)
- Quick Log (log a run, lift, or any exercise outside the program)
- Nutrition AI input (always visible text box: "What did you eat?" → AI estimates → logged)

**Active workout UX (stays as-is):**
- Timer view for cardio (zone-based intervals)
- Checklist view for lifting (sets, reps, weight with live rank nudge)
- Superset grouping
- Rest timer
- Plate calculator
- Rank-up celebration on completion
- Equipment preference (treadmill/rower/bike/elliptical)

---

## Supporting Features

### Nutrition (Simplified)

- Single text input: "What did you eat?"
- AI estimates macros (protein, carbs, fat, calories)
- One-tap to log
- No manual macro sliders, no meal cart complexity, no serving adjusters
- Visible on the Train screen at all times
- Photo option (take a picture → AI identifies food)

### Health Sync (Bulletproof)

- Primary source: wearable (Apple Watch, Garmin, WHOOP, Fitbit via Health Connect / HealthKit)
- Data collected: steps, calories burned, sleep, HRV, resting HR, exercise sessions
- No manual entry for synced metrics — wearable is the source of truth
- If sync fails: show clear message explaining why + link to troubleshoot
- Auto-sync on app open + pull-to-refresh
- WHOOP OAuth for recovery/strain (secondary source)

### XP System (With Teeth)

- XP earned from: workouts (volume + rank milestones), nutrition logging, challenge completions
- XP is visible on Power Level screen as a level bar
- **XP unlocks:** themes, challenge types, cosmetic badges
- **XP as currency:** used in Arena for challenge comparisons (most XP in a day/week)
- Specific unlock tiers defined post-v2 launch

### Profile (Public + Private)

**Public profile (visible to group members / challenge opponents):**
- Power Level + letter grade
- Top ranked exercises (highest level)
- Challenge record (wins/losses)
- Current theme + level

**Private profile (settings):**
- Age, sex, bodyweight (for rank calculations)
- Wearable connections (WHOOP, Google Health, Health Connect)
- Theme selection
- Training path selection
- Preferred cardio equipment
- Account management (delete, sign out)

---

## Onboarding (New Users)

4 steps:
1. Sign up + liability waiver
2. Pick a theme (Athlete, Draconic, Samurai, Apex Predator, Viking)
3. Pick a training path (Hybrid, Strength, Endurance, Mobility)
4. Connect wearable (HealthKit / Health Connect / WHOOP)

Then land on Power Level screen (empty state with CTA: "Complete your first workout to discover your rank").

---

## Navigation

**Bottom bar (3 tabs):**

| Icon | Label | Route |
|------|-------|-------|
| 🏆 | Power Level | `/` (home) |
| ⚔️ | Arena | `/arena` |
| 💪 | Train | `/train` |

**Top header:**
- App logo (left)
- Profile avatar (right, taps to profile/settings)

---

## What's Cut from v1

| Feature | Reason |
|---------|--------|
| Habits / Daily Rites / Discipline | Not used. Not differentiating. |
| Streaks / Heatmaps | Tied to habits system. |
| Refactor Score | Competes with Power Level for attention. |
| Daily Quests / Weekly Quests | Absorb into Arena challenges. |
| Starter Quest onboarding | Replaced by 4-step flow. |
| Body Recomp (full mode) | Confusing. Weight kept for challenges only. |
| Manual habit logging (water, sleep, steps) | Wearable handles this. |
| Track page (5-tab layout) | Replaced by Train + Power Level. |
| Today tab (cluttered dashboard) | Replaced by Power Level as home. |
| Macro log modal / Meal cart / Serving adjusters | Replaced by AI text input. |

---

## Technical Approach

- **Feature branch:** `feat/3-tab-redesign`
- **Strategy:** Keep backend/DB intact. Rebuild frontend screens with existing components.
- **Phases:**
  1. New nav + routing scaffold (1 day)
  2. Build 3 screens from existing components (3 days)
  3. Delete dead code (0.5 day)
  4. Test fixes + cleanup (1.5 days)
- **Total estimated effort:** 6 days

---

## Success Metrics

- User opens app daily (retention)
- User completes 3+ workouts/week
- User participates in at least 1 active challenge
- Time-to-first-action < 5 seconds (tap Start on workout)
- Health sync data appears without manual intervention

---

## Open Questions (Post-v2)

- What specific XP unlock tiers? (themes at level 5, challenge types at level 10?)
- Should challenges have entry fees (XP wagering)?
- Leaderboards (global or friends-only)?
- Push notifications (challenge updates, rank-up nudges)?
- Apple Watch complication showing Power Level?

---

*Authored by: John (PM) + Chino (Product Owner)*
*Date: June 11, 2026*
