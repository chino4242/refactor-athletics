# Push Notifications - Implementation Status

**Date:** 2026-07-13
**Status:** Code complete, pending Firebase project setup

## What's Done

All 3 epics (7 stories) are fully implemented and the build passes clean.

### Epic 1: Infrastructure & Onboarding ✅
- **Story 1.1:** Device registration (`user_devices` table, `/api/notifications/register`, `src/services/pushNotifications.ts`)
- **Story 1.2:** Delivery service (`notifications_log` table, Firebase Admin util, notification templates with RPG/Classic variants, `sendNotification()` with cap/quiet hours/priority queue)
- **Story 1.3:** Onboarding permission step (step 12 in OnboardingWizard, mock notification preview, Enable/Not Now)

### Epic 2: Engagement & Training ✅
- **Story 2.1:** Streak at risk (8 PM local, cron-based)
- **Story 2.2:** Quest incomplete (7 PM local, cron-based)
- **Story 2.3:** Rank-up proximity (inline trigger in `logTrainingAction`, weekly cooldown per exercise)
- **Story 2.4:** Workout day reminder (7 AM local, cron-based)
- Hourly cron route: `/api/cron/notifications` (timezone-aware dispatcher)

### Epic 3: Social & Preferences ✅
- **Story 3.1:** Duel received notification (trigger in `duelApi.ts` → `/api/notifications/send-duel`)
- **Story 3.2:** Notification preferences UI in Settings (7 category toggles + quiet hours)

## Database Migrations (APPLIED ✅)
- `20260708_user_devices.sql` — `user_devices` table + `notifications_enabled` on users
- `20260708_notifications_log.sql` — `notifications_log` table + `notification_preferences` + `quiet_hours` on users

## What's Left (Firebase Setup)

1. **Create Firebase project** at console.firebase.google.com
2. **Add Android app** → download `google-services.json` → place in `android/app/`
3. **Add iOS app** → download `GoogleService-Info.plist` → place in `ios/App/App/`
4. **Upload APNs key** (from developer.apple.com) to Firebase Console → Cloud Messaging
5. **Generate service account key** → Firebase Console → Project Settings → Service Accounts
6. **Add env var** `FIREBASE_SERVICE_ACCOUNT` to Vercel (and `.env.local` for dev) — value is the full JSON string

Once those steps are done, deploy and the system is live.

## Key Files Created/Modified

| File | Purpose |
|------|---------|
| `supabase/migrations/20260708_user_devices.sql` | Device registry table |
| `supabase/migrations/20260708_notifications_log.sql` | Notification log table |
| `src/utils/firebase/admin.ts` | Firebase Admin SDK singleton |
| `src/services/pushNotifications.ts` | Client-side Capacitor push service |
| `src/services/notifications.ts` | Server-side `sendNotification()` |
| `src/services/notificationTemplates.ts` | RPG/Classic copy templates |
| `src/services/notificationChecks.ts` | Cron check functions (streak, quest, workout) |
| `src/app/api/notifications/register/route.ts` | Token registration endpoint |
| `src/app/api/notifications/send-duel/route.ts` | Duel notification endpoint |
| `src/app/api/cron/notifications/route.ts` | Hourly notification dispatcher |
| `src/components/OnboardingWizard.tsx` | Added notification permission step |
| `src/components/SettingsPage.tsx` | Added notification preferences section |
| `src/app/actions.ts` | Added rank proximity trigger |
| `src/services/duelApi.ts` | Added duel notification trigger |
| `src/types/index.ts` | Added notification fields to UserProfileData |
| `src/services/api.ts` | Updated saveProfile for notification fields |
| `vercel.json` | Added hourly cron schedule |
| `package.json` | Added `firebase-admin@13.0.1` |

## PRD & Planning Artifacts
- PRD: `_bmad-output/planning-artifacts/prds/prd-push-notifications-2026-07-08/prd.md`
- Decision log: `_bmad-output/planning-artifacts/prds/prd-push-notifications-2026-07-08/.decision-log.md`
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md`

## Key Design Decisions
- FCM unified for both iOS and Android
- Max 2 notifications/day per user
- Priority: duel (5) > streak (4) > rank proximity (3) > quest incomplete (2) > workout reminder (1)
- Permission asked during onboarding (after health sync step)
- RPG mode gets themed copy, Classic gets plain copy
- Quiet hours default 10 PM – 7 AM (server-side enforcement)
- Categories checked at send time (not device-level channels)
