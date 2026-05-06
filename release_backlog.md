# Refactor Athletics v1 — iOS Release Backlog

## Architecture
```
Next.js 16 (static export) → Capacitor 8 → Xcode 26 → App Store
                                  ↓
                    Native Plugins (Swift bridge)
                    ├── @capgo/capacitor-health (HealthKit + Health Connect)
                    ├── @revenuecat/purchases-capacitor (Subscriptions)
                    ├── @capacitor/push-notifications
                    └── @capacitor/haptics
```

---

## Phase 1: Capacitor Configuration
**Effort**: 1-2 days

| # | Story | Details | Priority |
|---|---|---|---|
| 1.1 | Add Capacitor to the project | `npm i @capacitor/core @capacitor/cli @capacitor/ios` | P0 |
| 1.2 | Configure static export | `next.config.ts` → `output: 'export'`, handle dynamic routes | P0 |
| 1.3 | Create `capacitor.config.ts` | `webDir: 'out'`, app ID `com.refactorathletics.app` | P0 |
| 1.4 | Add iOS platform | `npx cap add ios` | P0 |
| 1.5 | Fix routing for static export | Replace server-side auth redirects with client-side checks | P0 |
| 1.6 | Environment detection | `Capacitor.isNativePlatform()` for native-only features | P1 |
| 1.7 | Test in iOS Simulator | Verify all pages render correctly in WebView | P0 |

**Android reuse**: Everything except `npx cap add ios`.

---

## Phase 2: HealthKit Integration
**Effort**: 2-3 days

| # | Story | Details | Priority |
|---|---|---|---|
| 2.1 | Install `@capgo/capacitor-health` | Unified HealthKit + Health Connect plugin | P0 |
| 2.2 | Enable HealthKit capability in Xcode | Entitlements file | P0 |
| 2.3 | Add Info.plist usage descriptions | `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` | P0 |
| 2.4 | Build native health sync service | `src/services/nativeHealth.ts` — read steps, sleep, calories, weight, HRV, exercise | P0 |
| 2.5 | Permission request flow | Prompt during onboarding step 10, handle denial gracefully | P0 |
| 2.6 | Replace HC Webhook for native users | If native → plugin; if PWA → keep webhook flow | P1 |
| 2.7 | Background health fetch | Capacitor Background Runner for periodic reads | P1 |
| 2.8 | Write workouts to HealthKit | When user completes workout in-app, write to HealthKit | P2 |

**Data types**: Steps, Sleep, Active Calories, Weight, Heart Rate, HRV, Exercise Sessions, Body Fat, Lean Body Mass

**Android reuse**: `@capgo/capacitor-health` API is identical on both platforms. Service file works unchanged.

---

## Phase 3: Payments / Subscriptions
**Effort**: 2-3 days

| # | Story | Details | Priority |
|---|---|---|---|
| 3.1 | Create RevenueCat account | Free under $10k/mo tracked revenue | P0 |
| 3.2 | Configure products in App Store Connect | Monthly ($7.99) + Annual ($59.99) | P0 |
| 3.3 | Install `@revenuecat/purchases-capacitor` | | P0 |
| 3.4 | Build paywall component | `src/components/Paywall.tsx` — show plans, handle purchase | P0 |
| 3.5 | Define free vs pro features | Gate premium content behind entitlement check | P0 |
| 3.6 | Restore purchases flow | Required by App Store guidelines | P0 |
| 3.7 | RevenueCat webhook → Supabase | Update `users.subscription_tier` on purchase/cancel | P1 |
| 3.8 | Trial period | 7-day free trial for annual plan | P2 |

**Subscription tiers**:
- **Free**: Core tracking, basic habits, 1 ranked exercise, manual logging
- **Pro ($7.99/mo or $59.99/yr)**: Unlimited ranks, health sync, group challenges, all themes, workout programs, AI features

**Android reuse**: RevenueCat abstracts both App Store and Google Play billing. Same component, same entitlement checks.

---

## Phase 4: Native Polish
**Effort**: 1-2 days

