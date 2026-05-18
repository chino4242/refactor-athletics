# Monetization Design — Unified Payment Strategy

> **Decision (May 2026):** Use both RevenueCat (native IAP) and Stripe (web/PWA). Both write to the same `subscription_status` field in Supabase. The app checks entitlement from Supabase regardless of payment source.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Supabase (users table)                 │
│  subscription_status: 'free'|'active'|'trialing'|...    │
│  subscription_source: 'stripe'|'apple'|'google'         │
│  subscription_ends_at: timestamptz                       │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
    ┌──────────▼──────────┐    ┌─────────▼─────────────┐
    │  Stripe Webhook     │    │  RevenueCat Webhook    │
    │  /api/stripe/webhook│    │  /api/rc/webhook       │
    └──────────▲──────────┘    └─────────▲─────────────┘
               │                          │
    ┌──────────┴──────────┐    ┌─────────┴─────────────┐
    │  Web / PWA Users    │    │  iOS / Android Users   │
    │  Stripe Checkout    │    │  Native IAP (RevenueCat│
    │  (2.9% + $0.30)    │    │  Apple 15-30% / Google)│
    └─────────────────────┘    └───────────────────────┘
```

**Key principle:** The client-side `useSubscription()` hook reads `subscription_status` from Supabase. It never knows or cares which provider charged the user.

---

## Pricing Tiers

### Free — "Recruit"
Everything needed to track and improve:
- Log workouts (unlimited)
- Log macros & habits
- Body composition tracking (tape & scale modes)
- Rank calculator (performance level per exercise)
- Power Level score
- Basic dashboard with daily goals
- 1 custom workout program
- PWA / offline support

### Premium — "Elite" ($7.99/mo or $59.99/yr)
RPG layer + power user features:
- Everything in Free
- RPG mode (themes, character system, gear shop)
- Unlimited workout programs
- Workout text parser & screenshot auto-log (Claude API)
- Arena (duels & challenges)
- Groups / Party system
- Consistency heatmaps & streak tracking
- Weekly workout reports
- Priority on future features (story mode, PvE combat)
- 14-day free trial

### Gating Logic
| Feature | Free | Premium |
|---|---|---|
| Log workouts | ✅ | ✅ |
| Log macros & habits | ✅ | ✅ |
| Body composition | ✅ | ✅ |
| Rank calculator | ✅ | ✅ |
| Power Level | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Workout programs | 1 | Unlimited |
| RPG mode & themes | ❌ | ✅ |
| Character & gear shop | ❌ | ✅ |
| Screenshot auto-log | ❌ | ✅ |
| Workout text parser | ❌ | ✅ |
| Arena (duels/challenges) | ❌ | ✅ |
| Groups / Party | ❌ | ✅ |
| Heatmaps & streaks | ❌ | ✅ |
| Weekly reports | ❌ | ✅ |

---

## Database Migration

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
  -- values: 'free', 'trialing', 'active', 'canceled', 'past_due'
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_source TEXT;
  -- values: 'stripe', 'apple', 'google'
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rc_customer_id TEXT;
```

---

## Platform A: Stripe (Web / PWA)

Used when the user is on the web or PWA — no App Store rules apply.

