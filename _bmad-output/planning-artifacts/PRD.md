---
title: Refactor Athletics
created: 2026-05-18
updated: 2026-05-18
---

# PRD: Refactor Athletics

## 0. Document Purpose

This PRD defines the product scope, target users, and success criteria for Refactor Athletics v1 (iOS App Store release). It is the single source of truth for the PM, developer, and any future contributors. It builds on existing artifacts: `STORY_MAP.md` (user journey and release plan), `MONETIZATION_DESIGN.md` (payment strategy), `CHARACTER_CREATION_DESIGN.md` (V2 character system), `release_backlog.md` (iOS technical phases), and `skills.md` (developer guardrails). Those documents remain authoritative for their specific domains; this PRD captures the *what* and *why* at the product level.

## 1. Vision

Refactor Athletics is a gamified fitness tracker that turns real-world training into RPG progression. Users log workouts, macros, and habits — earning XP, climbing ranks, and growing their Power Level. The app assigns performance-based ranks by comparing lifts against demographic standards (age, sex, bodyweight), creating a competitive progression system that rewards both consistency and performance.

The RPG layer is opt-in. Users who prefer a clean tracker can select Classic mode and get the same underlying math without the gamification language. Users who want the full experience choose a theme (Samurai, Viking, Draconic, etc.) and a training path (Strength, Endurance, Hybrid, Mobility) that shapes which exercises contribute to their Power Level.

Social features — groups, duels, and challenges — create accountability and competition. Health integrations (WHOOP, Health Connect, Google Health) automate habit tracking. The combination of serious fitness tracking with engaging game mechanics creates a product that's sticky where pure trackers fail: the daily engagement loop.

## 2. Target User

### 2.1 Primary Persona

**Alex, 28, intermediate lifter.** Trains 4-5x/week. Has used Strong or Hevy but finds them boring after 3 months. Wants to see progress quantified beyond just "weight went up." Competitive — enjoys leaderboards and challenges with friends. Tracks macros inconsistently because existing apps feel like a chore. Owns an iPhone and an Apple Watch or WHOOP.

### 2.2 Jobs To Be Done

- **Functional:** Track my workouts with minimal friction so I can see progress over time
- **Functional:** Know where I stand relative to my potential (rank/level system)
- **Emotional:** Feel like I'm making progress even on days I don't PR
- **Social:** Compete with friends without needing to be in the same gym
- **Contextual:** Log everything in one place (workouts, food, habits, body comp) instead of 4 apps

### 2.3 Non-Users (v1)

- Complete beginners who don't know exercise names or proper form (no instructional content)
- Users seeking AI-generated workout programs (programs are manual/preset, not generated)
- Users who want a pure calorie counter (nutrition is secondary to training)
- Users who want a narrative RPG experience (story mode is V3)

### 2.4 Key User Journeys

- **UJ-1. Alex logs his first workout and sees his rank.**
  - **Entry state:** New user, just completed onboarding (path: Hybrid, theme: Viking).
  - **Path:** Opens Train tab → sees today's scheduled program → taps Start → logs 3 sets of Back Squat (315×5, 315×3, 295×5) → completes block.
  - **Climax:** Block Complete overlay shows: Back Squat → Level 3 "Berserker" rank, +274 XP, "🔥 45 lbs to Jarl."
  - **Resolution:** Returns to Mission HUB, sees section progress at 33%. Motivated to continue.

- **UJ-2. Alex checks his daily progress across all domains.**
  - **Entry state:** Authenticated, opens app mid-afternoon.
  - **Path:** Dashboard loads → sees Power Level, today's goals (steps: 8,200/10,000, protein: 120/180g), current streak (12 days).
  - **Climax:** Green highlights on completed goals. Sees he's 2,000 steps short — decides to walk after dinner.
  - **Resolution:** Taps Track tab to log afternoon protein shake.

- **UJ-3. Alex challenges his friend to a duel.**
  - **Entry state:** In Arena tab, friend is in same group.
  - **Path:** Taps "Challenge" on friend's card → selects metric (total volume this week) → sets duration (7 days) → sends challenge.
  - **Climax:** Friend accepts. Both see live progress throughout the week.
  - **Resolution:** Winner gets bragging rights + bonus XP. Loser gets motivated.

## 3. Glossary

