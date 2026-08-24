# OutBid — Deployment Guide

## Architecture

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Custom session-based (bcrypt + HTTP-only cookies)
- **Payments:** Razorpay (INR)
- **Deployment:** Vercel

## Environment Variables

Set these in Vercel dashboard → Settings → Environment Variables.

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | Server | PostgreSQL connection string with `?sslmode=require` |
| `RAZORPAY_KEY_ID` | Server | Razorpay Key ID (starts with `rzp_live_` or `rzp_test_`) |
| `RAZORPAY_KEY_SECRET` | Server | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Server | Razorpay Webhook signing secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client | Same as `RAZORPAY_KEY_ID` (public, safe to expose) |
| `NEXT_PUBLIC_APP_URL` | Client | Production URL (e.g. `https://outbid.vercel.app`) |

**Never expose `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, or `DATABASE_URL` with `NEXT_PUBLIC_` prefix.**

## Database Setup

### Option 1: Neon (recommended for Vercel)
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Set `DATABASE_URL` in Vercel (append `?sslmode=require` if not included)

### Option 2: Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection string (URI)
3. Use the **pooler** connection string for serverless

### Push Schema
```bash
DATABASE_URL=your-production-url npm run db:push
```

## Razorpay Setup

### Test Mode
1. Create account at [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Toggle to **Test Mode**
3. Settings → API Keys → Generate Test Key
4. Use keys starting with `rzp_test_`

### Production Mode
1. Complete KYC verification on Razorpay
2. Toggle to **Live Mode**
3. Generate live API keys (start with `rzp_live_`)
4. Update all environment variables

### Webhooks
1. Razorpay Dashboard → Settings → Webhooks
2. URL: `https://your-domain.com/api/webhooks/razorpay`
3. Events: `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`
4. Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET`

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Push schema to database
npm run db:push

# Start dev server
npm run dev

# Open Drizzle Studio (DB browser)
npm run db:studio
```

## Production Build

```bash
npm run build    # Build for production
npm run start    # Start production server locally
```

## Vercel Deployment

### First Deploy
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework: **Next.js** (auto-detected)
4. Add all environment variables listed above
5. Deploy

### Subsequent Deploys
Push to `main` branch — Vercel auto-deploys.

### Post-Deploy Checklist
- [ ] Verify `DATABASE_URL` points to production database
- [ ] Run `npm run db:push` against production database
- [ ] Verify Razorpay keys are live mode (not test)
- [ ] Set webhook URL to production domain
- [ ] Test signup → onboarding → listing → bid → payment flow
- [ ] Verify security headers with [securityheaders.com](https://securityheaders.com)

## Available Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/listings` | Public | Browse ranked listings |
| `/listings/[id]` | Public | Listing detail + bid info |
| `/signup` | Public | Create account |
| `/login` | Public | Sign in |
| `/onboarding` | Auth | Choose Personal/Organization |
| `/dashboard` | Auth | User dashboard |
| `/listings/new` | Auth | Create listing |
| `/listings/my` | Auth | Manage listings |
| `/listings/[id]/edit` | Auth + Owner | Edit listing |
| `/bids` | Auth | My bid history |

## Known Limitations

- Rate limiting uses in-memory store (resets on serverless cold starts). For production scale, use Redis (e.g. Vercel KV).
- Session cleanup (expired rows) is not automated. Add a cron job for production.
- No password reset flow yet.
- No email verification flow yet.
