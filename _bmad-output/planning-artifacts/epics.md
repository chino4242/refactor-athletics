---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories"]
inputDocuments:
  - "_bmad-output/planning-artifacts/prds/prd-push-notifications-2026-07-08/prd.md"
---

# Push Notifications - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Push Notifications feature of Refactor Athletics, decomposing the PRD requirements into implementable stories organized by user value.

## Requirements Inventory

### Functional Requirements (MVP)

- FR-1: Device Registration — store push tokens per user/device
- FR-2: Notification Delivery Service — send notifications via FCM to all user devices
- FR-3: Permission Request Flow — request permission during onboarding
- FR-4: Streak At Risk — evening notification when streak is in danger
- FR-5: Daily Quest Incomplete — progress nudge when some quests done
- FR-6: Rank-Up Proximity — notify when within 10% of next rank
- FR-10: Duel Challenge Received — immediate alert when challenged
- FR-14: Workout Day Reminder — morning reminder on scheduled days
- FR-17: Notification Category Toggles — per-category on/off in Settings
- FR-18: Quiet Hours — configurable do-not-disturb window
- FR-20: Delivery and Engagement Tracking — log sent/tapped notifications

### Non-Functional Requirements

- Delivery latency: Social notifications within 60s, scheduled within 5 min of target
- Battery impact: Server-side scheduling, no local alarms
- Privacy: No PII beyond first name in payloads
- Graceful degradation: App functions identically without notifications
- Platform compliance: Apple HIG + Google best practices
- Rate limiting: Max 2 notifications/day per user with priority queue

### Additional Requirements (Architecture)

- FCM unified delivery for both iOS and Android
- Capacitor Push Notifications plugin for native layer
- New `user_devices` table with RLS
- New `notifications_log` table for delivery tracking
- Vercel cron jobs for scheduled notifications (extend existing pattern)
- Deep linking via Capacitor App plugin
- RPG/Classic copy variants per user's `experience_mode`
- Notification priority queue when daily cap would be exceeded

## FR Coverage Map

- FR-1: Epic 1 — Device registration and token storage
- FR-2: Epic 1 — Notification delivery service (FCM unified)
- FR-3: Epic 1 — Permission request during onboarding
- FR-4: Epic 2 — Streak at risk notification
- FR-5: Epic 2 — Daily quest incomplete notification
- FR-6: Epic 2 — Rank-up proximity notification
- FR-10: Epic 3 — Duel challenge received notification
- FR-14: Epic 2 — Workout day reminder notification
- FR-17: Epic 3 — Notification category toggles in Settings
- FR-18: Epic 3 — Quiet hours configuration
- FR-20: Epic 2 — Delivery and engagement tracking

## Epic List

### Epic 1: Notification Infrastructure & Onboarding
Users can grant notification permission during onboarding, and the system can register their device and deliver push notifications via FCM.
**FRs covered:** FR-1, FR-2, FR-3

### Epic 2: Engagement & Training Notifications
Users receive timely, personalized reminders that protect their streak, nudge incomplete quests, celebrate rank proximity, and remind them of scheduled workouts — capped at 2/day with delivery logging.
**FRs covered:** FR-4, FR-5, FR-6, FR-14, FR-20

### Epic 3: Social Notifications & User Preferences
Users receive immediate alerts when challenged to a duel, and can control their notification preferences (category toggles + quiet hours) from Settings.
**FRs covered:** FR-10, FR-17, FR-18

---

## Epic 1: Notification Infrastructure & Onboarding

Users can grant notification permission during onboarding, and the system can register their device and deliver push notifications via FCM.

### Story 1.1: Firebase Project Setup & Device Token Registration

As a user who installs the app,
I want my device to be registered for push notifications when I grant permission,
So that the system can reach me with timely alerts.

**Acceptance Criteria:**

**Given** the app is installed on iOS or Android
**When** the Capacitor Push Notifications plugin initializes
**Then** the app registers with FCM and receives a push token
**And** the token is sent to the backend API endpoint `POST /api/notifications/register`

**Given** the backend receives a push token registration request
**When** the request includes user_id, platform (ios/android), and push_token
**Then** a row is upserted in the `user_devices` table (columns: id, user_id, platform, push_token, created_at, last_active_at)
**And** if a token already exists for that user+device, it is updated (not duplicated)

**Given** FCM rotates a device token
**When** the app receives a token refresh event
**Then** the new token is sent to the backend and the old token is replaced