- **Power Level** — Sum of max rank level achieved per exercise in the user's chosen path. Represents overall fitness achievement. Range: 0–6,000 theoretical max.
- **Rank** — Performance tier (Level 0–5) assigned per exercise by comparing the user's best effort against demographic standards. Themed names vary by theme (e.g., "Berserker" = Level 3 in Viking theme).
- **Career XP** — Cumulative experience points earned from all activities. Never spent. Drives Player Level and future unlocks.
- **Player Level** — Derived from Career XP using exponential curve (1000 × 1.08^level). Represents consistency/dedication.
- **Path** — Training focus that determines which exercises contribute to Power Level. Options: Hybrid, Strength, Endurance, Mobility.
- **Theme** — Visual/narrative skin that changes rank names and UI accents. Does not affect mechanics.
- **Experience Mode** — RPG (full gamification) or Classic (clean tracker). Same math, different labels.
- **Block** — A single exercise or superset within a workout session. The atomic unit of workout progress.
- **Section** — A group of related blocks (e.g., "Strength Protocol", "Engine", "Core Work") within a workout.
- **Normalization Factor** — Equipment conversion multiplier (Dumbbell: 1.15, Smith: 0.85, Barbell: 1.0) applied before rank comparison.

## 4. Features

### 4.1 Workout Tracking

**Description:** Users log exercise sets with weight, reps, and/or duration. The system calculates rank, XP, and detects PRs in real-time. Supports active workout flow (Mission HUB → block-by-block progression), screenshot auto-log via Claude, and workout text parsing. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Log exercise sets
User can log sets with weight/reps (strength), duration (cardio), or reps-only (bodyweight). System calculates e1RM via Epley formula for weight exercises.

**Consequences:**
- Workout saved to `workouts` table with exercise_id, sets array, rank, level, XP, raw_value, session_id
- XP calculated as: (level × 50) + per-set volume XP × xp_factor
- Equipment normalization applied before rank comparison

#### FR-2: Real-time rank calculation
After each block completion, system compares best effort against demographic standards (age/sex brackets) and assigns Level 0–5.

**Consequences:**
- Rank displayed immediately in Block Complete overlay
- "Next rank" nudge shown during sets when user is within striking distance
- PR detection: if raw_value exceeds all-time best for that exercise, flag as PR

#### FR-3: Active workout flow
User progresses through a structured workout via Mission HUB (section overview) and WORKOUT view (individual blocks).

**Consequences:**
- Progress persisted to localStorage (survives app close/crash)
- Completed blocks restored from database on reload
- Session ID groups all sets logged in one workout

#### FR-4: Screenshot auto-log
User uploads a fitness screenshot (Apple Watch, WHOOP, gym display). Claude extracts structured data.

**Consequences:**
- Extracted data presented for confirmation before saving
- Few-shot examples from `screenshot_examples` table improve accuracy

### 4.2 Nutrition Tracking

**Description:** Users log macros (protein, carbs, fat), water, and calories burned. Calories auto-calculated from macros. Net calorie deficit tracked daily and weekly. Realizes UJ-2.

**Functional Requirements:**

#### FR-5: Log macros
User can log protein, carbs, fat, water, and calories burned. Calories = protein×4 + carbs×4 + fat×9.

**Consequences:**
- Stored in `nutrition_logs` table with date, macro_type, amount
- XP: 2 per entry, capped at 30/day
- Calories burned uses "set" mode (replaces, not adds)

#### FR-6: Deficit tracking
System calculates net calories (in - burned) daily and weekly with visual bar chart.

**Consequences:**
- Weekly view shows deficit target line
- Dashboard shows daily net calorie summary

### 4.3 Habit Tracking

**Description:** Users track daily habits (steps, sleep, water, strain, recovery, HRV, resting HR, no-alcohol, no-vice, etc.) with customizable targets and visibility. Realizes UJ-2.

**Functional Requirements:**

#### FR-7: Log and track habits
User can log habit values, view streaks, and see consistency heatmaps (week/month/year).

**Consequences:**
- Stored in `habit_logs` table
- XP varies by habit type (steps: 0.005×value, sleep: 2×hours, etc.)
- Streak calculated as consecutive days with value logged
- Heatmap persists view preference in localStorage

#### FR-8: Health sync automation
Habits auto-populated from connected wearables (WHOOP, Health Connect, Google Health).

**Consequences:**
- WHOOP: strain, recovery, HRV, sleep, calories burned, resting HR
- Health Connect: steps, weight, body composition (12 data types)
- Data priority: WHOOP for sleep/calories/HRV; Health Connect for steps/weight
- Auto-sync on dashboard load + daily Vercel cron (6 AM UTC)
- Per-user timezone prevents duplicate entries

