# Epic 16: Fuel Screen — Dedicated Nutrition Tab

**Status:** planned
**Priority:** High — daily use, currently misplaced on Train
**Created:** 2026-06-20

---

## Vision

Fuel gets its own tab. It's a daily ritual that happens at meals — completely separate from the training mindset. The screen owns: logging food, viewing today's meals, net calories, macro progress, weekly consistency, and favorites for quick re-logging.

**Navigation:** POWER / ARENA / FUEL / TRAIN (4 tabs)

---

## What Moves

**FROM Train screen → TO Fuel screen:**
- NutritionInputV2 (text input + camera + AI parsing)
- Quick-log favorites
- Daily progress dots (weekly consistency)
- Meal tag selector

**FROM Power Level screen → stays but simplified:**
- NutritionBar stays on PL as a compact read-only summary (NET, macros)
- Tapping NutritionBar on PL navigates to Fuel tab (instead of opening a sheet)

---

## Fuel Screen Layout

```
┌─────────────────────────────────┐
│ FUEL                            │
│                                 │
│ P 70g  C 61g  F 12g            │
│ IN 1,450  BURNED 2,041  NET -591│
│ ████████████░░░░░░░░░ protein   │
│ ████████░░░░░░░░░░░░░ carbs     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Chicken breast, rice...     │ │  ← large textarea input
│ │                             │ │
│ └─────────────────────────────┘ │
│ [🌅 Breakfast] [☀️ Lunch] ...   │  ← meal tags
│                                 │
│ FAVORITES                       │
│ [Chicken + rice] [Protein shake]│  ← tappable chips
│                                 │
│ TODAY'S MEALS                   │
│ 🌅 Oatmeal + berries    380cal │
│ ☀️ Chicken bowl          620cal │
│ 🍎 Protein bar           210cal │
│                                 │
│ M T W T F S S                   │  ← weekly dots
│ ● ● ● ○ ○ ○ ○                  │
└─────────────────────────────────┘
```

---

## Stories

### 16-1: Create Fuel Tab + Move Nutrition Components

**As a** user,
**I want** nutrition tracking on its own dedicated tab,
**So that** I can log food without navigating to the Train screen.

**Acceptance Criteria:**
- Add 4th tab to bottom nav: POWER / ARENA / FUEL / TRAIN
- Tab icon: 🍽️ or flame icon
- Move NutritionInputV2 from TrainScreen to new FuelScreen
- Move quick-log favorites to FuelScreen
- Remove nutrition section from TrainScreen
- NutritionBar on PowerLevelScreen becomes tappable → navigates to /fuel tab

### 16-2: Macro Progress Bars

**As a** user tracking macros,
**I want** to see visual progress toward my daily targets,
**So that** I know if I'm on track without doing math.

**Acceptance Criteria:**
- Show progress bars for protein, carbs, fat (with targets from user profile)
- Color fills as you approach target (green when hit)
- Shows current/target: "70g / 170g protein"
- Compact — doesn't dominate the screen

### 16-3: Today's Meal Log (Inline)

**As a** user,
**I want** to see everything I've logged today on the Fuel screen,
**So that** I have a complete picture without tapping into a sheet.

**Acceptance Criteria:**
- List of today's meals grouped by meal tag
- Each entry shows: food name/label + calories
- Swipe-to-delete (from Epic 10 work, already built)
- Shows below the input area

### 16-4: Enhanced Favorites

**As a** user who eats similar things regularly,
**I want** favorites to be prominent and easy to re-log,
**So that** daily tracking takes seconds.

**Acceptance Criteria:**
- "FAVORITES" section with tappable chips (already built — moves here)
- Long-press a favorite to remove it
- "Add to favorites" option after confirming a meal
- Favorites sorted by frequency (most used first)

### 16-5: Weekly Consistency View

**As a** user,
**I want** to see my weekly nutrition consistency at a glance,
**So that** I'm motivated to track every day.

**Acceptance Criteria:**
- M T W T F S S dots (already built — moves here)
- Filled = tracked 3+ meals that day
- Current week visible
- Ties into the bounty "Track meals 4/7 days"

---

## Technical Notes

- New route: `/fuel` or use existing tab routing system
- New component: `src/components/v2/FuelScreen.tsx`
- Bottom nav: update the tab bar component to include 4 tabs
- NutritionBar on PL: change from sheet-open to navigation (`router.push` or tab switch)
- TrainScreen: remove the NutritionInputV2 section entirely

---

## Lore Connection (Light)

The Fuel screen can have a subtle theme line if needed:
- Samurai: "A blade's edge depends on the steel it's forged from."
- Draconic: "Fire needs fuel. So do you."
- Viking: "A warrior's feast determines tomorrow's battle."
- Athlete: (none — clean)

But keep it minimal. Fuel is functional first.

---

## Open Questions — RESOLVED