| # | Story | Details | Priority |
|---|---|---|---|
| 4.1 | Push notifications | `@capacitor/push-notifications` — streak reminders, challenge updates | P1 |
| 4.2 | Haptic feedback | `@capacitor/haptics` — rank-ups, set completions | P1 |
| 4.3 | Status bar + safe areas | Dark mode, notch handling | P0 |
| 4.4 | Splash screen + app icon | Capacitor splash screen plugin | P0 |
| 4.5 | Deep links | `applinks:refactorathletics.com` for group invites, challenge joins | P2 |
| 4.6 | Native action sheets | Replace `window.confirm()` with native dialogs | P1 |
| 4.7 | App badge | Show unread challenge notifications | P2 |

**Android reuse**: All plugins work cross-platform.

---

## Phase 5: Required for App Store
**Effort**: 1-2 days

| # | Story | Details | Priority |
|---|---|---|---|
| 5.1 | Privacy Policy page | `/privacy` — required by App Store + HealthKit | P0 |
| 5.2 | Terms of Service page | `/terms` — required for subscriptions | P0 |
| 5.3 | Account deletion | Required by App Store since 2022 — delete user data flow | P0 |
| 5.4 | Apple Developer account | $99/year | P0 |
| 5.5 | Xcode 26 setup | Required as of April 28, 2026 | P0 |
| 5.6 | App Store Connect setup | Bundle ID, certificates, provisioning profiles | P0 |
| 5.7 | Screenshots | 6.7" and 6.1" iPhone (required sizes) | P0 |
| 5.8 | App description + metadata | Keywords, category (Health & Fitness), age rating | P0 |
| 5.9 | HealthKit usage justification | Explain why each data type is needed in review notes | P0 |
| 5.10 | TestFlight beta | Internal testing before public submission | P0 |
| 5.11 | Submit for review | Usually 24-48 hour turnaround | P0 |

---

## Phase 6: Recommended v1 Features
**Effort**: 2-3 days

| # | Story | Details | Priority |
|---|---|---|---|
| 6.1 | Crash reporting | Sentry or Bugsnag for production debugging | P1 |
| 6.2 | Analytics | PostHog or Mixpanel — track onboarding completion, feature usage | P1 |
| 6.3 | Rate/review prompt | After 5th workout completion, ask for App Store review | P2 |
| 6.4 | Offline mode improvements | Queue writes when offline, sync when back online | P1 |
| 6.5 | Onboarding health permissions | HealthKit prompt at the right moment (step 10) | P0 |
| 6.6 | Loading states for native | Splash → app transition without white flash | P1 |
| 6.7 | Force update mechanism | Prompt users to update when breaking changes ship | P2 |

---

## Costs

| Item | Cost | Frequency |
|---|---|---|
| Apple Developer Program | $99 | Annual |
| Google Play Developer | $25 | One-time |
| RevenueCat | $0 | Free under $10k/mo |
| Xcode | $0 | Free |
| Capacitor + plugins | $0 | Open source |
| **Total year 1** | **$124** | |
| **Recurring** | **$99/year** | |

---

## Timeline

| Phase | Duration |
|---|---|
| Phase 1: Capacitor config | 1-2 days |
| Phase 2: HealthKit | 2-3 days |
| Phase 3: Payments | 2-3 days |
| Phase 4: Native polish | 1-2 days |
| Phase 5: App Store submission | 1-2 days |
| Phase 6: Recommended features | 2-3 days |
| **Total** | **~2-3 weeks** |

---

## Cross-Platform Strategy

95% of code stays the same. The web app runs inside Capacitor's WebView. Only native plugin calls are platform-specific, and `@capgo/capacitor-health` + RevenueCat abstract those.

**Android release after iOS**: 2-3 days max (add platform, test, submit to Google Play).

---

## What Changes vs Current PWA

| Current (PWA) | Native App |
|---|---|
| HC Webhook for health data | Direct HealthKit/Health Connect reads |
| No payments | RevenueCat subscriptions |
| Browser push (limited) | Native push notifications |
| No haptics | Native haptic feedback |
| Install prompt banner | App Store download |
| `window.confirm()` dialogs | Native action sheets |
| Service worker caching | Capacitor WebView + offline queue |