### 4.4 Body Composition

**Description:** Users track body measurements in two modes: Tape (inches) and Scale (per-region muscle/fat). Physique Points calculated from non-null metrics.

**Functional Requirements:**

#### FR-9: Log body measurements
User can log in Tape mode (weight, waist, arms, chest, legs, shoulders) or Scale mode (weight, body fat %, per-region muscle lbs and fat %).

**Consequences:**
- Upserts per date (no duplicate rows)
- Supports delete individual and reset all
- Health metrics (lean body mass, VO2 max, BMR, height) synced from wearables

### 4.5 Progression System

**Description:** Multi-layered progression: Power Level (performance), Player Level (consistency), attribute balance (STR/END/PWR/MOB), and streaks. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-10: Power Level calculation
Sum of max_level per exercise in user's path. Queries only `workouts` table.

**Consequences:**
- Displayed on dashboard, profile, and in duels
- Only exercises matching user's selected path contribute

#### FR-11: Attribute balance
Radar chart categorizes logged exercises into STR, END, PWR, MOB based on exercise category.

**Consequences:**
- Updates after each workout
- Visible on profile and Power Level page

### 4.6 Social & Competition

**Description:** Users create/join groups, challenge friends to duels, and participate in weekly challenges. Realizes UJ-3.

**Functional Requirements:**

#### FR-12: Groups
User can create a group, generate invite code, invite friends via `/join/[code]`.

**Consequences:**
- Group challenges: weekly metric targets for all members
- Leader can kick members
- Members see combined stats

#### FR-13: Duels
User can challenge another user to a metric-based competition over a set duration.

**Consequences:**
- Both users see live progress
- Winner determined at expiry
- History preserved

#### FR-14: Public challenges
Community-wide challenges with shareable join pages at `/challenges/[id]`.

### 4.7 Onboarding

**Description:** 10-step guided setup for new users. Realizes UJ-1 (prerequisite).

**Functional Requirements:**

#### FR-15: Onboarding wizard
New user completes: waiver → mode selection → intro → theme → path → personal info → goals → equipment → quest settings → health sync.

**Consequences:**
- Waiver acceptance tracked with timestamp (required before proceeding)
- All selections saved to user profile
- Health sync step connects wearables (optional, can skip)

### 4.8 Subscription & Monetization

**Description:** Freemium model with "Recruit" (free) and "Elite" (premium) tiers. Native payments via RevenueCat, web payments via Stripe. Both write to same `subscription_status` field. See `MONETIZATION_DESIGN.md` for full details.

**Functional Requirements:**

#### FR-16: Premium gating
Features gated behind `useSubscription()` hook checking `subscription_status` from Supabase.

**Consequences:**
- Free: core tracking, 1 program, rank calculator, Power Level
- Premium ($7.99/mo or $59.99/yr): RPG mode, unlimited programs, AI features, Arena, Groups, heatmaps
- Platform-aware UpgradeCTA (Stripe on web, RevenueCat on native)

#### FR-17: Subscription management
Users can manage billing via Stripe Customer Portal (web) or App Store/Google Play settings (native).

**Consequences:**
- Restore purchases flow on native (App Store requirement)
- Webhook updates `subscription_status` on purchase/cancel/expiry

## 5. Non-Goals (Explicit)

- **Not a coaching app** — no form videos, no AI-generated programs, no periodization advice
- **Not a social network** — no feed, no posts, no messaging (V2 consideration)
- **Not a narrative RPG in v1** — no story chapters, no combat, no AI Game Master
- **Not a calorie-first app** — nutrition supports training goals, not the other way around
- **Not cross-platform native in v1** — iOS first, Android follows (2-3 days after iOS launch)

## 6. MVP Scope

### 6.1 In Scope (iOS v1)
- All features in §4 that are currently implemented (see STORY_MAP.md status column)
- Capacitor native shell (WebView → Vercel deployment)
- HealthKit integration via `@capgo/capacitor-health`
- RevenueCat paywall + subscription gating
- Native polish: splash screen, app icon, status bar, haptics
- App Store requirements: privacy policy, terms, account deletion, metadata, screenshots
- TestFlight beta → App Store submission

