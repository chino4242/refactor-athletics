# Monetization — Stripe Integration Design

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

## Stripe Implementation

### 1. Setup
- Create Stripe account at [stripe.com](https://stripe.com)
- Get API keys (publishable + secret)
- Install packages: `stripe`, `@stripe/stripe-js`
- Environment variables:
  ```
  STRIPE_SECRET_KEY=sk_live_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_MONTHLY_PRICE_ID=price_...
  STRIPE_YEARLY_PRICE_ID=price_...
  ```

### 2. Database Migration
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
  -- values: 'free', 'trialing', 'active', 'canceled', 'past_due'
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

### 3. API Routes

**POST /api/stripe/checkout**
- Creates a Stripe Checkout Session
- Accepts `priceId` (monthly or yearly) from client
- Creates Stripe Customer if user doesn't have one
- Returns checkout URL → client redirects to Stripe-hosted payment page
- On success, Stripe redirects back to `/settings?session_id=...`

**POST /api/stripe/webhook**
- Receives Stripe webhook events
- Handles:
  - `checkout.session.completed` → set status to 'active' or 'trialing'
  - `customer.subscription.updated` → update status
  - `customer.subscription.deleted` → set status to 'canceled'
  - `invoice.payment_failed` → set status to 'past_due'
- Verifies webhook signature with `STRIPE_WEBHOOK_SECRET`

**POST /api/stripe/portal**
- Creates a Stripe Customer Portal session
- Returns portal URL → user manages billing, cancellation, payment method
- No custom billing UI needed

### 4. Client Components

**useSubscription() hook**
```typescript
// Reads subscription_status from user profile
// Returns { isPremium, status, endsAt, isTrialing }
const isPremium = ['active', 'trialing'].includes(status);
```

**Premium gate pattern**
```tsx
{isPremium ? (
  <PremiumFeature />
) : (
  <UpgradeCTA feature="Arena" />
)}
```

**UpgradeCTA component**
- Shows what the feature does
- Monthly vs yearly toggle
- "Start 14-Day Free Trial" button → calls /api/stripe/checkout
- Appears inline wherever a premium feature is gated

**Settings page additions**
- Current plan display (Free / Elite)
- "Manage Subscription" button → calls /api/stripe/portal
- Subscription end date if canceled

### 5. Stripe Dashboard Setup
1. Create Product: "Refactor Athletics Elite"
2. Create 2 Prices:
   - Monthly: $7.99/month, recurring
   - Yearly: $59.99/year, recurring
3. Enable 14-day free trial on both prices
4. Set up webhook endpoint: `https://RefactorAthletics.com/api/stripe/webhook`
5. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
6. Configure Customer Portal: allow cancellation, plan switching, payment method updates

### 6. Implementation Order
1. Stripe account + products + prices
2. Database migration
3. `/api/stripe/checkout` route
4. `/api/stripe/webhook` route
5. `/api/stripe/portal` route
6. `useSubscription()` hook
7. Gate premium features (start with Arena + screenshot parser)
8. Upgrade CTA component
9. Settings page billing section
10. Test full flow with Stripe test mode
11. Go live

### Notes
- Use Stripe test mode (`sk_test_`, `pk_test_`) during development
- Stripe Checkout handles all PCI compliance — no card data touches our server
- Customer Portal handles cancellation/billing — minimal support burden
- Free trial doesn't require a migration — Stripe manages trial state
- Consider grandfathering early users with lifetime premium access
