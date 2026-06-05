# Current State (May 31, 2026)

## Project Location
- Active project: /Users/ryancontino/Documents/projects/refactor-athletics
- Old copy (stale): /Users/ryancontino/Documents/refactor-athletics

## TestFlight Status
- Build uploaded and APPROVED on App Store Connect
- Bundle ID: com.refactorathletics.app
- Team ID: CLCZ965649
- Architecture: Capacitor WebView pointing to https://refactorathletics.com (Vercel)
- Beta tester: apujol@outlook.com (external testing group)
- Beta code: BETA2026
- Web changes deploy instantly via Vercel; native shell only needs re-archive for plugin/config changes

## Recent Changes (May 30-31 session)
- Added workout type selector (Full/Strength/Cardio/Core) before starting active workout
- Added inline countdown timer for duration exercises (planks, holds)
- Fixed XP double-counting in daily wrap-up
- Changed beta access code to BETA2026
- Added Reset Profile option in Settings (wipes all data, restarts onboarding)
- Weekly quests default to collapsed
- Dashboard shows net calories (eaten - burned)

## Key Architecture Decisions
- Server URL approach: iOS app is a Capacitor WebView loading refactorathletics.com
- Server Actions for writes, client services for reads
- Supabase for auth + DB + RLS
- No physical iPhone needed for TestFlight (distribution profile, not development)
- Apple Distribution certificate created May 30, 2026

## Beta Plan
- 75-day challenge starting Monday June 2, 2026
- One beta tester (apujol)
- Focus weeks 1-2: stabilize, fix bugs from real usage
- Focus weeks 3-6: QoL based on feedback
- Focus weeks 7+: V2 planning based on evidence

## BMAD Team
- Configured at _bmad/ directory
- Agents: Mary (Analyst), Paige (Tech Writer), John (PM), Sally (UX), Winston (Architect), Amelia (Dev)
- User name: Chino, skill level: intermediate

## Test Account for Apple Review
- Email: reviewer@refactorathletics.com
- Password: (set in Supabase Auth)

## User Accounts
- ryanj.contino@gmail.com (main dev)
- apujol@outlook.com (beta tester)
- test@test.com, test1234@test.com (test accounts)