### 6.2 Out of Scope for MVP
- Story mode / narrative chapters [NON-GOAL for MVP — V3]
- PvE combat / encounters [NON-GOAL for MVP — V3]
- AI Game Master [NON-GOAL for MVP — V3]
- Character avatar system [deferred to V2 — needs art assets]
- Custom path creation [deferred to V2]
- Push notifications [deferred to V2 — nice-to-have, not blocking]
- Android release [follows iOS by 2-3 days — same codebase]
- Leaderboards [deferred to V2]
- Party chat/messaging [deferred to V2]

## 7. Success Metrics

**Primary**
- **SM-1**: Day-7 retention ≥ 40% — users return 7 days after first workout. Validates FR-1, FR-7, FR-10.
- **SM-2**: Workouts logged per active user per week ≥ 3 — core engagement. Validates FR-1, FR-3.
- **SM-3**: Free-to-paid conversion ≥ 5% within 30 days — monetization viability. Validates FR-16.

**Secondary**
- **SM-4**: Onboarding completion rate ≥ 70% — funnel health. Validates FR-15.
- **SM-5**: Health sync connection rate ≥ 30% of users — automation adoption. Validates FR-8.
- **SM-6**: Group creation rate ≥ 15% of users — social stickiness. Validates FR-12.

**Counter-metrics (do not optimize)**
- **SM-C1**: Session duration — longer is not better. A 2-minute log session is ideal. Counterbalances SM-2.
- **SM-C2**: Premium feature usage breadth — users don't need to use ALL premium features. One sticky feature justifies the subscription. Counterbalances SM-3.

## 8. Open Questions

1. **Grandfathering:** Should early beta users get lifetime premium access? If so, how many and how identified?
2. **Free trial duration:** 14-day (current plan) vs 7-day — which converts better? Need A/B test post-launch.
3. **App Store category:** "Health & Fitness" is obvious, but should we also list under "Games > Role Playing"?
4. **HealthKit write-back:** Should completed workouts be written TO HealthKit? (Phase 2.8 in release_backlog, P2 priority)
5. **Offline behavior:** The server URL approach requires internet. What's the degraded experience when offline?

## 9. Assumptions Index

- [ASSUMPTION §4.1] Screenshot auto-log accuracy is sufficient for user trust (Claude few-shot approach)
- [ASSUMPTION §4.3] WHOOP/Health Connect APIs remain stable and free for our usage level
- [ASSUMPTION §4.8] RevenueCat remains free under $10k/mo tracked revenue
- [ASSUMPTION §6.1] Server URL approach (WebView → Vercel) passes App Store review without issues
- [ASSUMPTION §6.1] Capacitor WebView performance is acceptable for the workout timer UX
- [ASSUMPTION §7] 40% D7 retention is achievable given gamification layer (industry avg for fitness apps: 25-30%)

---

## Constraints and Guardrails

### Technical
- **Stack:** Next.js 16, React 19, Supabase (PostgreSQL), Tailwind CSS 4, Capacitor 6
- **Hosting:** Vercel (web + API routes), App Store (native shell)
- **AI:** Anthropic Claude (screenshot parsing, future Game Master)
- **Payments:** RevenueCat (native IAP) + Stripe (web) — unified via `subscription_status`
- **Health:** `@capgo/capacitor-health` (HealthKit + Health Connect unified API)

### Privacy & Safety
- HealthKit data never leaves the device except to write to user's own Supabase row
- No social sharing of health data without explicit user action
- Account deletion removes ALL user data (App Store requirement since 2022)
- Waiver acceptance required before any tracking begins

### Cost
- Apple Developer Program: $99/year
- RevenueCat: $0 (free tier)
- Stripe: 2.9% + $0.30 per web transaction
- Vercel: current plan sufficient
- Total year 1: ~$124 fixed + variable Stripe fees

---

## Platform

- **v1:** iOS (Capacitor WebView → Vercel) + Web/PWA (existing)
- **v1.1:** Android (Capacitor — same codebase, 2-3 day effort)
- **Future:** Native performance optimizations if WebView proves insufficient

---

## Monetization

See `MONETIZATION_DESIGN.md` for full implementation details.

| | Free ("Recruit") | Premium ("Elite") |
|---|---|---|
| Price | $0 | $7.99/mo or $59.99/yr |
| Core tracking | ✅ | ✅ |
| Programs | 1 | Unlimited |
| RPG mode | ❌ | ✅ |
| AI features | ❌ | ✅ |
| Arena/Groups | ❌ | ✅ |
| Heatmaps/Streaks | ❌ | ✅ |
