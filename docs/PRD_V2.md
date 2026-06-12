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
- `workouts` table (max level per exercise *within validity window* → Power Level)
- `catalog` table (rank thresholds — 12 exercises per path)
- Wearable sync (steps, calories, sleep)
- `xp_ledger` (today's XP)

**Power Level Decay:** Exercises must be retested within their validity window (L1-2: 90 days, L3-4: 60 days, L5: 45 days). Best within window counts. See `GAME_DESIGN_V2.md` for full decay rules.

**Power Level Tiers:** Bronze (0-12), Silver (13-24), Gold (25-36), Platinum (37-48), Diamond (49-60). Visual frame evolves with tier.

### 2. Arena

The social engine. Why people stay. Ordered by priority on screen:

**2.1 Custom Challenges (top card)**
- Daily boolean checklist, configurable duration (default 75 days)
- Metrics: plain text checkboxes (some auto-check from data, others manual honor-system)
- Pass condition: all metrics every day (strict)
- Failure mode: shared fate or individual (creator configures)
- Limit: max 1 active per user
- Habit tracking (water, alcohol, etc.) ONLY exists inside custom challenges
- Reward: 2,500 XP + cosmetic badge

**2.2 Group Challenges**
- Weekly, leader-set metric + target
- Collaborative (shared goal) or competitive (leaderboard within group)
- Limit: max 1 per group
- Reward: 100 XP

**2.3 Duels**
- 1v1: time-boxed (24h/7d/30d) or race-to-target (first to X wins)
- Any metric (steps, XP, exercise volume, etc.)
- Challenger sends → recipient accepts or ignores
- Limit: max 3 active per user
- Reward: 200 XP for winner, win/loss record on profile

**2.4 Weekly Bounties (bottom)**
- 3 per week (1 Training, 1 Consistency, 1 Social/Meta)
- Targets personalized (trailing 4-week avg × difficulty modifier)
- Difficulty: Easy (−25%, 100 XP) / Normal (150 XP) / Hard (+25%, 225 XP)
- Sweep bonus: 25/50/100 XP for all 3
- Monday–Sunday, user's local timezone

**Social visibility:** Group sees progress + completions (passive). Notifications only on milestones. Failures visible but never pushed.

**Key behavior:** A single action (run, lift, log) advances all active challenges simultaneously. One action, multiple progress.

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

| Source | XP | Rule |
|---|---|---|
| Workout set (ranked) | `rank_level × 50` | Level 0 = 10 XP |
| Cardio block | 8 XP/min | Logged workout only |
| Rank-up | 200 XP | Per exercise per level, re-earnable after decay |
| Steps | 1 XP per 1,000 | Passive — excluded during logged workouts |
| Nutrition tracking | 50 XP/day | Binary: tracked 3+ meals = 50, else 0 |
| Weekly bounty | 100–225 XP | Scales with difficulty |
| Bounty sweep | 25–100 XP bonus | All 3 completed |
| Duel win | 200 XP | |
| Custom challenge complete | 2,500 XP | |
| Weekly group challenge | 100 XP | |

**No XP from:** sleep, water, HRV, recovery, strain, opening the app.

XP visible on Power Level screen as a level bar. **XP unlocks:** themes, challenge types, cosmetic badges (specific tiers TBD post-launch).

### Ranked Exercises (12 per path)

**Universal Core (all paths):** Back Squat (xBW), Deadlift (xBW), Bench Press (xBW), Pull-up (Reps), Overhead Press (xBW), Run 1 Mile (Sec), Plank (Sec), Push-ups (Reps)

**Specialty (4 per path):**
| Strength | Endurance | Mobility & Calisthenics | Hybrid |
|---|---|---|---|
| Barbell Row | Run 400m | Deep Squat Hold | Run 400m |
| Incline Bench | Run 5K | Dead Hang | Dead Hang |
| RDL | Row 6min | Cossack Squat | Barbell Row |
| Dip | Dead Hang | L-Sit Hold | Run 5K |

Max Power Level = 60 (12 × Level 5). Balanced across all paths. Everything else in catalog is loggable for XP but unranked.

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
3. Pick a training path (Hybrid, Strength, Endurance, Mobility & Calisthenics)
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