1. ~~Tab order~~ **POWER / FUEL / ARENA / TRAIN** — status left, action right.
2. ~~NutritionBar on PL~~ **Keep it.** Compact hub for the day. Also add Daily XP earned to it (same info density as the Android widget: tier + XP + NET + streak).
3. ~~Deficit target~~ **Yes, configurable** in profile settings.

---

## Power Level "Hub Bar" (enhanced NutritionBar)

The NutritionBar on Power Level becomes a mini daily dashboard (same concept as the Android widget):

```
⛩️ Ronin · PL 9  |  ⚡247 XP  |  NET -350  |  🔥12
```

- Tier + PL (identity)
- Today's XP earned
- Net calories
- Daily streak

Tapping it navigates to the relevant tab (Fuel for nutrition, or stays as a glanceable summary).

---

## Stories (continued)

### 16-6: AI Nutrition Coach — Chat-Based Macro Recommendations

**As a** user setting up or adjusting my nutrition targets,
**I want** a chat-style AI coach that knows my body composition and goals,
**So that** I get personalized macro recommendations through conversation instead of guessing numbers.

**Data Available to Coach (from Health Connect / HealthKit / body_measurements / WHOOP):**
- Current weight, lean body mass, body fat %
- Height, BMR, VO2 max (if synced)
- Activity level (WHOOP strain average or step data)
- Current nutrition_targets (existing protein/carbs/fat/calorie goals)
- Recent nutrition_logs (adherence pattern)
- body_composition_goals (target_weight)

**Acceptance Criteria:**
- "🧠 Coach" button always visible on Fuel screen (e.g., floating action or section header)
- Opens a chat-style conversational UI (scrollable messages, user text input at bottom)
- Backed by Claude API (server action or API route)
- System prompt includes user's body comp data, current targets, and recent adherence
- Coach asks about goals if not set: fat loss, muscle gain, maintenance, recomp
- Coach calculates TDEE + macro split using body comp baseline and explains reasoning:
  - e.g., "At 185 lbs / 18% BF, your lean mass is ~152 lbs. For fat loss at 1 lb/week, I recommend a 500 cal deficit..."
  - Shows protein (1g/lb lean mass), fat (0.4g/lb BW), carbs (remainder)
- Flags unrealistic goals collaboratively:
  - e.g., "Losing 30 lbs in 2 months would require an extreme deficit that risks muscle loss. Here's a 16-week plan that preserves strength..."
  - Offers alternatives rather than just refusing
- User can push back, ask questions, negotiate — coach adjusts recommendations
- When user agrees, coach presents final recommendation card:
  - Protein: Xg, Carbs: Xg, Fat: Xg, Calories: X
  - "Apply these targets?" button
- One-tap applies to `nutrition_targets` in user profile via server action
- Conversation persists in local state during session (not stored in DB — fresh each open)

**Technical Notes:**
- New component: `src/components/v2/NutritionCoach.tsx`
- API route: `/api/nutrition-coach` (POST with messages array + user context)
- Claude system prompt constructed server-side with body comp data (never sent from client)
- Streaming response for real-time chat feel
- Uses existing body_measurements + users table data

---

### 16-7: AI Coach — Ongoing Check-ins & Proactive Adjustments

**As a** user whose body composition changes over time,
**I want** the coach to proactively suggest target adjustments,
**So that** my macros stay aligned with my actual progress.

**Acceptance Criteria:**
- When body_measurements show meaningful change (≥2 lbs weight change or ≥1% BF change over 2+ weeks), surface a nudge banner on the Fuel screen:
  - e.g., "📊 Your weight is down 3 lbs since your targets were set — want to chat with Coach?"
- Tapping the nudge opens the Coach chat pre-loaded with context:
  - "Hey! I noticed your weight dropped from 185 to 182 over the past 2 weeks. Your current targets were set for 185 lbs. Want me to recalculate?"
- Coach recalculates based on latest body comp data
- User can accept new targets, modify them, or dismiss
- Dismissing hides the nudge for 7 days (stored in localStorage)
- If user's nutrition adherence is consistently off (e.g., protein < 70% target for 7+ days), coach can also nudge:
  - "You've been averaging 95g protein vs your 170g target. Want to talk about making it more achievable?"

**Acceptance Criteria (Nudge Logic):**
- Check on Fuel screen mount: compare latest body_measurements vs the date nutrition_targets were last updated
- Threshold: ≥2 lbs weight change OR ≥1% BF change since targets were set
- Adherence check: 7-day rolling average of protein/calories vs targets
- Nudge dismissal stored in localStorage with expiry timestamp
- Max 1 nudge visible at a time (body comp takes priority over adherence)

**Technical Notes:**
- Nudge component: inline banner at top of Fuel screen (above input)
- Reuses the NutritionCoach chat component from 16-6
- Pre-seeds the conversation with a system-generated first message based on the trigger
- No new DB table needed — uses existing body_measurements + nutrition_logs + users
