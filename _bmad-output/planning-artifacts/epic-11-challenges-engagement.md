# Epic 11: Challenges & Engagement Polish

**Status:** planned
**Priority:** High — starting Monday, daily active use with tester
**Created:** 2026-06-19

---

## Vision

Make campaigns, bounties, and daily challenges feel alive and engaging. Every day should have a moment of satisfaction (or gentle urgency). Partners should feel connected. Milestones should be celebrated. Failure should be graceful.

---

## Stories — Bug-Free Confidence

### 11-1: Campaign Restart Flow

**As a** user whose campaign failed,
**I want** to cleanly start a new campaign without confusion,
**So that** failure doesn't feel permanent.

**Acceptance Criteria:**
- After failure, show a summary: "You made it X days. Here's what you accomplished."
- Show total XP earned during the campaign, days completed, best streak within it
- "Forge Anew" starts a fresh campaign (new start_date, reset metrics)
- Old campaign data stays in history (not deleted)
- No "Day -6" or negative day bugs on restart

---

### 11-2: Auto-Detect Campaign Metrics from App Data

**As a** user with a campaign metric like "Complete a workout" or "Hit 7,500 steps,"
**I want** the app to auto-check those from existing data,
**So that** I don't have to manually tap a checkbox for things the app already knows.

**Acceptance Criteria:**
- Campaign metrics with matching app data auto-check:
  - "Completed a workout" → ✓ if any workout logged today
  - "Hit X steps" → ✓ if habit_logs steps ≥ target
  - "Tracked nutrition" → ✓ if 3+ nutrition_logs today
  - "Active minutes ≥ X" → ✓ from exercise session durations
- Manual metrics (e.g., "No alcohol", "Read 10 pages") remain honor-system checkboxes
- Auto-checked metrics show a "synced" indicator (different from manual tap)
- Evaluation considers both auto-checked and manual-checked metrics

---

### 11-3: Partner Status Visibility

**As a** user in a shared campaign,
**I want** to see if my partner checked in today,
**So that** I feel accountable and can nudge them if needed.

**Acceptance Criteria:**
- Campaign card shows each member's today status: ✓ (done) / ○ (pending) / ✕ (failed)
- Shows which specific metrics each member has/hasn't completed today
- Last check-in time: "Partner checked in 2h ago"
- If shared_fate is on, emphasize: "Both must complete to survive"

---

## Stories — Engagement Features

### 11-4: Daily Streak Counter

**As a** user,
**I want** to see my consecutive days of completing all daily requirements,
**So that** I'm motivated to not break the chain.

**Acceptance Criteria:**
- Streak = consecutive days where ALL session groups were completed (or day was rest day)
- Displayed on Train screen near the weekly grid
- Shows fire emoji + count: "🔥 12 day streak"
- Streak breaks if a training day passes with 0 exercises logged
- Rest/recovery days don't break the streak
- XP bonus at streak milestones: 7 days (+100), 14 days (+200), 30 days (+500)

---

### 11-5: Campaign Progress Visualization

**As a** user in a 75-day campaign,
**I want** to see how far I've come visually,
**So that** I feel the progress and stay motivated.

**Acceptance Criteria:**
- Progress bar: filled segments for days completed, empty for remaining
- Current day number prominently displayed: "DAY 34 / 75"
- Milestone markers on the bar at day 25, 50, 75 (or custom intervals)
- Passed milestones show as achievements
- Color coding: green streak, amber if missed yesterday (grace period), red on fail

---

### 11-6: Mid-Campaign Milestones

**As a** user hitting day 25 or day 50 of a 75-day campaign,
**I want** a celebration moment,
**So that** the journey feels rewarding before the end.

**Acceptance Criteria:**
- Milestones at 25%, 50%, 75% of campaign duration (or fixed: day 25, 50 for 75-day)
- Celebration modal on the milestone day: "🏆 DAY 25 — Quarter way there!"
- Bonus XP at each milestone: +250 (day 25), +500 (day 50), +2500 (completion)
- Theme-specific creature congratulation text
- Show cumulative stats: "25 days · X workouts · Y XP earned so far"

