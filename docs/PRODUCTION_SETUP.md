# Production Setup Guide

> Complete guide for deploying Vanguard to production.

---

## Overview

Vanguard requires the following services:

| Service | Purpose | Required |
|---------|---------|----------|
| **Convex** | Backend, database, real-time sync | Yes |
| **Clerk** | Authentication | Yes |
| **Stripe** | Billing & subscriptions | Yes |
| **Vercel** | Frontend hosting | Yes (or alternative) |
| **NWS API** | Weather alerts | Yes (no key required) |
| **PulsePoint** | Incident data | Yes (no key required) |

---

## 1. Convex Setup

### Create Production Deployment

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project → **Settings** → **Deployments**
3. Create a new **Production** deployment
4. Note your production deployment URL (e.g., `https://your-app.convex.cloud`)

### Set Convex Environment Variables

In Convex Dashboard → **Settings** → **Environment Variables**, add:

| Variable | Description | Example |
|----------|-------------|---------|
| `CLERK_JWT_ISSUER_DOMAIN` | Your Clerk frontend API domain | `https://your-app.clerk.accounts.dev` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_live_...` |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | `whsec_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Your subscription price ID | `price_...` |

### Deploy Convex Functions

```bash
npx convex deploy --prod
```

---

## 2. Clerk Setup

### Create Production Instance

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application (or use existing)
3. Switch to **Production** mode

### Configure Authentication

1. **Settings** → **Paths**:
   - Sign-in URL: `/login`
   - Sign-up URL: `/signup`
   - After sign-in URL: `/`
   - After sign-up URL: `/onboarding`

2. **Settings** → **Sessions**:
   - Set appropriate session lifetime

3. **User & Authentication** → **Email, Phone, Username**:
   - Enable email addresses (required)
   - Configure other options as needed

### Set Up Webhook

1. **Webhooks** → **Add Endpoint**
2. Endpoint URL: `https://your-convex-url.convex.site/clerk-webhook`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the **Signing Secret** → Add as `CLERK_WEBHOOK_SECRET` in Convex

### Get API Keys

From **API Keys**, copy:
- **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Secret key** → `CLERK_SECRET_KEY`

From **Settings** → **Domains**:
- Copy Frontend API domain → `CLERK_JWT_ISSUER_DOMAIN` (for Convex)

---

## 3. Stripe Setup

### Create Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Live mode**
3. **Products** → **Add Product**:
   - Name: `Vanguard Pro` (or your plan name)
   - Description: `Real-time incident tracking, weather alerts, and team collaboration for community awareness.`
   - Price: `$29.99/month` (recurring)
4. Copy the **Price ID** → `STRIPE_PRICE_ID`

### Configure Customer Portal

1. **Settings** → **Billing** → **Customer portal**
2. Enable and configure:
   - Allow customers to update payment methods
   - Allow customers to view invoice history
   - Allow customers to cancel subscriptions
3. Set the return URL to your billing page: `https://yourdomain.com/tenant/{slug}/billing`

### Set Up Webhook

1. **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-convex-url.convex.site/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Get API Keys

From **Developers** → **API keys**:
- **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (if needed client-side)
- **Secret key** → `STRIPE_SECRET_KEY`

---

## 4. Vercel Setup

### Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com)
2. **New Project** → Import your GitHub repository
3. Select **Next.js** framework preset

### Set Environment Variables

In **Settings** → **Environment Variables**, add:

#### Required Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://your-app.convex.cloud` | Production |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `CLERK_SECRET_KEY` | `sk_live_...` | Production |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | All |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup` | All |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Production |

#### Optional Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SIGNUPS_DISABLED` | `true` | Disable public signups (invite-only) |
| `NWS_USER_AGENT` | `Vanguard/1.0 (support@vanguardalerts.com)` | NWS API identification |

### Configure Domain

1. **Settings** → **Domains**
2. Add your custom domain (e.g., `vanguardalerts.com`)
3. Follow DNS configuration instructions

### Deploy

```bash
git push origin main  # or your production branch
```

Vercel will automatically deploy on push.

---

## 5. Post-Deployment Verification

### Test Checklist

- [ ] Landing page loads correctly
- [ ] Sign-in works via Clerk
- [ ] New user webhook creates user in Convex
- [ ] Onboarding flow completes (tenant creation)
- [ ] Admin approval workflow functions
- [ ] PulsePoint sync runs (check Convex logs)
- [ ] Weather sync runs (check Convex logs)
- [ ] Stripe checkout redirects correctly
- [ ] Subscription webhook updates tenant status
- [ ] Real-time updates work across browser tabs

### Webhook Verification

1. **Clerk Webhook**: Create a test user → Check Convex `users` table
2. **Stripe Webhook**: Complete a test subscription → Check tenant `subscriptionStatus`

### Monitor Initial Syncs

In Convex Dashboard → **Logs**, watch for:
- `syncPulsePointForTenant` execution
- `syncWeatherForTenant` execution
- Any error logs

---

## Environment Variables Summary

### Vercel (Next.js)

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# App
NEXT_PUBLIC_APP_URL=https://vanguardalerts.com

# Optional
NEXT_PUBLIC_SIGNUPS_DISABLED=true
NWS_USER_AGENT=Vanguard/1.0 (support@vanguardalerts.com)
```

### Convex Dashboard

```env
# Clerk
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

---

## Troubleshooting

### Clerk webhook not working
- Verify endpoint URL matches Convex HTTP endpoint
- Check webhook signing secret matches
- Review Clerk webhook logs for delivery status

### Stripe webhook not working
- Ensure you're using the correct webhook secret (not API key)
- Check Stripe webhook logs for delivery attempts
- Verify Convex function is deployed

### Syncs not running
- Check Convex cron jobs are scheduled
- Review Convex logs for errors
- Verify tenant has valid PulsePoint/weather configuration

### Authentication issues
- Ensure `CLERK_JWT_ISSUER_DOMAIN` matches your Clerk frontend API
- Verify Clerk publishable key matches environment
- Check browser console for auth errors

---

## Security Reminders

- [ ] Never commit `.env.local` or production secrets
- [ ] Use separate Clerk/Stripe accounts for dev vs prod
- [ ] Rotate webhook secrets periodically
- [ ] Monitor Convex audit logs for suspicious activity
- [ ] Enable Clerk's bot protection for sign-up
- [ ] Review Stripe radar rules for fraud prevention
