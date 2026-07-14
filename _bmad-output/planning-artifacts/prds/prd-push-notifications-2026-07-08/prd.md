---
title: Push Notifications
created: 2026-07-08
updated: 2026-07-08
status: final
---

# PRD: Push Notifications

## 0. Document Purpose

This PRD defines the push notification system for Refactor Athletics on iOS and Android. It targets the developer agent for implementation and the PM for scope decisions. The feature draws inspiration from Duolingo's engagement mechanics — timely, personalized nudges that drive daily retention without becoming annoying. This PRD builds on the existing `PRD.md` (core product scope), `ARCHITECTURE.md` (technical foundation), and the app's current PWA + Capacitor native shell architecture.

## 1. Vision

Refactor Athletics already gamifies fitness. Push notifications close the loop between sessions — they're the tap on the shoulder that turns a 3x/week user into a daily one. The system sends contextual, personalized notifications that feel like a coach who knows your schedule, your streaks, and your goals. Unlike generic "time to work out!" alerts, these notifications carry real data: your streak count, the specific rank at risk, the friend who just challenged you.

The notification system is smart by default: it learns when you typically train, respects quiet hours, and never nags. Users control exactly which categories they receive. The goal is to make every notification feel earned — either because you're about to lose something (streak, rank) or because something genuinely exciting happened (duel accepted, rank-up nearby, party milestone).

## 2. Target User

### 2.1 Jobs To Be Done

- **Retention:** Remind me to check in before my streak breaks so I don't lose momentum
- **Motivation:** Tell me when I'm close to a milestone so I push harder today
- **Urgency:** Warn me when a rank is about to decay so I can schedule a retest
- **Social:** Alert me immediately when someone challenges me or my party achieves something
- **Habit formation:** Nudge me at consistent times so tracking becomes automatic

### 2.2 Non-Users (v1)

- Users who disable all notifications (graceful opt-out, no degraded experience)
- Users without native app (web PWA has limited push support — future enhancement)

### 2.3 Key User Journeys

- **UJ-1. Alex almost breaks his streak but gets saved by a notification.**
  - **Entry state:** 9:30 PM, Alex hasn't logged anything today. 14-day streak.
  - **Path:** Phone buzzes → "🔥 Your 14-day streak ends at midnight. 2 mins to log something!" → Alex opens app → logs creatine (tap) and water (quick entry).
  - **Climax:** Streak preserved. "15 days and counting 💪" confirmation.
  - **Resolution:** Alex feels relief. The habit sticks because the system caught him.

- **UJ-2. Alex gets warned his Deadlift rank is about to decay.**
  - **Entry state:** Thursday afternoon. Alex last tested Deadlift 25 days ago.
  - **Path:** Notification arrives → "⚠️ Your Deadlift rank (Berserker) expires in 5 days. Schedule a test?" → Alex taps → opens directly to Deadlift in the rank calculator.
  - **Climax:** Alex sees exactly what he needs to hit to maintain. Plans Friday's session around it.
  - **Resolution:** Rank preserved. Alex feels the system is watching out for him.

- **UJ-3. Alex gets pulled into a duel he didn't expect.**
  - **Entry state:** Tuesday morning. Alex is getting ready for work.
  - **Path:** Notification → "⚔️ Marcus challenged you to a 7-day volume duel!" → Alex taps → sees duel terms → accepts.
  - **Climax:** Competitive fire lit. Alex plans extra volume this week.
  - **Resolution:** Both users engage more that week. Social accountability works.

## 3. Glossary

- **Push Token** — Device-specific identifier (APNs token on iOS, FCM token on Android) used to deliver notifications. Stored per-device, per-user.
- **Notification Category** — A logical group of notification types that users can enable/disable together (e.g., "Streak Reminders", "Social", "Rank Warnings").
- **Quiet Hours** — User-defined time window during which no notifications are delivered. Defaults to 10 PM – 7 AM in user's timezone.
- **Rank Decay** — The expiration of a rank level after a configurable period (default: 30 days) without a new test for that exercise. [ASSUMPTION: Rank decay is not currently implemented but this PRD assumes it will be added as a companion feature.]
- **Smart Timing** — System-inferred optimal notification delivery time based on the user's historical app usage patterns.
- **Notification Preference** — Per-category on/off toggle stored in the user profile. All categories default to ON for new users.
- **Deep Link** — A URL that opens the app directly to a specific screen (e.g., rank calculator for a specific exercise, daily quest page, duel detail).

