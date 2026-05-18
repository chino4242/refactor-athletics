# Architecture: Refactor Athletics

> Created: 2026-05-18 | Status: Living document

## 1. System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         Users                                    │
│   iOS App (Capacitor WebView)  │  Web Browser (PWA)             │
└──────────────┬─────────────────┴────────────────┬───────────────┘
               │                                  │
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js 16)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  App Router  │  │ Server       │  │  API Routes           │ │
│  │  (Pages/UI)  │  │ Actions      │  │  (Integrations)       │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │
└─────────┼──────────────────┼──────────────────────┼─────────────┘
          │                  │                      │
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase                                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Auth   │  │  PostgreSQL  │  │  Row Level Security      │  │
│  └──────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

External Services:
  ├── WHOOP API (OAuth2 → strain, recovery, HRV, sleep)
  ├── Google Health Connect (OAuth2 → steps, weight, body comp)
  ├── Health Connect Webhook (token auth → 12 data types)
  ├── Anthropic Claude (screenshot parsing, food parsing)
  └── RevenueCat / Stripe (payments — see MONETIZATION_DESIGN.md)
```

## 2. Architecture Decisions

### ADR-1: Server URL approach for native app
**Decision:** The iOS app is a Capacitor WebView pointing to `https://refactorathletics.com`. No static export.

**Context:** Next.js API routes, server actions, and middleware don't work in static export mode. Building a separate API layer would double the work.

**Consequences:**
- App requires internet connection (no offline-first for native)
- Deployment is instant — push to Vercel, native app gets updates immediately
- No App Store review needed for content/feature changes
- Native plugins (HealthKit, haptics, payments) still work via Capacitor bridge

### ADR-2: Server Actions for writes, service files for reads
**Decision:** All mutations go through Next.js Server Actions (`src/app/actions.ts`). All reads go through client-side service files (`src/services/api.ts`, `groupApi.ts`, `workoutApi.ts`).

**Context:** Server Actions provide automatic revalidation and run server-side (secure). Reads are client-side for responsiveness and caching.

**Consequences:**
- Clear separation: if it changes data, it's a Server Action
- Service files can be called from any component without prop drilling
- Server Actions have access to `cookies()` for timezone-aware date handling

### ADR-3: Supabase for auth + database + RLS
**Decision:** Single backend: Supabase handles authentication, PostgreSQL database, and row-level security.

**Context:** Eliminates need for a custom backend. RLS ensures users can only access their own data without application-level checks.

**Consequences:**
- `catalog` table is public-read (RLS: `true`), service-role-write
- All user data tables enforce `auth.uid() = user_id`
- Service role key used only in scripts and cron jobs
- PostgREST schema cache requires restart after migrations

### ADR-4: API routes only for external integrations
**Decision:** API routes (`/api/*`) exist only for OAuth callbacks, webhooks, cron jobs, and AI integrations — not for internal CRUD.

**Context:** Internal data operations use Server Actions (writes) or direct Supabase client calls (reads). API routes handle things that need raw HTTP (webhooks, OAuth redirects, external service calls).

**Consequences:**
- Middleware excludes `/api/sync` and `/api/cron` from auth (they use their own auth: tokens, CRON_SECRET)
- OAuth flows (WHOOP, Google Health) use standard redirect pattern
- AI routes (parse-screenshot, food-parse) call Anthropic/OpenAI server-side

### ADR-5: No global state management library
**Decision:** Use React Context for cross-cutting concerns (theme, experience mode, toast), component-local state for everything else, and custom hooks for complex state (e.g., `useWorkoutSession`).

**Context:** The app is primarily server-rendered pages with client islands. Most state is page-scoped. The active workout is the only complex cross-page state, handled via localStorage persistence.

**Consequences:**
- No Redux/Zustand dependency
- Active workout state persists via localStorage (survives navigation and app close)
- If offline-first becomes a requirement, revisit this decision (would need Zustand + sync queue)

### ADR-6: Capacitor with Swift Package Manager
**Decision:** Capacitor 6+ with SPM for native plugin management (no CocoaPods).

**Context:** Capacitor 6 moved to SPM by default. Simpler dependency management, faster builds.

**Consequences:**
- Plugins declared in `ios/App/CapApp-SPM/Package.swift`
- No Podfile, no `pod install`
- Native plugin access via `@capacitor/*` packages in JS

## 3. Source Structure

