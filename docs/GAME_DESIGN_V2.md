# Refactor Athletics v2 — Game Design Document

**Version:** 2.0 — "The Focused Product"
**Date:** June 12, 2026
**Authors:** Samus Shepard (Game Designer), Sally (UX Designer), Chino (Product Owner)

---

## Design Philosophy

Refactor Athletics v1 had too many systems competing for attention. V2 strips to the core:

**Three screens. Three emotions. Three actions.**

| Screen | Emotion | Action |
|--------|---------|--------|
| **Power Level** | Pride + hunger | "I see a gap → I want to train" |
| **Arena** | Competition + accountability | "My friend is ahead → I need to catch up" |
| **Train** | Flow + progress | "I tap Start and I'm in my workout" |

**Core principle:** A single workout can advance bounties, group challenges, duels, and custom challenges simultaneously. The user trains once — the system distributes credit.

---

## 1. Progression Systems

### 1.1 Power Level (Performance Metric)

**What it is:** Your current fitness capability score. The hero number on the home screen.

**Calculation:** Sum of highest rank level per ranked exercise *within its validity window*.

**Max Power Level:** 60 (12 exercises × Level 5) — identical across all paths.

**Power Level Tiers (visual evolution):**

| Range | Visual State | Name |
|---|---|---|
| 0–12 | Dim, basic badge | Bronze |
| 13–24 | Glowing edges | Silver |
| 25–36 | Animated particles | Gold |
| 37–48 | Full pixel art frame | Platinum |
| 49–60 | Legendary animated border | Diamond |

#### 1.1.1 Power Level Decay

Fitness is perishable. Power Level reflects *current* capability, not lifetime PRs.

**Validity Windows:**

| Rank Level | Window |
|---|---|
| Level 1–2 | 90 days |
| Level 3–4 | 60 days |
| Level 5 | 45 days |

**Rules:**
- Window refreshes every time you log that exercise (any performance)
- **Best within window** counts (not most recent) — bad days don't punish you
- Expired exercises stop contributing to Power Level, dim on screen
- PR history preserved forever — decay only affects Power Level contribution
- Users are never incentivized to *avoid* logging (no "protect my score" perverse incentive)

**UX signals:**
- Exercises approaching expiration show ⚠️ with countdown ("Bench Press expires in 5 days")
- These surface as "retest" prompts on the Power Level screen
- Expired exercises show grayed with last achieved level

---

### 1.2 Player Level (Engagement Metric)

**What it is:** How much you've interacted with the app. A badge of commitment, not fitness.

**Curve:** `1000 × 1.08^level` XP per level (exponential — early levels fast, later levels require sustained commitment).

**Display:** Profile badge, visible to group members. Gates cosmetic unlocks (themes, challenge types — specific tiers TBD post-launch).

**Key difference:** Player Level never decays. It only goes up.

---

### 1.3 XP Economy

**Design principle:** XP only comes from *doing something* or *committing to something*. Never from passive existence.

| Source | XP Award | Rule |
|--------|----------|------|
| Workout set (ranked) | `rank_level × 50` | Level 0 (unranked) = 10 XP |
| Cardio block | 8 XP/min | Logged workout only |
| Rank-up | 200 XP | Per exercise per level, re-earnable after decay |
| Steps | 1 XP per 1,000 | Passive sync — excluded during logged workouts |
| Nutrition tracking | 50 XP/day | Binary: tracked 3+ meals = 50, otherwise 0 |
| Weekly bounty (each) | 100–225 XP | Scales with difficulty chosen |
| Bounty sweep bonus | 25–100 XP | All 3 completed |
| Duel win | 200 XP | |
| Custom challenge (complete) | 2,500 XP | On completion |
| Weekly group challenge | 100 XP | Hit target |

**No XP from:** sleep, water, HRV, recovery, strain, opening the app.

**Steps exclusion rule:** Steps only earn XP from non-workout walking/movement. If a workout is logged, those steps don't double-dip with cardio XP.

---

## 2. Ranked Exercises

### 2.1 Universal Core (all paths — 8 exercises)

| # | Exercise | Unit | Scoring |
|---|---|---|---|
| 1 | Back Squat | xBW | Higher is better |
| 2 | Deadlift | xBW | Higher is better |
| 3 | Bench Press | xBW | Higher is better |
| 4 | Pull-up | Reps | Higher is better |
| 5 | Overhead Press | xBW | Higher is better |
| 6 | Run 1 Mile | Sec | Lower is better |
| 7 | Plank | Sec | Higher is better |
| 8 | Push-ups | Reps | Higher is better |

### 2.2 Path Specialty (4 per path)