## 4. Features

### 4.1 Notification Infrastructure

**Description:** The foundational system that registers devices, stores push tokens, and delivers notifications via APNs (iOS) and FCM (Android). Handles token lifecycle, delivery failures, and retry logic. This is the plumbing that all notification categories depend on.

**Functional Requirements:**

#### FR-1: Device Registration

When a user grants notification permission, the system stores their push token associated with their user ID and device platform (iOS/Android).

**Consequences (testable):**
- Push token is persisted in `user_devices` table with columns: user_id, platform, push_token, created_at, last_active_at
- If the user has multiple devices, each device has its own token entry
- Token is refreshed if the device reports a new token (FCM token rotation)
- Stale tokens (no activity for 60 days) are pruned automatically

#### FR-2: Notification Delivery Service

The system can send a push notification to a specific user across all their registered devices.

**Consequences (testable):**
- Notification is delivered to all active devices for the target user
- Failed deliveries (invalid token) trigger token cleanup, not retry
- Delivery uses APNs for iOS devices and FCM for Android devices
- Each notification includes: title, body, category, deep_link, and optional image_url
- Notifications are queued and sent via a background job, not inline with user actions

#### FR-3: Permission Request Flow

The app requests notification permission during the onboarding wizard, as a dedicated step.

**Consequences (testable):**
- iOS: Permission prompt appears as part of the onboarding flow (after health sync step, before completion)
- Android: Permission requested during onboarding step (Android 13+ requires runtime permission)
- If declined, a soft prompt appears in Settings with explanation of what they'll miss
- Permission state is tracked in user profile for conditional UI

### 4.2 Engagement & Motivation Notifications

**Description:** Duolingo-style notifications that drive daily check-ins and celebrate proximity to milestones. These are the primary retention mechanism. Realizes UJ-1.

**Functional Requirements:**

#### FR-4: Streak At Risk

When a user has an active streak of 3+ days and has not logged any activity by a configurable evening hour, send a streak warning notification.

**Consequences (testable):**
- Notification fires at the later of: 8 PM user local time OR 2 hours before midnight
- Message includes current streak count: "🔥 Your {N}-day streak ends at midnight!"
- Only fires if no workout, habit, or nutrition log exists for today
- Does not fire if streak is 0-2 days (not established enough to matter)
- Tapping opens the Daily Quest screen

#### FR-5: Daily Quest Incomplete

If a user has completed some but not all daily quests by evening, send a progress nudge.

**Consequences (testable):**
- Fires at 7 PM user local time if 1+ quests done but not all visible quests complete
- Message: "🎯 {completed}/{total} quests done. Finish strong?"
- Does not fire if 0 quests done (covered by streak warning instead)
- Does not fire if all quests complete
- Tapping opens Daily Quest screen

#### FR-6: Rank-Up Proximity

When a user's best effort on an exercise is within 10% of the next rank threshold, notify them.

**Consequences (testable):**
- Calculated after each workout log — checks if any exercise is within 10% of next rank level
- Message: "🏆 You're {X} lbs away from {next_rank_name} on {exercise_name}!"
- Fires at most once per exercise per week (avoid spam for exercises trained frequently)
- Only fires for exercises in the user's active path
- Tapping deep-links to the rank calculator pre-filled with that exercise

#### FR-7: Inactivity Re-engagement

If a user has not opened the app for 3+ days, send a re-engagement notification.

**Consequences (testable):**
- Day 3: Friendly nudge — "We miss you! Your Power Level is {N} — come keep it growing"
- Day 7: Loss aversion — "Your {highest_rank_exercise} rank may expire soon" [ASSUMPTION: depends on rank decay feature]
- Day 14: Final attempt — "Your {streak_count}-day streak reset. Start fresh today?"
- Maximum 3 re-engagement notifications per absence period, then silence until user returns
- Tapping opens Dashboard

### 4.3 Rank & Progress Warnings

**Description:** Proactive alerts when the user is about to lose progress. These notifications create urgency and drive return visits. Realizes UJ-2.

**Functional Requirements:**

#### FR-8: Rank Decay Warning

When an exercise's rank is approaching its expiration window, warn the user with enough time to schedule a retest.

