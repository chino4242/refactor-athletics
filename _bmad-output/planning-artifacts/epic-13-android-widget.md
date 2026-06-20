# Epic 13: Android Widget — V2 Reskin

**Status:** planned
**Priority:** Medium — daily touchpoint, zero-friction engagement
**Created:** 2026-06-20

---

## Vision

The home screen widget is the daily glance that keeps Refactor top-of-mind without opening the app. It shows identity, progress, and key metrics at a glance, with one-tap actions for the two most common daily interactions: logging food and starting a workout.

**Size:** 4×2 (standard Android widget)
**Refresh:** Every 30 minutes + on app open
**Theme:** V2 pixel aesthetic, dark background, theme-accent colors

---

## Target Design

```
┌─────────────────────────────────────┐
│ ⛩️ RONIN · PL 9        ⚡247 XP     │
│                                     │
│ NET -350        🔥 12 day streak    │
│                                     │
│  [🍽️ Log Food]      [⚔ Train]      │
└─────────────────────────────────────┘
```

**Row 1:** Identity (theme icon + tier name + PL) + today's XP earned
**Row 2:** Net calories + daily streak
**Row 3:** Two action buttons (deep-link into app)

---

## Data Requirements (fetched on refresh)

| Field | Source | Query |
|-------|--------|-------|
| Tier name + PL | `workouts` table (powerLevelV2 calc) or cached on user | Derive from PL number |
| Today's XP | `xp_ledger` WHERE date = today | SUM(amount) |
| Net calories | `nutrition_logs` WHERE date = today (calsIn) + `habit_logs` calories_burned | IN - BURNED |
| Daily streak | `workouts` table, consecutive dates | Count backward from today |
| Theme icon | `users.selected_theme` | One-time fetch |

---

## Stories

### 13-1: Widget Layout & Styling (V2 Reskin)

**As a** user with the Refactor widget on their home screen,
**I want** it to match the V2 pixel aesthetic and show my theme,
**So that** it feels like part of the app experience.

**Acceptance Criteria:**
- Dark background (zinc-900 equivalent)
- Theme accent color for borders/text (samurai=indigo/pink, draconic=red/gold, etc.)
- Pixel font for tier name and key numbers
- Theme icon (⛩️/🐉/⚡/🦖/🏟️) displayed
- Responsive to 4×2 grid size

### 13-2: Widget Data — Identity + XP + Net Cals + Streak

**As a** user glancing at my home screen,
**I want** to see my tier, today's XP, net calories, and streak,
**So that** I know where I stand without opening the app.

**Acceptance Criteria:**
- Shows: Tier name + PL number
- Shows: Today's total XP earned
- Shows: Net calories (IN - BURNED), color coded (green=deficit, amber=surplus)
- Shows: Daily streak (🔥 X) if streak ≥ 2
- Refreshes every 30 minutes via `AlarmManager` or `WorkManager`
- Also refreshes when app comes to foreground

### 13-3: Widget Actions — Log Food + Start Training

**As a** user who wants to quickly log food or start a workout,
**I want** buttons on the widget that deep-link into the app,
**So that** I can take action in one tap.

**Acceptance Criteria:**
- "Log Food" button → opens app to Train screen with nutrition input focused
- "Train" button → opens app to Train screen (daily mission board)
- Buttons styled with theme accent color
- Tap feedback (ripple/highlight)

### 13-4: Widget Refresh on App Open

**As a** user who just logged something in the app,
**I want** the widget to update when I return to home screen,
**So that** I see fresh data after using the app.

**Acceptance Criteria:**
- When app moves to background, trigger widget refresh
- Widget shows fresh data within seconds of returning to home screen
- No manual "refresh" button needed on the widget

---

## Technical Context

### Existing Widget
- Located somewhere in `android/app/src/main/` (need to find and audit)
- Likely uses `AppWidgetProvider` + `RemoteViews`
- Needs reskin — replace layout XML with V2 design

### Architecture
- Widget fetches data directly from Supabase (REST API with anon key + user auth)
- OR reads from a local SharedPreferences cache written by the Capacitor app
- SharedPreferences approach is simpler and doesn't require network in widget

### Recommended Approach
1. App writes key metrics to SharedPreferences on every relevant action (log food, complete workout, sync health)
2. Widget reads from SharedPreferences on refresh (no network call needed)
3. App triggers `AppWidgetManager.notifyAppWidgetViewDataChanged()` when data changes

---

## Open Questions

1. Should the widget show campaign progress (Day X/Y) if there's an active campaign?
2. Should tapping anywhere on the widget (not just buttons) open the app?
3. Should there be a compact 4×1 version as well?