---

### 11-7: Nudge Notifications

**As a** user who notices my partner hasn't checked in yet today,
**I want** to send them a nudge,
**So that** they're reminded before it's too late.

**Acceptance Criteria:**
- "Nudge" button visible on partner's pending status (story 11-3)
- Tapping sends a push notification to the partner
- Notification text is theme-specific and encouraging (not guilt-inducing):
  - *"Your Vanguard is waiting. The rift won't hold itself."*
  - *"The party needs you today. One workout. You got this."*
- Rate limit: max 1 nudge per partner per day
- Recipient sees who nudged them

---

### 11-8: Bounty Reveal Animation (Monday)

**As a** user opening the app Monday morning,
**I want** my new weekly bounties to feel exciting,
**So that** I'm motivated to start the week with intent.

**Acceptance Criteria:**
- First Arena visit on Monday shows a "reveal" animation
- Each bounty card flips/fades in sequentially (not all at once)
- Brief text: "This week's challenges await..."
- After reveal, difficulty selectors become available
- Only plays once per week (tracked in localStorage)

---

### 11-9: Bounty Sweep Celebration

**As a** user who completed all 3 weekly bounties,
**I want** a celebration moment,
**So that** the sweep feels like an achievement.

**Acceptance Criteria:**
- When 3rd bounty completes, show a celebration overlay
- "⚔ BOUNTY SWEEP" with total XP earned (3 bounties + sweep bonus)
- Theme-colored confetti/particle effect (brief, 2 seconds)
- Historical tracking: "You've swept X of Y weeks" visible somewhere in Arena

---

### 11-10: End-of-Day Summary

**As a** user finishing my training day,
**I want** a summary of what I accomplished,
**So that** I feel closure and satisfaction.

**Acceptance Criteria:**
- Triggers when user returns to Train screen after completing all session groups
- Or triggers at a configurable time (e.g., 9 PM) if day is complete
- Shows: exercises completed, XP earned, bounty progress, streak status
- Theme-specific closing line: *"The rift is quiet tonight. Rest well, Warden."*
- Dismissable, doesn't block — just a nice moment

---

### 11-11: Weekly Summary Notification

**As a** user,
**I want** a weekly recap notification on Sunday evening or Monday morning,
**So that** I see my progress and feel momentum going into the new week.

**Acceptance Criteria:**
- Push notification (requires notification infrastructure from Epic 6)
- Content: "This week: X workouts · Y XP · Z/3 bounties · 🔥N-day streak"
- Tapping opens Power Level screen (or the Weekly Highlight Reel)
- Sent Sunday 8 PM local time or Monday 7 AM (user preference TBD)

---

### 11-12: Bounty History

**As a** user,
**I want** to see my past bounty performance,
**So that** I can track my consistency over time.

**Acceptance Criteria:**
- Accessible from Arena screen (small link: "History" or scroll below active bounties)
- Shows last 8 weeks: which bounties were completed, difficulty chosen, sweeps
- Sweep count badge: "Swept 6 of last 8 weeks"
- Simple list view — not a complex dashboard

---

## Build Priority (for Monday start)

**Phase 1 — Must have (makes daily use better immediately):**
- 11-2: Auto-detect metrics
- 11-3: Partner status visibility
- 11-4: Daily streak counter
- 11-5: Campaign progress visualization

**Phase 2 — High value engagement:**
- 11-6: Mid-campaign milestones
- 11-7: Nudge notifications
- 11-10: End-of-day summary

**Phase 3 — Polish & delight:**
- 11-1: Campaign restart flow
- 11-8: Bounty reveal animation
- 11-9: Bounty sweep celebration
- 11-12: Bounty history

**Phase 4 — Requires notification infra:**
- 11-11: Weekly summary notification (depends on push notifications)

---

## Dependencies

- Push notifications (Epic 6 / story 6-2) — required for 11-7 and 11-11
- Campaign evaluation logic (already built in challenge-75 route)
- Bounty service (already built)
- Daily mission board (Epic 7 — just shipped)