**Consequences (testable):**
- First warning at 5 days before decay: "⚠️ Your {exercise} rank ({rank_name}) expires in 5 days"
- Second warning at 2 days before decay: "🚨 {exercise} rank expires in 2 days — test now!"
- Only fires for exercises at Level 2+ (don't warn about losing a Rookie rank)
- Tapping deep-links to the Testing Timer or Rank Calculator for that exercise
- [ASSUMPTION: Rank decay period is 30 days from last test. This requires a new `last_tested_at` field on workouts or a separate tracking mechanism.]

#### FR-9: Weekly Progress Summary

Sunday evening notification summarizing the week's achievements.

**Consequences (testable):**
- Fires Sunday at 6 PM user local time
- Message includes: workouts completed, total XP earned, any rank-ups, streak status
- Format: "📊 This week: {N} workouts, +{XP} XP{, ranked up on {exercise} if applicable}!"
- Tapping opens the Weekly Review screen

### 4.4 Social & Competitive Notifications

**Description:** Real-time alerts for social interactions — duels, challenges, group activity. These are event-driven (not scheduled) and fire immediately. Realizes UJ-3.

**Functional Requirements:**

#### FR-10: Duel Challenge Received

When another user sends a duel challenge, notify the recipient immediately.

**Consequences (testable):**
- Fires within 60 seconds of challenge creation
- Message: "⚔️ {challenger_name} challenged you to a {metric} duel!"
- Tapping opens the duel detail/accept screen
- No repeat notification — single alert per challenge

#### FR-11: Duel Status Updates

Notify users of meaningful duel events: accepted, final day warning, result.

**Consequences (testable):**
- Duel accepted: "{opponent} accepted your challenge! Game on 💪"
- 24 hours remaining + losing: "⏰ Your duel with {opponent} ends tomorrow — you're behind by {diff}!"
- Duel completed: "🏆 You {won/lost} the duel against {opponent}! {+XP earned if won}"
- Tapping opens the duel detail screen

#### FR-12: Group Challenge Activity

Notify when a new group challenge starts or when the user's group hits a milestone.

**Consequences (testable):**
- New challenge: "🎉 New group challenge: {challenge_name} — starts now!"
- Group milestone: "🏅 {group_name} hit {milestone}% of the challenge goal!"
- Challenge ending (24h): "⏰ {challenge_name} ends tomorrow — your group is at {progress}%"
- Tapping opens the Group/Arena screen

#### FR-13: Party Member Milestone

When a group member achieves a notable milestone, celebrate socially.

**Consequences (testable):**
- Fires when a party member ranks up to Level 4+ on any exercise
- Message: "👏 {member_name} just hit {rank_name} on {exercise}! Send props?"
- Maximum 1 party milestone notification per day (pick the highest-tier event)
- Tapping opens the Party/Group screen

### 4.5 Scheduled & Contextual Notifications

**Description:** Time-based reminders tied to the user's schedule and configured habits.

**Functional Requirements:**

#### FR-14: Workout Day Reminder

On days the user has a scheduled workout program, send a morning reminder.

**Consequences (testable):**
- Fires at 7 AM user local time (or Smart Timing if enabled)
- Only fires on days with a program scheduled in `program_schedule`
- Message: "🗓️ {program_name} today — ready to train?"
- Does not fire if user already logged a workout today
- Tapping opens the Train screen

#### FR-15: Hydration Reminder

If the user has water tracking enabled and hasn't hit their goal, send periodic nudges.

**Consequences (testable):**
- Fires every 3 hours between 9 AM and 7 PM if water intake < 50% of goal
- Message: "💧 {current}/{goal} {unit} water. Quick sip?"
- Maximum 3 hydration reminders per day
- Only fires if habit_water is visible in user's quest settings
- Tapping opens Daily Quest

#### FR-16: Evening Wrap-Up

Prompt users to close out their day with final logs.

**Consequences (testable):**
- Fires at 9 PM user local time
- Message: "🌙 Ready to wrap up? Log sleep and close out the day."
- Only fires if user has NOT already logged sleep for today
- Tapping opens Daily Quest

### 4.6 User Preferences & Controls

**Description:** Users must have full control over which notifications they receive and when. This is both a UX principle and an iOS App Store requirement.

**Functional Requirements:**

#### FR-17: Notification Category Toggles

Users can enable/disable notifications by category from Settings.

**Consequences (testable):**
- Categories presented in Settings → Notifications:
  - Streak & Daily Reminders (FR-4, FR-5, FR-16)
  - Rank Warnings (FR-6, FR-8)
  - Social & Duels (FR-10, FR-11, FR-12, FR-13)
  - Workout Schedule (FR-14)
  - Hydration (FR-15)
  - Weekly Summary (FR-9)
  - Re-engagement (FR-7)
- All categories default to ON for new users
- Changes persist immediately to user profile
- Toggling off a category cancels any pending scheduled notifications in that category

#### FR-18: Quiet Hours

Users can set a time window during which no notifications are delivered.

**Consequences (testable):**
- Default quiet hours: 10 PM – 7 AM in user's timezone
- Configurable in Settings → Notifications
- Notifications scheduled during quiet hours are held and delivered at quiet hours end (not dropped)
- Social notifications (duels, challenges) respect quiet hours — no exceptions
- [ASSUMPTION: User timezone is already stored in the `users` table per migration 20260503]

#### FR-19: Smart Timing

The system learns optimal notification delivery times from user behavior.

**Consequences (testable):**
- Tracks when user typically opens the app (rolling 14-day average)
- Adjustable delivery windows: notifications that aren't time-critical shift ±1 hour toward the user's typical active time
- Applies to: FR-4 (streak), FR-5 (quest incomplete), FR-14 (workout day)
- Does NOT apply to: social notifications (immediate), rank proximity (post-workout)
- [ASSUMPTION: Smart timing is a v1 nice-to-have, not a blocker. Can ship with fixed times and add learning later.]

### 4.7 Analytics & Observability

**Description:** Track notification effectiveness to iterate on messaging, timing, and frequency.

**Functional Requirements:**

#### FR-20: Delivery and Engagement Tracking

Track notification delivery, open rates, and resulting in-app actions.

**Consequences (testable):**
- Every sent notification is logged: user_id, category, sent_at, notification_id
- Tap/open events are tracked with the notification_id for attribution
- Dashboard (admin/internal) shows: sent count, open rate, conversion rate per category
- [ASSUMPTION: This can use a simple notifications_log table initially, no need for a full analytics platform in v1]

## 5. Non-Goals (Explicit)

- **No in-app notification center / inbox.** Push notifications are fire-and-forget. No persistent feed. [NON-GOAL for MVP — consider for v2 if users want history]
- **No web push.** v1 targets native iOS and Android only via Capacitor.
- **No AI-generated message copy.** Messages use templates with dynamic data, not LLM-generated content.
- **No A/B testing infrastructure.** Iterate on copy manually based on open rates.
- **No notification sounds/vibration customization.** Uses system defaults.
- **No rich media notifications** (images, action buttons). Plain text with deep links only. [NON-GOAL for MVP]

## 6. MVP Scope

### 6.1 In Scope

- Device registration and token management (iOS APNs + Android FCM)
- Permission request flow with appropriate timing
- Streak at risk notifications
- Daily quest incomplete notifications
- Rank-up proximity notifications
- Duel challenge received notifications
- Workout day reminder notifications
- Notification category toggles in Settings
- Quiet hours with sensible defaults
- Basic delivery logging

### 6.2 Out of Scope for MVP

- Smart timing / ML-based delivery optimization — ship with fixed times first
- Rank decay warnings — depends on rank decay feature being built first
- Hydration reminders — lower priority, can be phase 2
- Party member milestone notifications — phase 2
- Group challenge notifications — phase 2
- Weekly progress summary — phase 2
- Inactivity re-engagement (day 7, day 14) — phase 2
- Evening wrap-up notification — phase 2
- Rich notifications with action buttons
- Web push support
- Notification analytics dashboard

## 7. Success Metrics

**Primary**
- **SM-1:** Daily active user retention at Day 7 increases by 15% after launch. Validates FR-4, FR-5, FR-14.
- **SM-2:** Notification opt-in rate ≥ 70% of users who reach the permission prompt. Validates FR-3.
- **SM-3:** Notification tap-through rate ≥ 12% across all categories. Validates all FRs.

**Secondary**
- **SM-4:** Average streak length increases by 20% for users with notifications enabled. Validates FR-4.
- **SM-5:** Duel acceptance rate increases by 25% (notification vs. organic discovery). Validates FR-10.

**Counter-metrics (do not optimize)**
- **SM-C1:** Notification disable rate — if >30% of users disable a category within 7 days, that category is too aggressive. Counterbalances SM-1.
- **SM-C2:** App uninstall rate — must not increase after notification launch. Counterbalances SM-3.

## 8. Cross-Cutting NFRs

- **Delivery latency:** Social notifications (duels, challenges) must arrive within 60 seconds of the triggering event. Scheduled notifications must fire within 5 minutes of their target time.
- **Battery impact:** Notification scheduling must not wake the app excessively. Use server-side scheduling, not local alarms for recurring notifications.
- **Privacy:** Push tokens are sensitive. Store hashed or encrypted at rest. Never include PII in notification payloads beyond first name.
- **Graceful degradation:** If push delivery fails, the app functions identically — notifications are additive, never required for core functionality.
- **Platform compliance:** Follow Apple's Human Interface Guidelines for notifications and Google's notification best practices. Respect Do Not Disturb system settings.
- **Rate limiting:** No user receives more than 2 notifications per day across all categories combined. The system prioritizes the most urgent/relevant notification when multiple would fire on the same day (priority: duel received > streak at risk > rank proximity > quest incomplete > workout reminder). Social alerts for duels/challenges count toward the daily cap.

## 9. Platform & Architecture Notes

- **Delivery service:** FCM (Firebase Cloud Messaging) as the unified delivery layer for both iOS and Android. FCM proxies through APNs for iOS devices — upload the APNs key to the Firebase project and FCM handles the translation. One API, one token format, one credential set.
- **Why FCM unified:** Single send endpoint reduces backend complexity. Capacitor's `@capacitor/push-notifications` plugin is designed for FCM. Latency difference is imperceptible (83ms vs 65ms). No need for iOS-specific features like Live Activities in v1.
- **Scheduling:** Vercel cron jobs for time-based notifications (already have a cron pattern for WHOOP sync). Per-user timezone-aware scheduling. Notification priority queue selects the most relevant notification when daily cap (2) would be exceeded.
- **Native layer:** Capacitor Push Notifications plugin handles token registration and deep link handling on iOS/Android.
- **Token storage:** New `user_devices` table with RLS policy scoped to the owning user.
- **Deep linking:** Capacitor App plugin already supports custom URL schemes — notifications include a route path that the app navigates to on tap.
- **Experience mode copy:** Notification templates have RPG and Classic variants. RPG mode uses themed language ("Your Berserker rank fades..."), Classic mode uses plain language ("Your Deadlift rank expires..."). Copy variant selected at send time based on user's `experience_mode`.

## 10. Open Questions

1. **Rank decay:** Notifications ship first without decay warnings. Rank decay feature is a future companion — decay warnings will be added when that feature lands.
2. ~~Permission timing~~ **RESOLVED:** During onboarding, as a dedicated step after health sync.
3. ~~Notification copy tone~~ **RESOLVED:** RPG mode gets themed language, Classic mode gets plain language. Templates have both variants.
4. ~~Push service~~ **RESOLVED:** FCM unified for both platforms.
5. ~~Frequency cap~~ **RESOLVED:** 1-2 notifications per day max. Priority queue picks the most relevant when multiple would fire.

**Remaining open:**
6. Should the notification preferences step in onboarding let users pre-select categories, or default all-on and let them adjust in Settings later?
7. What's the exact priority order when multiple notifications compete for the daily cap? (Proposed: streak at risk > duel received > rank proximity > quest incomplete > workout reminder)

## 11. Assumptions Index

- ~~[ASSUMPTION §3]: Rank decay~~ **RESOLVED:** Ship notifications first, add decay warnings later when rank decay feature lands.
- ~~[ASSUMPTION §4.1 FR-3]: Permission prompt timing~~ **RESOLVED:** During onboarding wizard.
- [ASSUMPTION §4.2 FR-8]: Rank decay period is 30 days; requires new `last_tested_at` tracking (deferred to phase 2)
- [ASSUMPTION §4.5 FR-18]: User timezone is already stored per migration 20260503 — confirmed.
- ~~[ASSUMPTION §4.6 FR-19]: Smart timing~~ **RESOLVED:** Not in MVP, ship with fixed times.
- [ASSUMPTION §4.7 FR-20]: Simple notifications_log table sufficient for v1 analytics
- ~~[ASSUMPTION §9]: Push service~~ **RESOLVED:** FCM unified for both platforms.