**Given** a token has not been active for 60+ days
**When** the daily cleanup cron runs
**Then** the stale token is deleted from `user_devices`

**Technical Notes:**
- Create Supabase migration for `user_devices` table with RLS policy (users can only read/write their own tokens)
- Add Firebase project configuration (google-services.json for Android, GoogleService-Info.plist for iOS)
- Install and configure `@capacitor/push-notifications` plugin
- Upload APNs key to Firebase project for iOS delivery

### Story 1.2: Notification Delivery Service

As the system,
I want to send a push notification to any user across all their registered devices,
So that engagement and retention notifications can reach users reliably.

**Acceptance Criteria:**

**Given** the system needs to send a notification to a user
**When** the send function is called with user_id, title, body, category, and deep_link
**Then** the notification is sent via FCM to ALL active devices for that user
**And** RPG mode users receive themed copy and Classic mode users receive plain copy (based on `experience_mode`)

**Given** a notification is sent successfully
**When** FCM accepts the message
**Then** a row is inserted in `notifications_log` (columns: id, user_id, category, title, body, deep_link, sent_at, delivered, tapped_at)

**Given** FCM returns an "unregistered" or "invalid token" error for a device
**When** the delivery attempt fails
**Then** the invalid token is deleted from `user_devices`
**And** delivery continues to other devices for that user (partial failure is OK)

**Given** the daily notification cap (2) has been reached for a user
**When** another notification would fire
**Then** the notification is suppressed (not queued for later)
**And** the suppression is logged

**Technical Notes:**
- Create `notifications_log` table migration with RLS (add retention policy: delete rows older than 90 days via weekly cron)
- Create utility module `src/services/notifications.ts` with `sendNotification(userId, payload)` function
- Use Firebase Admin SDK server-side (via `FIREBASE_SERVICE_ACCOUNT` env var)
- Implement priority queue: duel received > streak at risk > rank proximity > quest incomplete > workout reminder
- Notification templates with RPG/Classic variants stored as a lookup object
- Delivery service checks `notification_preferences` and `quiet_hours` on the user profile at send time — if columns are null (Epic 3 not yet shipped), default to "send all" and "no quiet hours"
- If quiet hours are active, store notification with `delivery_after` timestamp and process on next cron run

### Story 1.3: Onboarding Permission Request Step

As a new user going through onboarding,
I want to be asked about notification permission as a clear step in the wizard,
So that I can make an informed choice about receiving alerts.

**Acceptance Criteria:**

**Given** a user reaches the notification permission step in onboarding (after Health Sync step)
**When** the step is displayed
**Then** it shows a preview card with a mock notification bubble in the user's chosen theme (e.g., "🔥 Your 7-day streak ends at midnight!")
**And** below the preview, displays brief explanation of notification categories (streak reminders, workout alerts, social challenges)
**And** displays "Enable Notifications" and "Not Now" buttons

**Given** the user taps "Enable Notifications"
**When** the native permission dialog appears and the user grants permission
**Then** Capacitor `PushNotifications.register()` is called ONLY after the button tap (not on component mount)
**And** the device token is registered (Story 1.1 flow)
**And** the user's profile is updated with `notifications_enabled: true`
**And** onboarding advances to the next step

**Given** the user taps "Not Now" or denies the native permission
**When** they dismiss the step
**Then** onboarding advances without blocking
**And** the user's profile is updated with `notifications_enabled: false`
**And** a soft prompt is shown in Settings → Notifications explaining what they're missing

**Given** an existing user who skipped notifications during onboarding
**When** they visit Settings → Notifications
**Then** they see an "Enable Notifications" option with a brief value proposition
**And** tapping it triggers the native permission flow

**Technical Notes:**
- Add new onboarding step (step 11) to OnboardingWizard.tsx after Health Sync
- Add `notifications_enabled` column to users table (boolean, default false)
- On Android 13+, this triggers the runtime notification permission
- On iOS, this triggers the system alert dialog

---

## Epic 2: Engagement & Training Notifications

Users receive timely, personalized reminders that protect their streak, nudge incomplete quests, celebrate rank proximity, and remind them of scheduled workouts — capped at 2/day with delivery logging.

### Story 2.1: Streak At Risk Notification

As a user with an active streak,
I want to receive a warning when I haven't logged anything and my streak is about to break,
So that I can take quick action to preserve my momentum.

