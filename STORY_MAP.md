# Refactor Athletics — Story Map

> A gamified fitness tracker where real-world progress drives in-game power. Users track workouts, macros, and habits while earning XP, climbing ranks, and competing with friends.

## Vision

Refactor Athletics is a macro, workout, and habit tracker wrapped in an RPG progression system. Users choose a training path that determines which exercises contribute to their Power Level. They pick a theme that shapes their rank names and visual identity. As users train in the real world, they grow stronger in the game.

Users can party up with friends, compete in duels, and tackle group challenges. The RPG layer is opt-in — users can use the app purely as a tracker in Classic mode.

**Core Principle:** The good habits users track in the real world have benefits in the game. Every rep, every macro logged, every streak maintained makes the user's character stronger.

**Future Vision:** Story mode, PvE combat, AI Game Master, and deeper character customization will layer on top of the core tracker in V2+.

---

## Backbone (User Journey)

| # | Activity | Description | V1 Status |
|---|----------|-------------|-----------|
| 1 | Discover & Onboard | First experience, sign up, waiver | ✅ Complete |
| 2 | Choose Identity | Path, theme, experience mode | ✅ Complete |
| 3 | Program Training | Default or custom workout programs | ✅ Complete |
| 4 | Track Daily | Log workouts, macros, habits | ✅ Complete |
| 5 | Grow Stronger | Level up, Power Level, PRs, streaks | ✅ Complete |
| 6 | Join Party | Team up with friends | ✅ Complete |
| 7 | Compete | Duels, challenges, bragging rights | ✅ Complete |
| 8 | Sync Health | HealthKit, WHOOP, Health Connect | ✅ Web / 🔧 Native |
| 9 | Go Premium | Subscription, paywall, gating | 🔧 Not started |

---

## Release Plan

### V1 — iOS App Store: "The Gamified Tracker"
> Ship date target: June 2026
> A fully functional gamified fitness tracker with RPG progression and social features.

#### What's Built (Web/PWA — ready to wrap in Capacitor)

| Activity | Feature | Status |
|----------|---------|--------|
| **Onboard** | Sign up with email/password | ✅ |
| | 10-step onboarding wizard (waiver, mode, path, theme, equipment, goals, health sync) | ✅ |
| | Liability waiver with acceptance tracking | ✅ |
| **Identity** | Choose preset path (Hybrid, Strength, Endurance, Mobility) | ✅ |
| | Select theme (Athlete, Draconic, Samurai, Apex Predator, Viking) | ✅ |
| | Experience mode toggle (RPG / Classic) | ✅ |
| | View exercises contributing to Power Level | ✅ |
| **Program** | View/create/edit workout programs | ✅ |
| | Add exercises + treadmill/cardio blocks | ✅ |
| | Schedule programs to calendar | ✅ |
| **Track** | Active workout with timer, sets, rest timer | ✅ |
| | Log exercise sets (weight, reps, time, distance) | ✅ |
| | Equipment variant picker (barbell/dumbbell/smith) | ✅ |
| | Plate calculator for barbell exercises | ✅ |
| | Live rank nudge + rank-up celebration | ✅ |
| | Workout report on completion | ✅ |
| | Screenshot auto-log via Claude | ✅ |
| | Workout text parser | ✅ |
| | Log macros (protein, carbs, fat, water, calories burned) | ✅ |
| | Auto-calculate calories + net calorie deficit | ✅ |
| | Log habits (steps, sleep, strain, recovery, HRV, etc.) | ✅ |
| | Vice tracking (no alcohol, no vice streaks) | ✅ |
| | Body composition (tape + scale modes, per-region) | ✅ |
| **Grow** | Earn XP from all activities | ✅ |
| | Player Level (exponential XP curve) | ✅ |
| | Power Level from performance thresholds | ✅ |
| | Attribute balance radar (STR/END/PWR/MOB) | ✅ |
| | PR detection + celebration | ✅ |
| | Consistency heatmaps (week/month/year) | ✅ |
| | Streak tracking per habit | ✅ |
| **Party** | Create group with invite code | ✅ |
| | Join group via `/join/[code]` | ✅ |
| | View party members + combined stats | ✅ |
| | Group challenges (weekly metrics) | ✅ |
| **Compete** | Challenge friend to duel | ✅ |
| | Accept/decline/track duels | ✅ |
| | Public challenges with join pages | ✅ |
| | Weekly community challenges | ✅ |
| **Health Sync** | WHOOP OAuth (strain, recovery, HRV, sleep, calories) | ✅ |
| | Health Connect webhook (12 data types) | ✅ |
| | Google Health Connect OAuth | ✅ |
| | Manual sync via Apple Shortcuts / HTTP | ✅ |
| | Auto-sync on dashboard load + daily cron | ✅ |
| **App Store Req** | Privacy policy (`/privacy`) | ✅ |
| | Terms of service (`/terms`) | ✅ |
| | Account deletion (Settings → Delete) | ✅ |

#### What Must Be Built for iOS v1

