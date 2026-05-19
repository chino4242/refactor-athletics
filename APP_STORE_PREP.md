# App Store Submission Prep

## App Information

**App Name:** Refactor Athletics
**Subtitle:** Gamified Fitness Tracker & RPG
**Bundle ID:** com.refactorathletics.app
**Category:** Health & Fitness
**Secondary Category:** Games > Role Playing (optional — test if Apple allows)
**Age Rating:** 4+ (no objectionable content)
**Price:** Free (with in-app purchases)

---

## Description

### Short Description (Promotional Text — 170 chars)
Turn your workouts into RPG progression. Track lifts, macros, and habits while earning XP, climbing ranks, and competing with friends.

### Full Description
Refactor Athletics turns your real-world training into RPG progression. Every rep, every macro logged, every habit tracked makes your character stronger.

**TRACK EVERYTHING IN ONE PLACE**
• Log workouts with automatic rank calculation
• Track macros (protein, carbs, fat, water)
• Monitor daily habits (steps, sleep, HRV, recovery)
• Body composition tracking (tape & scale modes)

**EARN YOUR RANK**
Your lifts are compared against demographic standards (age, sex, bodyweight) to assign performance ranks. Watch your Power Level grow as you get stronger.

**CHOOSE YOUR PATH**
Pick a training focus — Strength, Endurance, Hybrid, or Mobility — and a theme that shapes your rank names and visual identity.

**COMPETE WITH FRIENDS**
Challenge friends to duels, join groups, and tackle weekly challenges together. Your real-world progress drives in-game competition.

**SYNC YOUR WEARABLES**
Connect Apple Health, WHOOP, or Google Health Connect for automatic habit tracking. Steps, sleep, calories burned — all synced automatically.

**TWO MODES**
• RPG Mode: Full gamification with themes, XP, and rank names
• Classic Mode: Clean tracker without the game layer — same math, minimal UI

Premium unlocks RPG mode, unlimited programs, AI features, Arena, and more.

---

## Keywords (100 chars max)
fitness,tracker,RPG,workout,log,macros,protein,rank,power,level,XP,gym,strength,health,gamified

---

## Screenshots Required

| Device | Size | Count |
|--------|------|-------|
| iPhone 16 Pro Max (6.7") | 1320 × 2868 | 6-10 |
| iPhone 16 Pro (6.3") | 1206 × 2622 | 6-10 |

### Screenshot Sequence (recommended)
1. Dashboard with Power Level and daily goals
2. Active workout with rank-up celebration
3. Nutrition tracker (weekly view with per-day segments)
4. Arena — duel challenge screen
5. Onboarding — theme selection
6. Progress — Power Level contributors with rank images

---

## Privacy Nutrition Labels

### Data Collected

| Data Type | Purpose | Linked to Identity |
|-----------|---------|-------------------|
| Health & Fitness (HealthKit) | App Functionality | Yes |
| Email Address | Account creation | Yes |
| Fitness Data (workouts, body measurements) | App Functionality | Yes |
| Usage Data | Analytics (future) | No |

### Data NOT Collected
- Location
- Contacts
- Browsing History
- Financial Info (Stripe/Apple handle payments)

---

## App Review Notes

### Test Account
```
Email: reviewer@refactorathletics.com
Password: [CREATE BEFORE SUBMISSION]
```
This account has pre-populated workout history, nutrition logs, and an active subscription for testing all premium features.

### Architecture Note
This app uses Capacitor's server URL approach — the native shell loads content from https://refactorathletics.com via WKWebView. Native plugins (HealthKit, haptics, in-app purchases) are accessed through the Capacitor bridge. This architecture enables instant updates without App Store review for content changes while maintaining native functionality.

### HealthKit Justification
- **Steps**: Automatically tracks daily step count as a habit goal
- **Active Calories**: Tracks calories burned for net calorie deficit calculation
- **Sleep**: Monitors sleep duration for recovery tracking
- **Heart Rate / HRV**: Tracks resting heart rate and heart rate variability for recovery scores
- **Weight**: Syncs body weight for rank calculations (lifts compared against bodyweight)
- **Body Fat %**: Tracks body composition progress over time
- **Exercise Sessions**: Writes completed workouts back to Apple Health for cross-app sync

### In-App Purchases
- Monthly subscription: $7.99/month (com.refactorathletics.elite.monthly)
- Annual subscription: $59.99/year (com.refactorathletics.elite.annual)
- 14-day free trial on annual plan
- Managed via RevenueCat

---

## Required Before Submission

- [ ] Apple Developer account active (ID issue being resolved)
- [ ] App Store Connect: Create app record
- [ ] Create subscription products in App Store Connect
- [ ] RevenueCat: Configure with App Store Connect shared secret
- [ ] Generate app icon (1024×1024 PNG, no alpha)
- [ ] Take screenshots on required device sizes
- [ ] Create test account with populated data
- [ ] Privacy policy URL: https://refactorathletics.com/privacy
- [ ] Terms of service URL: https://refactorathletics.com/terms
- [ ] Support URL: https://refactorathletics.com (or email)
- [ ] Build and upload via Xcode → TestFlight
- [ ] Internal testing (TestFlight) before public submission

---

## Version Info
- **Version:** 1.0.0
- **Build:** 1
- **Copyright:** © 2026 Refactor Athletics
- **Support Email:** ryanj.contino@gmail.com
