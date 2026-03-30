# Deployment Guide

## Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string for Prisma.
- `NEXTAUTH_SECRET`: Secret used by NextAuth for session encryption and security.
- `NEXT_PUBLIC_APP_URL`: Public base URL of the deployed app (for redirects and callback URLs).
- `AUTH_URL`: Canonical auth URL for NextAuth in production.
- `AUTH_GITHUB_ID`: GitHub OAuth client ID.
- `AUTH_GITHUB_SECRET`: GitHub OAuth client secret.
- `AUTH_GOOGLE_ID`: Google OAuth client ID.
- `AUTH_GOOGLE_SECRET`: Google OAuth client secret.
- `OPEN_ROUTER_API_KEY`: API key for AI model access via OpenRouter.
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`: Public VAPI key used by voice client.
- `NEXT_PUBLIC_VAPI_ASSISTANT_ID`: VAPI assistant ID used by voice sessions.
- `STRIPE_SECRET_KEY`: Stripe secret API key used by checkout, portal, and webhooks.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret for `/api/stripe/webhook` validation.
- `STRIPE_BASIC_PRICE_ID`: Stripe price ID for BASIC plan.
- `STRIPE_PRO_PRICE_ID`: Stripe price ID for PRO plan.
- `EMAIL_USER`: SMTP email account username used by Nodemailer.
- `EMAIL_PASS`: SMTP app password used by Nodemailer.
- `EMAIL_FROM_NAME`: Display name for outgoing emails (for example: `CareAI`).
- `CRON_SECRET`: Shared bearer token for authenticated cron endpoint calls.
- `SEED_ADMIN_EMAIL`: Initial admin email for seed script.
- `SEED_ADMIN_PASSWORD`: Initial admin password for seed script.
- `SEED_ADMIN_NAME`: Initial admin display name for seed script.

## Build and Migration

1. Install dependencies:
   - `npm install`
2. Apply migrations:
   - `npm run prisma:migrate:dev`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Seed initial admin and plan records:
   - `npm run prisma:seed`
5. Build for production:
   - `npm run build`
6. Start server:
   - `npm run start`

## Stripe Setup

1. Create Stripe Products and recurring monthly Prices:
   - BASIC: $19/month
   - PRO: $49/month
2. Set `STRIPE_BASIC_PRICE_ID` and `STRIPE_PRO_PRICE_ID`.
3. Configure webhook endpoint:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Set `STRIPE_WEBHOOK_SECRET` from webhook endpoint signing secret.

## Cron Setup

Configure a monthly cron call to:

- `POST /api/cron/reset-consultations`
- Header: `Authorization: Bearer <CRON_SECRET>`

Recommended schedule: first day of every month at 00:10 UTC.

## Security Checks Before Launch

1. Ensure no secrets are committed to source control.
2. Verify `/admin` routes are inaccessible to non-admin users.
3. Verify webhook signatures are rejected on invalid signatures.
4. Verify free users are blocked after 10 consultations via API.
5. Verify paid plan entitlements are activated only through webhook sync.