| # | Work Item | Effort | Priority |
|---|-----------|--------|----------|
| 1 | Install Capacitor packages, generate Xcode project | 1 day | P0 |
| 2 | Configure build (static export or server URL approach) | 1 day | P0 |
| 3 | HealthKit integration via `@capgo/capacitor-health` | 2 days | P0 |
| 4 | RevenueCat integration + paywall component | 2 days | P0 |
| 5 | Splash screen + app icon + status bar config | 0.5 day | P0 |
| 6 | Haptic feedback (rank-ups, set completions) | 0.5 day | P1 |
| 7 | TestFlight build + internal testing | 1 day | P0 |
| 8 | App Store metadata, screenshots, review notes | 1 day | P0 |
| 9 | Submit for review | — | P0 |
| | **Total estimated effort** | **~9 days** | |

#### Architecture Decision: Server URL Approach
The native app uses Capacitor's `server.url` pointing to `https://refactorathletics.com`. The app is a WebView wrapper around the deployed Vercel site with native plugin access for HealthKit, haptics, and payments. API routes continue to run on Vercel. No static export required.

---

### V2 — Enhanced RPG (Post-Launch)
> Richer progression, character customization, and deeper social features.

| Activity | Feature | Priority |
|----------|---------|----------|
| **Character** | Character avatar system (SVG base + gear overlays) | P1 |
| | Gear shop (unlock with Career XP) | P1 |
| | Power Level tier → visual appearance | P1 |
| **Compete** | Leaderboards | P2 |
| | Badges/achievements | P2 |
| **Track** | Push notifications (streak reminders, challenge updates) | P1 |
| | Deep links for group invites | P2 |
| **Identity** | Custom path creation (select contributing exercises) | P2 |
| | Character naming | P2 |
| **Grow** | PR dashboard (history over time) | P1 |
| | Unlock celebrations/animations | P2 |

---

### V3 — Story Mode & Combat (Future)
> Narrative progression and cooperative PvE encounters.

| Activity | Feature |
|----------|---------|
| **Story** | Linear narrative chapters (text-based) |
| | AI Game Master narration (Anthropic-powered) |
| | Story progression tied to Player Level |
| | Light branching choices |
| **Combat** | Weekly PvE encounters |
| | D&D-style combat mechanics (character stats as inputs) |
| | Party-based encounters |
| | Abilities unlocked by progression |
| | Encounter rewards (bonus XP, cosmetics) |
| **Social** | Party chat/messaging |
| | Party vs Party battles |
| | Tournaments / seasonal rankings |

---

## Systems Reference

### Path System
| Path | Training Focus | RPG Archetype |
|------|---------------|---------------|
| Hybrid | Strength + Power + Endurance | Paladin |
| Strength | Heavy lifting, max effort | Fighter / Tank |
| Endurance | Cardio, conditioning | Ranger |
| Mobility | Flexibility, bodyweight | Monk |

### Theme System
| Theme | Tier Names (1→5) |
|-------|-------------------|
| Athlete | Rookie → Varsity → All-Star → Pro → Hall of Fame |
| Draconic | Hatchling → Whelp → Drake → Wyrm → Ancient Dragon |
| Samurai | Ronin → Samurai → Daimyo → Shogun → Legendary Warrior |
| Apex Predator | Fossil → Compy → Raptor → Allosaurus → T-Rex |
| Viking | Thrall → Warrior → Berserker → Jarl → Einherjar |

### Progression Systems
- **Power Level** — Performance-based. Sum of max rank level per exercise in user's path. Drives competitive standing.
- **Player Level / Career XP** — Consistency-based. Earned from all activities. Never spent. Drives unlocks (V2).
- **Streaks** — Consecutive days of positive habits. Displayed on dashboard and profile.
- **Personal Records** — Best performance per exercise. Detected and celebrated in real-time.

### Monetization
See `MONETIZATION_DESIGN.md` for full details.
- **Free ("Recruit"):** Core tracker, macros, habits, rank calculator, Power Level, 1 program
- **Premium ("Elite") $7.99/mo or $59.99/yr:** RPG mode, unlimited programs, AI features, Arena, Groups, heatmaps
- **Native:** RevenueCat (Apple/Google IAP)
- **Web:** Stripe Checkout

---

*Last updated: May 18, 2026*

---

## Backlog — UX Redesign

### Onboarding Checklist (Replace Sequential Quest Locks)

**Problem:** The starter quest system gates features behind sequential completion (First Strike → Choose Identity → Fuel Up → etc.). Users see "Complete Fuel Up to unlock" but can't see what Fuel Up is or how to get there. This creates confusion and feels punishing rather than guiding.

**Proposed Solution:** Replace locked overlays with a visible onboarding checklist:
- Show all quests as a progress list (checkmarks for completed, highlight for current)
- All features remain accessible immediately (no locks)
- Completing quests earns XP bonuses and shows celebratory feedback
- Checklist appears as a card on the Today tab until all quests are done
- Optional: gentle nudges ("You haven't logged a meal yet — try it!") instead of hard blocks

**Acceptance Criteria:**
- [ ] All dashboard features visible without completing quests
- [ ] Checklist card shows full quest chain with progress
- [ ] Tapping a quest navigates to the relevant action
- [ ] Completing a quest shows XP reward + checkmark animation
- [ ] Checklist auto-hides once all quests complete
- [ ] No regression for existing users with progress

**Priority:** P1 (impacts new user experience)
**Effort:** 4-6 hours