```
src/
├── app/                          # Next.js App Router
│   ├── actions.ts                # All Server Actions (writes)
│   ├── layout.tsx                # Root layout (providers, nav)
│   ├── middleware.ts             # Session management
│   ├── api/                      # API routes (external integrations only)
│   │   ├── whoop/                # OAuth: auth, callback, sync
│   │   ├── google-health/        # OAuth: auth, callback, sync
│   │   ├── sync/                 # Health Connect webhook, manual sync
│   │   ├── cron/                 # Vercel cron (daily WHOOP sync)
│   │   ├── parse-screenshot/     # Claude screenshot → structured data
│   │   ├── food-search/          # Food database search
│   │   ├── food-parse/           # Claude food description → macros
│   │   ├── workout/              # Active workout data
│   │   ├── workouts/             # Program schedule, history, defaults
│   │   ├── public-challenges/    # Community challenges
│   │   └── account/              # Account deletion
│   ├── dashboard/                # Home screen (tabs: Today, Progress, Stats)
│   ├── train/                    # Active workout
│   ├── track/                    # Habits, nutrition, body comp
│   ├── arena/                    # Duels, challenges
│   ├── profile/                  # User profile, trophies
│   ├── power-level/              # Power Level detail page
│   ├── settings/                 # App settings, integrations
│   ├── character/                # Character editor (V2)
│   ├── login/                    # Auth pages
│   ├── join/[code]/              # Group invite landing
│   ├── challenges/[id]/          # Public challenge landing
│   ├── privacy/                  # Privacy policy
│   └── terms/                    # Terms of service
│
├── components/                   # React components
│   ├── active-workout/           # Decomposed workout system
│   │   ├── ActiveWorkout.tsx     # Orchestrator (339 lines)
│   │   ├── useWorkoutSession.ts  # State + logic hook
│   │   ├── ExerciseView.tsx      # Single exercise block
│   │   ├── SupersetView.tsx      # Multi-exercise block
│   │   ├── TimerView.tsx         # Cardio interval timer
│   │   ├── MissionHub.tsx        # Section overview (HUB view)
│   │   ├── BlockCompleteOverlay  # Post-block results
│   │   └── RestTimerBar.tsx      # Fixed rest timer
│   ├── dashboard/                # Dashboard tab components
│   ├── profile/                  # Profile sub-components
│   ├── arena/                    # Duel/challenge components
│   ├── challenges/               # Public challenge components
│   ├── character/                # Character avatar/editor (V2)
│   ├── layout/                   # MobileNav, TopHeader
│   ├── common/                   # InfoTooltip, CalendarPicker
│   └── ui/                       # Toast
│
├── services/                     # Client-side data access (reads)
│   ├── api.ts                    # Main service (32KB — profiles, history, stats, duels)
│   ├── groupApi.ts               # Group CRUD
│   ├── workoutApi.ts             # Workout program CRUD
│   └── BodyCompositionService.ts # Body measurement queries
│
├── context/                      # React Contexts
│   ├── ThemeContext.tsx           # Current theme (Athlete, Viking, etc.)
│   ├── ExperienceModeContext.tsx  # RPG vs Classic mode
│   └── ToastContext.tsx           # Toast notifications
│
├── hooks/                        # Custom hooks
│   ├── useTrophies.ts            # Trophy/achievement logic
│   └── useUserProfileData.ts     # Profile data fetching
│
├── utils/                        # Utilities
│   ├── supabase/                 # Supabase client factories
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server component client
│   │   ├── service.ts            # Service role client (admin)
│   │   └── middleware.ts         # Session refresh middleware
│   ├── workoutParser.ts          # Text → structured workout
│   ├── physiquePoints.ts         # Body comp scoring
│   ├── macroCalculator.ts        # Calorie calculations
│   └── date.ts, time.ts, audio.ts, parseReps.ts
│
├── lib/                          # External service clients
│   ├── whoop.ts                  # WHOOP API helpers
│   └── google-health.ts          # Google Health API helpers
│
├── data/                         # Static data
│   ├── themes.ts                 # Theme definitions (5 themes)
│   ├── paths.ts                  # Training path definitions
│   ├── pathExercises.ts          # Path → exercise mappings
│   ├── habitDefaults.ts          # Default habit config
│   └── exerciseCues.ts           # Form cues per exercise
│
├── types/
│   └── index.ts                  # Shared TypeScript interfaces
│
└── tests/                        # Vitest + React Testing Library
    └── *.test.ts(x)              # 178 tests (16 files)
```

