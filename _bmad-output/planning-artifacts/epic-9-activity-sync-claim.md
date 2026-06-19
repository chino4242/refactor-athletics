# Epic 9: Activity Sync & Claim — Push Notifications + Confirmation Flow

**Status:** planned
**Priority:** High — bridges passive users and active users, rewards all training
**Created:** 2026-06-19

---

## Vision

Every real-world activity your body does should earn you credit in Refactor — whether you did it inside Battle Mode or not. A mountain bike ride, a Peloton class, a swim, a ladder workout at the park. If Health Connect / HealthKit knows about it, Refactor should celebrate it.

The flow: you finish an activity → your phone buzzes with a theme-specific notification → you tap it → a modal shows the activity and XP → you confirm and optionally assign it to a session group → it counts toward your daily mission, bounties, and arena challenges.

**Key principle:** Some users will never open Battle Mode. They use Refactor as a group accountability and activity aggregator. That's a valid use case. Their synced activities still earn XP, count toward bounties, fill the daily mission board, and keep their party engaged.

---

## Stories

### 9-1: Push Notification on Exercise Sync

**As a** user who just finished an activity tracked by my wearable,
**I want** a push notification telling me Refactor noticed,
**So that** I'm reminded to claim my XP and feel recognized.

**Behavior:**
- Fires immediately when HealthSync detects a new exercise session (>15 min)
- Theme-specific creature dialogue:
  - Samurai: *"The Fox Spirit saw your ride. 45 min. Claim your honor."*
  - Draconic: *"The Wind Serpent tracked your run. Impressive. Claim it."*
  - Athlete: *"Mountain bike ride detected. 45 min. Log it for XP."*
- Short activities (<15 min) auto-sync silently without notification (walks, stretches)
- Tapping the notification opens the app to the confirmation modal

**Dependencies:**
- Push notification infrastructure (Epic 6 item, `@capacitor/push-notifications`)
- HealthSync exercise detection (already built)

---

### 9-2: Activity Confirmation Modal

**As a** user who tapped the notification (or sees unconfirmed activities on Train),
**I want** to confirm the activity and assign it to a session,
**So that** it counts toward my daily progress and I earn full XP.

**Modal shows:**
- Activity type icon + name (e.g., "🚴 Mountain Bike Ride")
- Duration (e.g., "45 min")
- XP to earn (e.g., "+360 XP" — based on tiered rates)
- Session assignment: [Strength / Cardio / Core / Don't assign]
- Confirm button: "CLAIM XP"

**Behavior:**
- Default session assignment is auto-detected (bike ride → Cardio)
- User can override (e.g., a CrossFit class could be Strength)
- On confirm: XP awarded, activity logged to workouts table, session group updated
- Unconfirmed activities show as pending on Train screen until confirmed

**Auto-confirm for short activities:**
- Activities <15 min are auto-confirmed with no notification
- They still earn XP and appear in the activity log
- They don't assign to a session group (too short to count as a session)

---

### 9-3: Train Screen Activity Log

**As a** user,
**I want** to see all my activities for today on the Train screen,
**So that** I feel accomplished and can see my total daily output.

**Display (below the daily mission board):**
```
TODAY'S ACTIVITIES
🚴 Mountain Bike Ride    45 min    +360 XP  ✓ Cardio
🏃 Morning Run           25 min    +200 XP  ✓ Cardio  
🧘 Yoga                  55 min    +165 XP  ○ pending
```

**Behavior:**
- Shows all synced exercises for today (confirmed + pending)
- Pending items are tappable → opens confirmation modal
- Confirmed items show session assignment badge
- Total XP earned from activities shown at top

---

### 9-4: Session Group Credit + Bounty Integration

**As a** user who confirmed an activity as "Cardio,"
**I want** it to count toward my daily Cardio session group completion,
**So that** I can complete my daily mission without using Battle Mode.

**Behavior:**
- Confirmed activity with session assignment → marks that session group as complete
- Counts toward daily completion bonus (+200 XP when all groups done)
- Counts toward weekly bounties:
  - "Sessions" bounty: +1 workout day
  - "Volume" bounty: duration contributes
  - "Consistency" bounty: day counts as logged
- Counts toward 75-day campaigns (active minutes, workout logged)
- Counts toward group challenges

**Rules:**
- One activity can only fill one session group
- If Cardio group has multiple exercises prescribed but user did a 45-min bike ride, it counts as the whole Cardio group being done
- Battle Mode exercises and synced activities can BOTH contribute to the same day

---

### 9-5: Passive User Flow (No Battle Mode)

**As a** user who primarily uses other fitness apps/classes,
**I want** Refactor to recognize all my external training,
**So that** I stay engaged with my group and earn progression without using Battle Mode directly.

**Behavior:**
- Train screen still shows daily mission board with session groups
- Activities from Health Connect fill session groups via confirmation
- User can complete their "day" entirely through synced activities
- Daily completion bonus still awards when all groups filled
- Power Level screen shows synced activities in recent PRs if applicable (e.g., a 5K run time)
- Party members see this user's activity in the guild ticker

**What they DON'T get:**
- Enemy sprites / battle narration (those require Battle Mode)
- Session bounties (those are Battle Mode specific)
- Per-set XP pops and combo tracking

---

## Data Model Changes

```
workouts table (existing):
  - Add: confirmed (boolean, default true for Battle Mode logs, false for synced)
  - Add: session_group (text, nullable — 'strength' | 'cardio' | 'core')
  
OR simpler: use existing exercise_id pattern (synced_*) to detect synced vs manual.
Add session_group column to workouts.
```

## Notification Content Templates (per theme)

| Theme | Template |
|-------|----------|
| Samurai | "The {creature} observed your {activity}. {duration} min. Claim your honor." |
| Draconic | "The rift pulses. {activity} detected — {duration} min. Claim your reward." |
| Viking | "Odin's ravens saw your {activity}. {duration} min. The feat awaits." |
| Apex | "The pack noticed. {activity}, {duration} min. Mark your territory." |
| Athlete | "{activity} detected. {duration} min. Log it for +{xp} XP." |

## Open Questions

1. Should unconfirmed activities expire? (e.g., if you don't confirm within 24h, auto-confirm at lower XP?)
2. Should there be a "quick confirm all" button for multiple pending activities?
3. For ranked exercises synced externally (e.g., a 5K run tracked by Strava → Health Connect), should it trigger rank calculation? (Currently only Battle Mode logs rank.)