| Strength | Endurance | Mobility & Calisthenics | Hybrid |
|---|---|---|---|
| Barbell Row (xBW) | Run 400m (Sec) | Deep Squat Hold (Sec) | Run 400m (Sec) |
| Incline Bench (xBW) | Run 5K (Sec) | Dead Hang (Sec) | Dead Hang (Sec) |
| RDL (xBW) | Row 6min (Meters) | Cossack Squat (Reps) | Barbell Row (xBW) |
| Dip (Reps) | Dead Hang (Sec) | L-Sit Hold (Sec) | Run 5K (Sec) |

### 2.3 Path Definitions

| Path | Identity | Who it's for |
|------|----------|---|
| Hybrid | All-rounder | People who want balanced fitness |
| Strength | Heavy lifting, max effort | Powerlifters, bodybuilders |
| Endurance | Cardio, conditioning, speed | Runners, rowers, conditioning athletes |
| Mobility & Calisthenics | Bodyweight mastery, flexibility | Calisthenics athletes, yoga practitioners |

### 2.4 Ranking Rules

- 5 thresholds per exercise → Levels 1–5. Level 0 = unranked.
- Standards include age brackets (18–24, 25–34, 35–44, 45–54, 55+) and sex.
- xBW exercises: result divided by bodyweight before threshold comparison.
- Equipment normalization still applies (dumbbell ×1.15, smith ×0.85).
- Epley formula for multi-rep sets: `weight × (1 + reps/30)`.
- Only these 12 exercises per path contribute to Power Level. Everything else in the catalog is loggable for XP but unranked.

### 2.5 Standards Required (New)

- **L-Sit Hold** — needs age/sex brackets written (seconds, higher is better)

### 2.6 Standards Removed

These are removed from Power Level contribution (still in catalog for logging):
- barbell_bicep_curl, calf_raises, wall_slide, shoulder_dislocate
- kettlebell_halo, kettlebell_windmill, turkish_get_up
- body_weight_squat, goblet_squat, active_hang (replaced by Dead Hang)
- burpees, bulgarian_split_squat (from non-strength paths)

---

## 3. Arena & Challenge System

### 3.1 System Overview

| Type | Analogy | Cadence | Scope | Limit |
|---|---|---|---|---|
| **Bounties** | PvE quests | Weekly | Solo | Always present (3/week) |
| **Group Challenges** | Raid/co-op | Weekly | Party | Max 1 per group |
| **Duels** | PvP | Flexible | 1v1 | Max 3 active |
| **Custom Challenge** | Campaign | Flexible (default 75 days) | Solo or group | Max 1 active |

**Arena screen priority (top to bottom):** Custom Challenge → Group Challenge → Duels → Bounties

**Cohesion principle:** A single action (a run, a lift) can move the needle on all active challenges simultaneously. Users don't manage 4 systems — they train, and progress flows everywhere.

---

### 3.2 Weekly Bounties

**Purpose:** "What should I focus on this week?" — the thing that makes someone open the app Monday morning with intent.

#### Rotation

7 bounty types across 3 pillars. Each week: 1 from each pillar.

| Pillar | Bounty Types |
|---|---|
| Training | Volume, Distance, Sessions, Rank Chase |
| Consistency | Consistency, Nutrition |
| Social/Meta | Arena |

**Bounty definitions:**

| Type | Metric | Fallback (new user) |
|---|---|---|
| Volume | Total weight lifted (sets × reps × weight) | 5,000 lbs |
| Distance | Total cardio distance | 3 miles |
| Sessions | Workouts completed | 3 workouts |
| Rank Chase | Rank up any exercise | 1 rank-up |
| Consistency | Log workouts on X different days | 4 days |
| Nutrition | Track meals every day | 5/7 days |
| Arena | Complete a challenge or duel | 1 |

#### Target Personalization

**Formula:** Trailing 4-week average for that metric × difficulty modifier.

Users with no history for a metric get the fallback default.

#### Difficulty & XP

On Monday when bounties appear, each card has a difficulty selector (locked after first progress):

| Difficulty | Target Modifier | XP per Bounty | Sweep Bonus |
|---|---|---|---|
| ▼ Easy | −25% | 100 XP | 25 XP |
| ● Normal | baseline | 150 XP | 50 XP |
| ▲ Hard | +25% | 225 XP | 100 XP |

**Sweep totals:** Easy = 325 XP, Normal = 500 XP, Hard = 775 XP.

Can mix difficulties across the 3 bounties. Each is independent.

#### Timing

