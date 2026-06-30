# Epic 18: Party Daily Activity — Real-Time Partner Visibility

**Status:** planned
**Priority:** High — social accountability drives retention
**Created:** 2026-06-30

---

## Vision

Your party members aren't just names on a leaderboard — you see their day unfold in real-time. Did they train? Are they hitting their protein? How many steps? This passive visibility creates accountability without nagging. You show up because you know they can see if you didn't.

---

## Layout (on Arena screen, below Party Power)

```
┌─────────────────────────────────────┐
│ TODAY'S ACTIVITY                     │
├─────────────────────────────────────┤
│ 👤 Chino (YOU)                      │
│ ⚡ 247 XP  🥩 120/175g  👣 8,420   │
│ 🏋️ ✓ Trained  🔥 42 min            │
├─────────────────────────────────────┤
│ 👤 Alex                             │
│ ⚡ 85 XP   🥩 60/170g   👣 4,100   │
│ 🏋️ ○ Not yet  🔥 15 min            │
└─────────────────────────────────────┘
```

---

## Stories

### 18-1: Party Daily Activity Card — Data Fetching

**As a** party member,
**I want** to see my partner's daily activity alongside mine,
**So that** I feel accountable and motivated by shared progress.

**Data to fetch per member (today only):**
- XP earned: sum from `xp_ledger` where `created_at >= today`
- Protein progress: sum from `nutrition_logs` where `date = today` and `macro_type = 'protein'`, target from `users.nutrition_targets.protein`
- Steps: from `habit_logs` where `date = today` and `habit_id = 'habit_steps'`
- Workout done: check if any row in `workouts` where `date = today`
- Active minutes: from `habit_logs` where `date = today` and `habit_id = 'habit_active_minutes'` (if available)

**Acceptance Criteria:**
- Query all party members in user's group
- Fetch today's data for each member (parallel queries)
- Handle missing data gracefully (show "—" not 0 for unsynced metrics)
- Respect privacy: all party members opted in by joining the group (no additional consent needed)
- Data refreshes on pull-to-refresh and on screen mount
- Works for groups of 2-6 members

**Technical Notes:**
- New component: `src/components/v2/PartyDailyActivity.tsx`
- Query pattern: fetch group_id → fetch all member user_ids → parallel fetch per member from xp_ledger, nutrition_logs, habit_logs, workouts
- Use the user's timezone for "today" calculation
- Protein target comes from each member's `users.nutrition_targets.protein`

---

### 18-2: Party Daily Activity Card — UI Display

**As a** user viewing the Arena screen,
**I want** the daily activity card to be clear, compact, and motivating,
**So that** I can see at a glance who's showing up today.

**Acceptance Criteria:**
- Card appears below existing Party Power leaderboard on Arena
- Each member gets a row with their display name
- Current user is labeled "(YOU)" and visually highlighted
- Metrics displayed inline: ⚡ XP, 🥩 Protein (current/target), 👣 Steps, 🏋️ Trained (✓/○), 🔥 Active min
- Members who have trained today appear first (sorted: trained → not trained, then by XP descending)
- Metrics that haven't synced yet show "—" in zinc-600 (not 0)
- The card hides entirely if user has no group
- Compact enough to not dominate the Arena screen (max ~120px height per member)
- Themed border using current theme colors

---

### 18-3: Real-Time Refresh & Edge Cases

**As a** user checking back throughout the day,
**I want** the activity data to be fresh each time I view it,
**So that** I see my partner's latest progress.

**Acceptance Criteria:**
- Data re-fetches on every Arena screen mount (no caching)
- Pull-to-refresh on Arena triggers activity card refresh
- Handles timezone differences between party members correctly (each member's "today" is THEIR today based on stored timezone)
- Solo users (no group) see nothing — no empty state, card just doesn't render
- Groups with 1 member (only you) don't render the card
- Gracefully handles members who haven't logged anything today (show "—" for all, still show the row)
- If protein target is not set for a member, show just the grams without /target

---

## Open Questions

1. ~~Should we show a "nudge" button to ping a partner?~~ — Already exists in campaign card, keep it there for now
2. Should we add notifications ("Alex just trained!")? — Phase 2, not v1
3. Should active minutes distinguish workout minutes vs general movement? — Use whatever habit_active_minutes contains (likely exercise sessions from Health Connect)

---

## Technical Notes

- Reuses existing group membership infrastructure (group_members table)
- No new DB tables needed — reads from existing xp_ledger, nutrition_logs, habit_logs, workouts
- Performance: 5 queries per member, but group max is 6 → max 30 queries. Use Promise.all aggressively.
- RLS: users can read other group members' data via the group_members join (already permitted for challenges)
