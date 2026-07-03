  
  ⚠️ First-Week Priority
  
  ┌─────┬────────────────────────────────────────────────────────────────┬────────────┐
  │ #   │ Issue                                                          │ Fix Effort │
  ├─────┼────────────────────────────────────────────────────────────────┼────────────┤
  │ 6   │ Loading skeletons (not bare "LOADING..." text)                 │ 1 day      │
  ├─────┼────────────────────────────────────────────────────────────────┼────────────┤
  │ 7   │ Quick Log buttons don't work (BattleView ignores query params) │ 1 hr       │
  ├─────┼────────────────────────────────────────────────────────────────┼────────────┤
  │ 8   │ PowerLevelV2 queries ALL workouts unbounded (time bomb)        │ 10 min     │
  ├─────┼────────────────────────────────────────────────────────────────┼────────────┤
  │ 9   │ Empty Arena state needs guidance, not 3 sad empty boxes        │ 1 hr       │
  ├─────┼────────────────────────────────────────────────────────────────┼────────────┤
  │ 10  │ Post-onboarding empty state needs a guided first action        │ 1 hr       │
  ├─────┼────────────────────────────────────────────────────────────────┼────────────┤
  │ 11  │ Campaign creation doesn't refresh Arena state (TODO comment)   │ 15 min     │
  ├─────┼────────────────────────────────────────────────────────────────┼────────────┤
  │ 12  │ CardioCard stale closure on onComplete                         │ 20 min     │
  └─────┴────────────────────────────────────────────────────────────────┴────────────┘
  
  ─────┬───────────────────────────────────┬────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ #   │ Feature                           │ Effort │ What it does                                                                                                                                            │
  ├─────┼───────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 1   │ Party Status Strip                │ Small  │ Horizontal row of avatar circles on Arena — green ring = trained today, dim = hasn't. Instant "who's active?"                                           │
  ├─────┼───────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2   │ Guild Event Ticker                │ Medium │ Auto-generated RPG battle log: "Jake ranked up Pull-ups → Warrior", "Mia completed Campaign checklist ✓". Read-only, last 7 days, only positive events. │
  ├─────┼───────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 3   │ Guild Quest per-member breakdown  │ Tiny   │ Show who contributed what to the HP bar (already have the data — just display it more prominently)                                                      │
  ├─────┼───────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 4   │ Power Level leaderboard (friends) │ Small  │ Your guild members ranked by PL with "▲2 this week" deltas                                                                                              │
  ├─────┼───────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 5   │ Nudge                             │ Tiny   │ One-tap poke — sends a flag, no message content needed                                                                                                  │
  ├─────┼───────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 6   │ Weekly recap card                 │ Small  │ "Your party lifted 62,000 lbs. Ryan led with 18,000." Shows on Monday                                                                                   │
  └─────┴───────────────────────────────────┴────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────┬───────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────┐
  │ #    │ Issue                                                                                             │ Fix                                       │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🔴 1 │ shared_failure column missing — Shared Fate doesn't work at all                                   │ Migration                                 │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🔴 2 │ duration_days column missing — all campaigns hardcoded to 75 days                                 │ Migration + send in create                │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🔴 3 │ Timezone: check_custom uses server UTC — late-night checks go to wrong day                        │ Use user timezone                         │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🔴 4 │ Mid-campaign joiners instantly fail — retroactive evaluation from group start_date                │ Add per-member joined_on as eval start    │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🔴 5 │ Late-night campaign creation instantly fails — server evaluates Day 1 before user can do anything │ Don't evaluate today or start_date itself │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🟠 6 │ No max-1 guard — user can create unlimited campaigns                                              │ Check before insert                       │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🟠 7 │ Late health sync can't correct evaluated days — once failed, always failed                        │ Allow re-eval of yesterday                │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🟡 8 │ No restart button in v2 UI                                                                        │
  ├──────┼───────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
  │ 🟡 9 │ No completion XP award                                                                            │
  └──────┴───────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────┘

    │ #    │ Severity │ Issue                                                                                       │ Fix                                     │
  ├──────┼──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ 🔴 1 │ High     │ tryRankRun hardcodes 'male' — female users' auto-synced runs ranked against wrong standards │ Pass user's actual sex                  │
  ├──────┼──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ 🟠 2 │ Medium   │ Pending sets drain with today's date instead of original timestamp                          │ Pass stored ts to logTrainingAction     │
  ├──────┼──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ 🟠 3 │ Medium   │ Victory screen XP is sets × 50 estimate, not actual                                         │ Cosmetic — note for later               │
  ├──────┼──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ 🟡 4 │ Low      │ No input validation — zero weight/reps creates junk rows                                    │ Add guard in logAttack                  │
  ├──────┼──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ 📝 5 │ Spec     │ DB normalization only applies ×1.15, README says weight × 2 × 1.15                          │ Clarify docs (code is correct per test) │


    ┌─────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────┐
  │ #   │ Issue                                                                                                                                        │ Impact                             │
  ├─────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────┤
  │ 1   │ requestPermissions() always returns false on iOS — Apple never reveals read authorization status, so the check gates all syncing to "denied" │ Zero health data for ALL iOS users │
  ├─────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────┤
  │ 2   │ Dead onboarding buttons — Apple Health button has no onClick                                                                                 │ App Store rejection                │
  ├─────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────┤
  │ 3   │ Double-sync risk — both HealthSync.tsx and DashboardClient.tsx sync independently                                                            │ Steps/calories doubled             │
  └─────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────┘
  
  🟠 HIGH (Data will be wrong)
  
  ┌─────┬──────────────────────────────────────────────────────────────────────────────────┐
  │ #   │ Issue                                                                            │
  ├─────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ 4   │ Weight returned in kg, app expects lbs — all xBW rank calculations broken on iOS │
  ├─────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ 5   │ Body fat as 0.0-1.0 fraction not percentage                                      │
  ├─────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ 6   │ No path to re-enable after denial — users stuck with no data forever             │
  └─────┴──────────────────────────────────────────────────────────────────────────────────┘

    🔴 Will Cause Rejection
  
  ┌─────┬────────────────────────────┬────────────────────────────┬────────┐
  │ #   │ Issue                      │ Fix                        │ Effort │
  ├─────┼────────────────────────────┼────────────────────────────┼────────┤
    │
  ├─────┼────────────────────────────┼────────────────────────────┼────────┤
  │ 2   │ Missing aps-environment in │ Add key to                 │ 5 min  │
  │     │ entitlements               │ App.entitlements           │        │
  ├─────┼────────────────────────────┼────────────────────────────┼────────┤
  │ 3   │ Missing UIBackgroundModes  │ Add remote-notification +  │ 5 min  │
  │     │ in Info.plist              │ processing                 │        │
  ├─────┼────────────────────────────┼────────────────────────────┼────────┤
  │ 4   │ UIRequire                  │ Change to arm64 +          │ 5 min  │
  │     │ dDeviceCapabilities says   │ healthkit                  │        │
  │     │ armv7 (32-bit nonsense)    │                            │        │
  ├─────┼────────────────────────────┼────────────────────────────┼────────┤
  │ 5   │ Privacy nutrition labels   │ Declare all Health &       │ 30 min │
  │     │ not configured in App      │ Fitness data types         │        │
  │     │ Store Connect              │                            │        │
  └─────┴────────────────────────────┴────────────────────────────┴────────┘
  
  🟠 Bad UX / Likely Reviewer Complaint
  
  ┌─────┬─────────────────────────────────┬────────────────────────────────┐
  │ #   │ Issue                           │ Fix                            │
  ├─────┼─────────────────────────────────┼────────────────────────────────┤
  │ 6   │ Deployment target iOS 15        │ Bump in Xcode + Package.swift  │
  │     │ (should be 16+)                 │                                │
  ├─────┼─────────────────────────────────┼────────────────────────────────┤
  │ 7   │ White splash screen → dark app  │ Fix LaunchScreen background to │
  │     │ flash                           │ #09090b                        │
  ├─────┼─────────────────────────────────┼────────────────────────────────┤
  │ 8   │ No out/index.html fallback for  │ Create minimal fallback page   │
  │     │ offline                         │                                │
  └─────┴─────────────────────────────────┴────────────────────────────────┘
  
  📝 App Store Connect Setup
  
  - Category: Health & Fitness
  - Age rating: 12+
  - Review notes: include demo credentials + HealthKit justification
  - Note: "This app uses native HealthKit, push notifications, and haptics
  beyond web capabilities"
  
  Key Insight (Guideline 4.2)
  
  Apple may reject as "just a website." Your defense is HealthKit integration,
  haptics, and camera access. Mention these prominently in review notes.
  
  ─────────────────────────────────────────────────────────────────────────────
  
  Most of these are Xcode/native config changes (not code you write here). Want
  me to help with any specific ones, or shall we move on to something else?