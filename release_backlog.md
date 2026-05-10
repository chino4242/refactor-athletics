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
**Effort**: 1-2 days — ✅ COMPLETE

| # | Story | Details | Status |
|---|---|---|---|
| 1.1 | Add Capacitor to the project | `npm i @capacitor/core @capacitor/cli @capacitor/ios` | ✅ |
| 1.2 | Configure static export | N/A — using remote URL approach | ⏭️ Skipped |
| 1.3 | Create `capacitor.config.ts` | `webDir: 'out'`, remote URL to refactorathletics.com | ✅ |
| 1.4 | Add iOS platform | `npx cap add ios` | ✅ |
| 1.5 | Fix routing for static export | N/A — server-side routing works via remote URL | ⏭️ Skipped |
| 1.6 | Environment detection | `isNative()`, `getPlatform()` in `src/utils/platform.ts` | ✅ |
| 1.7 | Test in iOS Simulator | `npx cap open ios` → Run in Xcode | ⬜ Manual |

**Android reuse**: Everything except `npx cap add ios`.

---

## Phase 2: HealthKit Integration
**Effort**: 2-3 days — ✅ COMPLETE

| # | Story | Details | Status |
|---|---|---|---|
| 2.1 | Install `@capgo/capacitor-health` | Unified HealthKit + Health Connect plugin | ✅ |
| 2.2 | Enable HealthKit capability in Xcode | Entitlements file created, enable in Xcode manually | ⬜ Manual |
| 2.3 | Add Info.plist usage descriptions | `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` | ✅ |
| 2.4 | Build native health sync service | `src/services/nativeHealth.ts` — reads all data types | ✅ |
| 2.5 | Permission request flow | `requestHealthPermissions()` ready, wire to onboarding step 10 | ✅ |
| 2.6 | Replace HC Webhook for native users | Dashboard auto-syncs via native when available | ✅ |
| 2.7 | Background health fetch | Capacitor Background Runner | ⬜ Post-launch |
| 2.8 | Write workouts to HealthKit | API ready in plugin, not yet wired | ⬜ Post-launch |

**Data types**: Steps, Sleep, Active Calories, Weight, Heart Rate, HRV, Exercise Sessions, Body Fat, Lean Body Mass

**Android reuse**: `@capgo/capacitor-health` API is identical on both platforms. Service file works unchanged.

---

## Phase 3: Payments / Subscriptions
**Effort**: 2-3 days — ✅ CODE COMPLETE (needs RevenueCat account setup)

| # | Story | Details | Status |
|---|---|---|---|
| 3.1 | Create RevenueCat account | Free under $10k/mo tracked revenue | ⬜ Manual |
| 3.2 | Configure products in App Store Connect | Monthly ($7.99) + Annual ($59.99) | ⬜ Manual |
| 3.3 | Install `@revenuecat/purchases-capacitor` | | ✅ |
| 3.4 | Build paywall component | `src/components/Paywall.tsx` | ✅ |
| 3.5 | Define free vs pro features | `useSubscription()` hook + `SubscriptionContext` | ✅ |
| 3.6 | Restore purchases flow | `restorePurchases()` in purchases.ts | ✅ |
| 3.7 | RevenueCat webhook → Supabase | Update `users.subscription_tier` on purchase/cancel | ⬜ Post-launch |
| 3.8 | Trial period | Configure in App Store Connect | ⬜ Manual |

**Subscription tiers**:
- **Free**: Core tracking, basic habits, 1 ranked exercise, manual logging
- **Pro ($7.99/mo or $59.99/yr)**: Unlimited ranks, health sync, group challenges, all themes, workout programs, AI features

**Android reuse**: RevenueCat abstracts both App Store and Google Play billing. Same component, same entitlement checks.

---

## Phase 4: Native Polish
**Effort**: 1-2 days — ✅ CORE COMPLETE

| # | Story | Details | Status |
|---|---|---|---|
| 4.1 | Push notifications | `@capacitor/push-notifications` — needs Apple Push cert | ⬜ Post-launch |
| 4.2 | Haptic feedback | `src/utils/haptics.ts` — hapticImpact, hapticNotification, hapticSelection | ✅ |
| 4.3 | Status bar + safe areas | Dark mode via NativeInit + capacitor config | ✅ |
| 4.4 | Splash screen + app icon | Splash configured (zinc-950), app icon needs custom asset | ⬜ Need icon |
| 4.5 | Deep links | `applinks:refactorathletics.com` | ⬜ Post-launch |
| 4.6 | Native action sheets | End Workout modal done, others use styled modals | ✅ |
| 4.7 | App badge | Show unread challenge notifications | ⬜ Post-launch |

**Android reuse**: All plugins work cross-platform.

---

## Phase 5: Required for App Store
**Effort**: 1-2 days — ✅ CODE COMPLETE (manual steps remain)

| # | Story | Details | Status |
|---|---|---|---|
| 5.1 | Privacy Policy page | `/privacy` | ✅ |
| 5.2 | Terms of Service page | `/terms` | ✅ |
| 5.3 | Account deletion | Settings → Delete Account (API + UI) | ✅ |
| 5.4 | Apple Developer account | $99/year | ⬜ Manual |
| 5.5 | Xcode 26 setup | Required as of April 28, 2026 | ⬜ Manual |
| 5.6 | App Store Connect setup | Bundle ID, certificates, provisioning profiles | ⬜ Manual |
| 5.7 | Screenshots | 6.7" and 6.1" iPhone (see APP_STORE_METADATA.md) | ⬜ Manual |
| 5.8 | App description + metadata | Written in APP_STORE_METADATA.md — copy/paste | ✅ |
| 5.9 | HealthKit usage justification | Written in APP_STORE_METADATA.md review notes | ✅ |
| 5.10 | TestFlight beta | Archive → Upload → Test | ⬜ Manual |
| 5.11 | Submit for review | Usually 24-48 hour turnaround | ⬜ Manual |

---

## Phase 6: Recommended v1 Features
**Effort**: 2-3 days — ⬜ POST-LAUNCH

| # | Story | Details | Status |
|---|---|---|---|
| 6.1 | Crash reporting | Sentry or Bugsnag for production debugging | ⬜ |
| 6.2 | Analytics | PostHog or Mixpanel — track onboarding completion, feature usage | ⬜ |
| 6.3 | Rate/review prompt | After 5th workout completion, ask for App Store review | ⬜ |
| 6.4 | Offline mode improvements | Queue writes when offline, sync when back online | ⬜ |
| 6.5 | Onboarding health permissions | HealthKit prompt at the right moment (step 10) | ✅ Code ready |
| 6.6 | Loading states for native | Splash → app transition without white flash | ✅ |
| 6.7 | Force update mechanism | Prompt users to update when breaking changes ship | ⬜ |

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