- Appear Monday 12:00 AM (user's local timezone)
- Expire Sunday 11:59 PM
- Progress is real-time (updates as you log)
- XP awards immediately when threshold crossed

#### Group Visibility

Group members can see checkmarks per member per bounty. Completions visible; failures visible if you look, but never pushed/broadcasted.

---

### 3.3 Custom Challenges (formerly 75-Day)

**Format:** Daily checklist challenge with configurable duration.

#### Structure

- **Duration:** Any length. Default 75 days.
- **Scope:** Solo or group.
- **Metrics:** Plain text checkboxes, daily boolean.
  - Some auto-check from existing data (e.g., "Completed a workout" ✓ if workout logged today, "Hit 7,500 steps" ✓ from wearable sync)
  - Others are manual honor-system taps (e.g., "No alcohol", "Drank 100oz water")
- **Pass condition:** All metrics every day (strict).
- **Failure mode:** Configurable by challenge creator:
  - **Shared fate:** One member fails a day → challenge dies for the group
  - **Individual:** Your failure is yours, others continue

#### Habit Tracking Lives Here

v2 cuts daily habit tracking from the main UI. Habits (water, alcohol, custom) **only surface as trackable if you're in a custom challenge that uses them.** This keeps the daily UX clean while preserving the accountability mechanic for those who opt in.

#### Limit

Max 1 active custom challenge per user.

#### Reward

2,500 XP + cosmetic badge on completion.

---

### 3.4 Group Challenges

- **Cadence:** Weekly (leader sets it)
- **Format:** Metric + target (steps, XP, workouts, volume, etc.)
- **Modes:** Collaborative (party works toward shared goal) or competitive (leaderboard within group)
- **Limit:** Max 1 per group at a time
- **Reward:** 100 XP on completion
- **Difference from bounties:** Bounties are solo/PvE, group challenges are multiplayer/co-op. Leader-driven vs system-driven.

---

### 3.5 Duels

**Purpose:** 1v1 competition. Friendly rivalry and accountability.

#### Formats

- **Time-boxed:** 24 hours, 7 days, or 30 days
- **Race-to-target:** First to X wins (e.g., "first to 50,000 steps")

#### Metrics

Any: steps, XP earned, specific exercise volume, workouts completed, weight lifted, etc.

#### Flow

1. Challenger creates duel (picks format, metric, duration/target)
2. Sends to recipient
3. Recipient accepts or ignores (no obligation)
4. Progress tracked in real-time on Arena
5. Winner gets XP + win recorded on profile

#### Limits

- Max 3 active duels per user
- Win/loss record displayed on public profile

#### Reward

200 XP for winner. Cosmetic win/loss record.

---

### 3.6 Social Visibility

| Event | Visibility |
|---|---|
| Bounty completion | Checkmark visible on board (passive) |
| Challenge progress | Progress bars visible to group (passive) |
| Duel result | Visible on Arena (passive) |
| Completions & milestones | Active notification to group |
| Failures | Visible if you look, never pushed/broadcasted |

**Philosophy:** Passive visibility creates accountability. Active notifications celebrate. Failure is never shamed.

---

## 4. Visual Direction — "Polished Retro"

### 4.1 North Star

Dead Cells menu UI meets Pokémon badge collection. Modern layout. Retro soul.

### 4.2 Two-Layer System

| Layer | Style | Where |
|---|---|---|
| **Data Layer** | Modern, minimal, high-contrast | Numbers, progress bars, lists, workout UI, nutrition input |
| **Identity Layer** | Pixel art, 16-bit inspired | Rank badges, theme banners, Power Level frame, celebrations, bounty board |

**The rule:** If you're reading it to make a decision, it's modern. If it's making you feel something, it's pixel art.

### 4.3 Theme = App-Wide Color Palette

| Theme | Primary | Accent | Vibe |
|---|---|---|---|
| Draconic | Deep red (#991B1B) | Gold (#F59E0B) | Ember glow, molten |
| Samurai | Indigo (#312E81) | Cherry blossom pink (#EC4899) | Night temple |
| Viking | Steel blue (#1E3A5F) | Ice white (#E0F2FE) | Frozen north |
| Apex Predator | Forest green (#14532D) | Amber (#D97706) | Jungle, primal |
| Athlete | Navy (#1E293B) | Clean white (#F8FAFC) | Classic, pro |

**Base (shared):** Background stays dark (zinc-900/950). Cards stay zinc-800. Only accents and identity elements change per theme.

**Classic mode = Athlete theme.** Same design system, neutral flavor. Still has pixel Power Level number and rank badges, but in a clean pro-sport style.

### 4.4 Typography

| Use | Font | Rule |
|---|---|---|
| Power Level number | Press Start 2P (or similar pixel font) | The score. Must feel like a game. |
| Section headers | Silkscreen or Pixelify Sans | Retro but readable at medium sizes |
| Body / data | Inter (system fallback) | Never sacrifice readability |

**Pixel fonts only at 24px+.** Below that, always Inter.

### 4.5 Pixel Art Assets Required

| Asset | Count | Notes |
|---|---|---|
| Rank badges | 25 | 5 levels × 5 themes (16×16 or 32×32) |
| Theme banners | 5 | Full-width header per theme |
| Power Level tier frames | 5 | Bronze → Diamond (tinted per theme) |
| Celebration splashes | ~5 variants | Rank-up, bounty sweep, challenge win |
| Bounty board UI | 1 set | Bulletin board, thumbtacks, "COMPLETE" stamp |

**Source:** AI-generated pixel art + open-source sprite packs.

### 4.6 Key Visual Components

**Power Level Frame:** Pixel-art border evolving with tier. Animated pulse at Platinum+.

**Rank Badges:** Per-theme pixel icons next to each exercise on Power Level screen.

**Theme Banner:** Full-width pixel art header (dragon, longship, torii gate, jungle, stadium).

**Bounty Board:** Pixel-art bulletin board with pinned bounty cards. Completed = red stamp.

**Celebrations:** Full-screen pixel art splash (1–2 seconds). Per-theme variants. Think Pokémon evolution screen.

### 4.7 What Stays Modern

- Active workout UI (sets, reps, weight, timer)
- Nutrition text input
- Arena challenge cards (progress bars, member lists)
- Navigation bar
- Settings/profile forms
- All text-heavy content

---

## 5. Navigation

**Bottom bar (3 tabs):**

| Icon | Label | Route |
|------|-------|-------|
| 🏆 | Power Level | `/` (home) |
| ⚔️ | Arena | `/arena` |
| 💪 | Train | `/train` |

**Top header:** App logo (left), profile avatar (right → taps to profile/settings).

---

## 6. Screens

### 6.1 Power Level (Home)

- Power Level number (pixel font, large) with letter grade in pixel badge
- Power Level tier frame (Bronze → Diamond)
- Theme banner (pixel art)
- Closest rank-ups (2–3 exercises nearest threshold, with CTA to train them)
- Expiring exercises (⚠️ countdown — "retest" prompts)
- Recent PRs (last 7 days)
- XP progress bar (Player Level + what unlocks next)
- Today's wearable sync summary (steps, calories, sleep) — informational only

### 6.2 Arena

- Active custom challenge (top card, daily checklist, progress)
- Group challenge (party progress)
- Active duels (progress bars, opponent vs you)
- Weekly bounties (bounty board with difficulty selectors)
- Past results (collapsed)

### 6.3 Train

- Today's scheduled workout (hero card, one "Start" button)
- If completed: workout summary with rank-ups and XP
- This week (Mon–Sun with completion status)
- Quick Log (log a run, lift, or any exercise outside program)
- Nutrition AI input (always-visible: "What did you eat?" → AI estimates → logged)

---

## 7. Simplified Nutrition

- Single text input: "What did you eat?"
- AI estimates macros (protein, carbs, fat, calories)
- One-tap to log
- Photo option (camera → AI identifies food)
- No manual macro sliders, no meal cart, no serving adjusters
- Binary XP: tracked 3+ meals today = 50 XP

---

## 8. What's Cut from v1

| Feature | Reason |
|---------|--------|
| Habits / Daily Rites / Discipline | Lives only inside custom challenges now |
| Streaks / Heatmaps | Tied to removed habits system |
| Refactor Score | Competes with Power Level |
| Daily Quests / Weekly Quests | Replaced by bounties |
| Starter Quest onboarding | Replaced by 4-step flow |
| Body Recomp (full mode) | Weight kept for challenges only |
| Manual habit logging (water, sleep, steps) | Wearable handles synced; manual lives in custom challenges |
| Track page (5-tab layout) | Replaced by Train screen |
| Today tab (cluttered dashboard) | Replaced by Power Level home |
| Macro log modal / Meal cart / Serving adjusters | Replaced by AI text input |
| 242 ranked exercises | Reduced to 12 per path (48 total standards) |

---

## 9. Onboarding (New Users)

4 steps:
1. Sign up + liability waiver
2. Pick a theme (Athlete, Draconic, Samurai, Apex Predator, Viking)
3. Pick a training path (Hybrid, Strength, Endurance, Mobility & Calisthenics)
4. Connect wearable (HealthKit / Health Connect / WHOOP)

Land on Power Level screen (empty state: "Complete your first workout to discover your rank").

---

## 10. Open Questions (Post-v2)

- Specific XP unlock tiers (themes at level 5? challenge types at level 10?)
- XP wagering on duels?
- Leaderboards (global or friends-only)?
- Push notifications (challenge updates, expiration warnings)?
- Apple Watch complication showing Power Level?
- Run 5K standards need to be written for Endurance + Hybrid path
- L-Sit Hold standards need to be written for Mobility path

---

*This document is the north star for v2 development. All implementation decisions should reference this.*