### Setup
- Stripe account at [stripe.com](https://stripe.com)
- Packages: `stripe`, `@stripe/stripe-js`
- Environment variables:
  ```
  STRIPE_SECRET_KEY=sk_live_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_MONTHLY_PRICE_ID=price_...
  STRIPE_YEARLY_PRICE_ID=price_...
  ```

### API Routes

**POST /api/stripe/checkout**
- Creates Stripe Checkout Session (monthly or yearly)
- Creates Stripe Customer if needed
- Returns checkout URL → redirect to Stripe-hosted payment
- On success, redirects back to `/settings?session_id=...`

**POST /api/stripe/webhook**
- Verifies signature with `STRIPE_WEBHOOK_SECRET`
- Handles events:
  - `checkout.session.completed` → set `subscription_status = 'active'` (or 'trialing'), `subscription_source = 'stripe'`
  - `customer.subscription.updated` → update status
  - `customer.subscription.deleted` → set status to 'canceled'
  - `invoice.payment_failed` → set status to 'past_due'

**POST /api/stripe/portal**
- Creates Stripe Customer Portal session for self-service billing management

### Stripe Dashboard Setup
1. Product: "Refactor Athletics Elite"
2. Prices: $7.99/month recurring, $59.99/year recurring
3. 14-day free trial on both
4. Webhook: `https://refactorathletics.com/api/stripe/webhook`
5. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
6. Customer Portal: cancellation, plan switching, payment method updates

---

## Platform B: RevenueCat (iOS / Android)

Used when the user is in the native app. Required by App Store / Google Play for digital goods.

### Setup
- RevenueCat account (free under $10k/mo tracked revenue)
- Package: `@revenuecat/purchases-capacitor`
- Configure products in App Store Connect + Google Play Console
- Environment variables:
  ```
  REVENUECAT_API_KEY_APPLE=appl_...
  REVENUECAT_API_KEY_GOOGLE=goog_...
  REVENUECAT_WEBHOOK_SECRET=...
  ```

### App Store Connect Products
- Monthly: `com.refactorathletics.elite.monthly` — $7.99/month
- Annual: `com.refactorathletics.elite.annual` — $59.99/year
- 14-day free trial on annual plan (7-day on monthly)

### Native Implementation

**Initialization (app startup):**
```typescript
import { Purchases } from '@revenuecat/purchases-capacitor';

await Purchases.configure({
  apiKey: Platform.select({
    ios: REVENUECAT_API_KEY_APPLE,
    android: REVENUECAT_API_KEY_GOOGLE,
  }),
  appUserID: supabaseUserId, // Link RC customer to Supabase user
});
```

**Paywall component (`src/components/Paywall.tsx`):**
- Shows available packages (monthly/annual)
- Handles purchase via `Purchases.purchasePackage()`
- Handles restore via `Purchases.restorePurchases()`
- On success, RevenueCat webhook updates Supabase

**Entitlement check (native):**
```typescript
// Optional: check RevenueCat directly for instant feedback
const { customerInfo } = await Purchases.getCustomerInfo();
const isPremium = customerInfo.entitlements.active['elite'] !== undefined;
```

### RevenueCat Webhook → Supabase

**POST /api/rc/webhook**
- Verifies webhook auth header
- Handles events:
  - `INITIAL_PURCHASE` → set `subscription_status = 'active'`, `subscription_source = 'apple'|'google'`
  - `RENEWAL` → update `subscription_ends_at`
  - `CANCELLATION` → set status to 'canceled'
  - `BILLING_ISSUE` → set status to 'past_due'
  - `EXPIRATION` → set status to 'free'
- Maps RevenueCat `app_user_id` to Supabase `user_id`

---

## Shared Client Logic

### useSubscription() hook
```typescript
// Reads from Supabase user profile — platform-agnostic
export function useSubscription() {
  const { user } = useUser();
  const status = user?.subscription_status ?? 'free';
  return {
    isPremium: ['active', 'trialing'].includes(status),
    status,
    source: user?.subscription_source, // 'stripe' | 'apple' | 'google'
    endsAt: user?.subscription_ends_at,
    isTrialing: status === 'trialing',
  };
}
```

### Premium gate pattern
```tsx
{isPremium ? (
  <PremiumFeature />
) : (
  <UpgradeCTA feature="Arena" />
)}
```

### UpgradeCTA behavior by platform
- **Web/PWA:** "Start Free Trial" → Stripe Checkout redirect
- **Native (iOS/Android):** "Start Free Trial" → RevenueCat purchase sheet
- Detect platform via `Capacitor.isNativePlatform()`

### Settings page
- Current plan display (Free / Elite)
- **Web:** "Manage Subscription" → Stripe Customer Portal
- **Native:** "Manage Subscription" → deep link to App Store / Google Play subscription settings
- Subscription end date if canceled
- "Restore Purchases" button (native only, required by App Store)

---

## Edge Cases

| Scenario | Resolution |
|---|---|
| User subscribes on web, opens native app | App reads `subscription_status = 'active'` from Supabase. Works. |
| User subscribes on iOS, opens web | Same — reads from Supabase. Works. |
| User tries to subscribe on iOS when already active via Stripe | Check `subscription_status` before showing paywall. If active, don't show. |
| User cancels on Stripe, tries to re-subscribe on iOS | Stripe webhook sets status to 'canceled' → `subscription_ends_at` passes → status becomes 'free' → native paywall appears. |
| User has both Stripe + IAP active | Shouldn't happen if paywall checks status first. If it does, honor whichever expires later. |

---

## Implementation Order

### Phase 1: Foundation (do first)
1. Database migration (add subscription columns)
2. `useSubscription()` hook
3. Premium gate pattern on 2-3 features (Arena, screenshot parser)
4. UpgradeCTA component (platform-aware)

### Phase 2: Stripe (web payments)
5. Stripe account + products + prices
6. `/api/stripe/checkout` route
7. `/api/stripe/webhook` route
8. `/api/stripe/portal` route
9. Settings page billing section (web)
10. Test full flow with Stripe test mode

### Phase 3: RevenueCat (native payments)
11. RevenueCat account + App Store Connect products
12. Install `@revenuecat/purchases-capacitor`
13. RC initialization on app startup
14. Paywall component
15. `/api/rc/webhook` route
16. Restore purchases flow
17. Settings page billing section (native)
18. Test with sandbox accounts

### Phase 4: Go live
19. Stripe live mode
20. App Store review (subscriptions require extra review)
21. Monitor webhooks from both providers

---

## Costs

| Item | Cost | Notes |
|---|---|---|
| RevenueCat | $0 | Free under $10k/mo tracked revenue |
| Stripe | 2.9% + $0.30 per transaction | Only on web payments |
| Apple | 15% (first year) / 30% (after) | On iOS IAP only |
| Google | 15% (first $1M) / 30% (after) | On Android IAP only |

---

## Notes
- Use Stripe test mode (`sk_test_`) and RevenueCat sandbox during development
- Stripe Checkout handles PCI compliance — no card data touches our server
- RevenueCat handles receipt validation — no StoreKit/billing library code needed
- Consider grandfathering early users with lifetime premium access
- **App Store rule:** Do NOT mention web pricing or link to web payment from within the native app
- Web users can be offered a slight discount (e.g., $6.99/mo) since there's no platform cut — optional future optimization