**Acceptance Criteria:**

**Given** a user has a streak of 3+ days and has NOT logged any workout, habit, or nutrition today
**When** the streak-check cron runs at 8 PM in the user's local timezone
**Then** a notification is sent: "🔥 Your {N}-day streak ends at midnight! 2 mins to log something."
**And** RPG variant: "🔥 Your {N}-day quest chain breaks at dawn. Keep the fire alive!"
**And** tapping the notification deep-links to `/dashboard` (Daily Quest screen)

**Given** a user has logged any activity today (workout, habit, or nutrition)
**When** the streak-check cron runs
**Then** no notification is sent

**Given** a user has a streak of 0-2 days
**When** the streak-check cron runs
**Then** no notification is sent (streak not established enough)

**Given** the user has already received 2 notifications today
**When** the streak notification would fire
**Then** it is suppressed due to daily cap

**Technical Notes:**
- Create Vercel cron route `/api/cron/notifications` that runs every hour on the hour
- Each hourly run queries users whose timezone puts them at the target hour (e.g., at 00:00 UTC, find users in UTC-4 timezone where it's 8 PM local)
- Use the `timezone` column on the users table (IANA format, e.g., "America/New_York") to calculate local time
- Check `notifications_enabled`, category toggle for "Streak & Daily Reminders", quiet hours, and daily cap before sending
- Use existing streak calculation logic from the dashboard
- Index: `notifications_log(user_id, sent_at)` for efficient daily cap checks

### Story 2.2: Daily Quest Incomplete Notification

As a user who has partially completed my daily quests,
I want a gentle nudge to finish the rest,
So that I build consistent habits and maximize my XP.

**Acceptance Criteria:**

**Given** a user has completed 1+ but not all visible daily quests
**When** the quest-check cron runs at 7 PM in the user's local timezone
**Then** a notification is sent: "🎯 {completed}/{total} quests done today. Finish strong?"
**And** RPG variant: "🎯 {completed}/{total} missions complete. Claim full XP before nightfall!"
**And** tapping deep-links to `/dashboard` (Daily Quest screen)

**Given** a user has completed 0 quests today
**When** the quest-check cron runs
**Then** no notification is sent (streak warning will cover this case)

**Given** a user has completed ALL visible quests
**When** the quest-check cron runs
**Then** no notification is sent (nothing to nudge)

**Given** the user's "Streak & Daily Reminders" category is toggled off
**When** the cron runs
**Then** no notification is sent

**Technical Notes:**
- Extend the `/api/cron/notifications` route with quest-check logic
- Query visible habits from user's `hidden_habits` + `habit_targets` to determine total
- Query today's habit_logs and nutrition_logs for completion count
- Runs 1 hour before streak warning to avoid double-notify (daily cap handles this)

### Story 2.3: Rank-Up Proximity Notification

As a user who just trained,
I want to know when I'm close to ranking up on an exercise,
So that I'm motivated to push a little harder next session.

**Acceptance Criteria:**

**Given** a user logs a workout set
**When** the post-workout rank check determines an exercise is within 10% of the next rank threshold
**Then** a notification is queued: "🏆 You're {X} lbs away from {next_rank_name} on {exercise_name}!"
**And** RPG variant: "🏆 {X} lbs separate you from {next_rank_name}. The beast weakens!"
**And** tapping deep-links to `/test` with the exercise pre-selected

**Given** the same exercise triggered a proximity notification this week
**When** the user trains it again and is still within 10%
**Then** no notification is sent (max 1 per exercise per week)

**Given** the exercise is NOT in the user's active path
**When** they train it and are within 10% of next rank
**Then** no notification is sent (only path exercises trigger this)

**Given** the user is at max rank (Level 5) on an exercise
**When** they train it
**Then** no proximity notification is sent

**Technical Notes:**
- Triggered inline after workout log (in the logTrainingAction server action), not via cron
- Compare user's normalized best value against catalog standards for next level
- Store last notification date per exercise in `notifications_log` to enforce weekly cooldown
- Uses existing rank calculation logic from `src/services/rankCalculator.ts`

### Story 2.4: Workout Day Reminder

As a user with a scheduled workout program,
I want a morning reminder on training days,
So that I don't forget and can mentally prepare for my session.

**Acceptance Criteria:**

**Given** a user has a program scheduled for today in `program_schedule`
**When** the morning cron runs at 7 AM in the user's local timezone
**Then** a notification is sent: "🗓️ {program_name} today — ready to train?"
**And** RPG variant: "⚔️ {program_name} awaits. Prepare for battle!"
**And** tapping deep-links to `/train`

**Given** a user has no program scheduled for today
**When** the morning cron runs
**Then** no notification is sent

**Given** the user has already logged a workout today
**When** the morning cron runs
**Then** no notification is sent (already trained)

**Given** the user's "Workout Schedule" category is toggled off
**When** the cron runs
**Then** no notification is sent

**Technical Notes:**
- Add to the `/api/cron/notifications` route (morning batch)
- Query `program_schedule` joined with `workout_programs` for the day's title
- Check against today's `workouts` table for existing logs
- Runs early enough (7 AM) that it likely won't compete with evening notifications for daily cap

---

## Epic 3: Social Notifications & User Preferences

Users receive immediate alerts when challenged to a duel, and can control their notification preferences (category toggles + quiet hours) from Settings.

### Story 3.1: Duel Challenge Received Notification

As a user who gets challenged to a duel,
I want to receive an immediate push notification,
So that I can respond quickly and engage in the competition.

**Acceptance Criteria:**

**Given** User A creates a duel challenge targeting User B
**When** the duel is saved to the `duels` table
**Then** User B receives a notification within 60 seconds: "⚔️ {challenger_name} challenged you to a {metric} duel!"
**And** RPG variant: "⚔️ {challenger_name} demands combat! A {metric} duel awaits your answer."
**And** tapping deep-links to the duel detail/accept screen (`/arena?duel={duel_id}`)

**Given** User B has hit their daily notification cap (2)
**When** a duel challenge is created
**Then** the notification is still sent (duel has higher priority than quest/workout — it replaces a lower-priority pending notification if cap is reached, or sends as a 3rd if both existing were higher-priority)
**And** NOTE: After discussion, duel received is priority 2 — only streak beats it

**Given** User B has notifications disabled entirely
**When** a duel challenge is created
**Then** no notification is sent (respects system-level opt-out)

**Given** User B is in quiet hours
**When** a duel challenge is created
**Then** the notification is held and delivered when quiet hours end

**Technical Notes:**
- Triggered by the duel creation server action (not cron-based)
- Call `sendNotification()` inline after successful duel insert
- Respects quiet hours — queue with delivery_after timestamp if in quiet window
- Check `notifications_enabled` and "Social & Duels" category toggle

### Story 3.2: Notification Preferences UI in Settings

As a user receiving notifications,
I want to control which categories I receive and set quiet hours,
So that I only get the alerts that matter to me without being disturbed at bad times.

**Acceptance Criteria:**

**Given** a user navigates to Settings → Notifications
**When** the notification preferences section loads
**Then** it displays toggles for each category:
  - Streak & Daily Reminders (default: ON)
  - Rank Warnings (default: ON)
  - Social & Duels (default: ON)
  - Workout Schedule (default: ON)
  - Hydration (default: ON)
  - Weekly Summary (default: ON)
  - Re-engagement (default: ON)
**And** each toggle reflects the user's current saved preference

**Given** a user toggles a category OFF
**When** the toggle is tapped
**Then** the preference is saved immediately to the user's profile (`notification_preferences` jsonb column)
**And** no confirmation dialog is needed (instant toggle)
**And** any pending scheduled notifications in that category are logically skipped (checked at send time)

**Given** a user navigates to the Quiet Hours section
**When** the section loads
**Then** it shows start time (default: 10:00 PM) and end time (default: 7:00 AM)
**And** times are displayed in the user's local timezone

**Given** a user adjusts quiet hours
**When** they change the start or end time
**Then** the new quiet hours are saved to the user's profile (`quiet_hours` jsonb: `{start: "22:00", end: "07:00"}`)
**And** takes effect immediately for all future notifications

**Given** a user who declined notifications during onboarding
**When** they visit Settings → Notifications
**Then** they see a prominent "Enable Notifications" card at the top explaining what they'll get
**And** tapping it triggers the native permission dialog
**And** if granted, `notifications_enabled` is set to true and toggles become active

**Technical Notes:**
- Add new section to SettingsPage.tsx
- Add `notification_preferences` (jsonb) and `quiet_hours` (jsonb) columns to users table via migration
- Category toggles checked at notification send time (not local device channels)
- Quiet hours logic: if current time is within quiet window, hold notification with `delivery_after` timestamp