## 4. Data Flow

### Write path (logging a workout set)
```
User taps "Complete Block"
  → ExerciseView calls onComplete(exercisesData)
    → useWorkoutSession.handleBlockComplete()
      → logTrainingAction(userId, exerciseId, bodyweight, sex, sets, sessionId)
        [Server Action — runs on Vercel]
        → Supabase: fetch catalog item + user profile
        → Calculate rank (Epley → compare vs standards)
        → Supabase: insert into workouts table
        → revalidatePath('/')
      ← returns { level, rank_name, xp_earned, raw_value }
    → setBlockResults(results) → show BlockCompleteOverlay
```

### Read path (loading dashboard)
```
User opens /dashboard
  → page.tsx (server component): getProfile(), getUserStats()
    → Supabase queries with auth context
  → DashboardClient (client component): renders tabs
    → TodayTab: getHabitProgress(), getHistory()
    → ProgressTab: getHistory(), getTrainingCatalog()
    → StatsTab: getHistory()
```

### Health sync path
```
Vercel Cron (6 AM UTC) → /api/cron/whoop-sync
  → For each user with whoop_access_token:
    → Refresh token if expired
    → Fetch strain, recovery, sleep from WHOOP API
    → Upsert into habit_logs + body_measurements
    → Per-user timezone prevents duplicate entries

Health Connect Webhook → /api/sync/health-connect
  → Validate token-in-URL auth
  → Parse 12 data types (steps, sleep, weight, etc.)
  → Upsert into appropriate tables
```

## 5. Database Schema (Key Tables)

```
users ─────────────────── 1:N ──── workouts
  │                                  (exercise_id, sets[], level, xp, rank_name, session_id)
  │
  ├── 1:N ──── nutrition_logs       (macro_type, amount, date)
  ├── 1:N ──── habit_logs           (habit_id, value, date)
  ├── 1:N ──── body_measurements    (weight, body_fat_%, per-region, mode)
  │
  ├── 1:N ──── workout_programs ─── 1:N ──── program_blocks
  │                                            (exercise_id, sets, reps, weight, type)
  ├── 1:N ──── program_schedule     (program_id, day_of_week)
  │
  ├── N:M ──── groups               (via group_members)
  │              └── 1:N ──── group_challenges
  │
  ├── 1:N ──── duels                (challenger vs opponent, metric, duration)
  └── N:M ──── public_challenges    (community-wide, join pages)

catalog ──────────────────────────── (242 exercises, standards, xp_factor, normalization)
screenshot_examples ──────────────── (few-shot examples for Claude)
```

## 6. Security Model

| Layer | Mechanism |
|---|---|
| Authentication | Supabase Auth (email/password, OAuth) |
| Session | HTTP-only cookies, refreshed via middleware |
| Authorization | Row Level Security on all tables |
| API auth (sync) | Token-in-URL (`sync_token` column on users) |
| API auth (cron) | `CRON_SECRET` header verification |
| API auth (OAuth) | Standard OAuth2 code flow (WHOOP, Google) |
| Service role | Used only in scripts, cron, and admin operations |
| Client secrets | Never exposed — all AI/OAuth calls are server-side |

## 7. Deployment

```
GitHub repo
  → Push to main
    → Vercel auto-deploy (production)
      → Next.js build (SSR + API routes)
      → Available at refactorathletics.com

iOS App (Capacitor)
  → WebView loads refactorathletics.com
  → Native plugins for HealthKit, haptics, payments
  → Updates are instant (no App Store review for web changes)
  → App Store review only for native plugin changes
```

## 8. Testing

- **Framework:** Vitest + React Testing Library + jsdom
- **Coverage:** 178 tests across 16 files
- **Pattern:** Mock Supabase client, render components, assert behavior
- **Key areas tested:** Server Actions, API functions, rank calculation, component rendering, utility functions
- **Gap:** No integration tests for full user flows (onboarding, workout completion)

## 9. Key Technical Constraints

- **No offline-first:** Server URL approach requires internet. PWA service worker provides basic caching but not offline writes.
- **PostgREST cache:** After schema migrations, Supabase needs restart or 10-min wait for API to reflect changes.
- **TypeScript errors ignored in build:** `ignoreBuildErrors: true` in next.config.ts (tech debt — should be resolved).
- **Single actions.ts file:** All Server Actions in one 20KB file. Could be split by domain in future.
- **api.ts monolith:** 32KB service file. Could be split into domain-specific services.
