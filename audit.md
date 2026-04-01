# Codebase Audit Report
Generated: 2026-04-02
Audited by: AI Architect Agent

---

## 1. Project Overview
- Frontend: Next.js 16 App Router + React 19 + TypeScript + Tailwind/shadcn UI
- Backend: Next.js Route Handlers (Node runtime) + shared lib services
- DB: PostgreSQL (Neon adapters) via Prisma ORM
- Auth: NextAuth v5 (Prisma adapter) with Google/GitHub OAuth + credentials + CAPTCHA escalation/lockout logic
- Payments: Stripe Checkout + Billing Portal + Webhook synchronization
- Infra/ops: Cron-triggered API routes, Prisma migrations, Biome linting, no CI workflow files detected
- Total files audited: 208 (excluding node_modules/.git/build artifacts and temporary audit artifacts)
- Total lines of code (approx): 54,210
- Overall health score: Fair — strong feature breadth and billing/auth foundations, but low test/CI/observability maturity and several oversized mixed-concern files.

---

## 2. Architecture Map
Brief description of each feature domain, which files own it, and its health status.

| Domain | Files | Status | Notes |
|---|---|---|---|
| Auth | src/auth.ts, src/lib/actions/auth.ts, src/lib/security/rate-limit.ts, src/app/(auth)/**, src/app/api/auth/[...nextauth]/route.ts | Good | Credentials + OAuth + lockout/CAPTCHA present; file size in src/auth.ts is high (757 LOC). |
| User Management | src/app/api/user/usage/route.ts, src/app/(routes)/admin/users/**, src/lib/admin.ts | Good | Role-aware admin/user surfaces exist; admin action logging helper exists but is not currently used. |
| Billing & Subscriptions | src/app/api/billing/checkout/route.ts, src/app/api/billing/portal/route.ts, src/app/api/stripe/webhook/route.ts, src/lib/billing/**, src/lib/stripe.ts | Good | Checkout/portal/webhook pipeline exists and syncs entitlements; some duplication remains in time-window helpers and response patterns. |
| Onboarding & Activation | src/app/api/cron/growth-automation/route.ts, src/lib/email-templates.ts, src/app/(routes)/dashboard/** | Incomplete | Lifecycle emails and retargeting exist; no durable queue/retry orchestration for campaign failures. |
| Core Product (Consultation Flow) | src/app/api/session-chat/route.ts, src/app/api/consultation-funnel/route.ts, src/app/(routes)/dashboard/medical-agent/** | Good | Gating + funnel events + report tiering exist; handler files are large and mix business rules with transport concerns. |
| Notifications & Email | src/lib/mail.ts, src/lib/email-templates.ts, src/lib/alerts.ts, cron routes | Good | Transactional and growth templates are broad; no template test suite and no delivery retry queue abstraction. |
| Analytics & Tracking | src/lib/analytics/pixels.ts, src/components/analytics/**, src/app/api/consultation-funnel/route.ts, audit logging in routes | Incomplete | Core events exist (consultation/upgrade signals), but no centralized funnel dashboard or event schema governance. |
| Admin & Risk | src/app/(routes)/admin/**, src/app/api/admin/risk/generate/route.ts, src/app/api/cron/risk-monitoring/route.ts | Good | Risk generation + monitoring and alerts present; heavy logic concentration in route handlers. |
| SEO & Content | src/lib/seo.ts, src/lib/seo.config.ts, src/lib/structured-data.ts, src/app/sitemap.ts, src/app/robots.ts, src/app/blog/**, src/app/faq/**, src/app/symptoms/** | Good | Strong metadata/sitemap/schema and content clusters; no Core Web Vitals collection pipeline in repo. |
| API Layer | src/app/api/** | Fair | 15 API route handlers with broad coverage; only 7 use Zod and only 7 enforce CSRF where relevant. |
| Background Jobs | src/app/api/cron/growth-automation/route.ts, src/app/api/cron/risk-monitoring/route.ts, src/app/api/cron/reset-consultations/route.ts | Fair | Authenticated cron endpoints are present; retry and dead-letter handling are missing. |
| Error Handling | try/catch in route handlers, withApiRequestAudit wrappers, audit logs | Fair | Structured audit logging is widespread; no external error-monitoring SDK integration detected. |

---

## 3. Duplication & Reusability Report

### 3a. Duplications Found & Fixed
List every refactoring completed in Phase 2.

| Original locations | Extracted to | Type |
|---|---|---|
| src/app/api/cron/growth-automation/route.ts, src/app/api/cron/risk-monitoring/route.ts, src/app/api/cron/reset-consultations/route.ts | src/lib/security/cron.ts | Utility function (shared cron bearer auth guard) |
| src/app/api/cron/growth-automation/route.ts, src/app/api/cron/risk-monitoring/route.ts, src/app/api/cron/reset-consultations/route.ts | src/lib/utils/utc-date.ts | Utility functions (shared UTC month/week window helpers) |

### 3b. Remaining Duplication (manual review needed)
List any duplication that was too risky to auto-refactor (e.g., subtle behavioral differences).

- getAppBaseUrl logic appears both in src/app/api/cron/growth-automation/route.ts and src/lib/billing/stripe-config.ts.
- getCurrentCycleStart still exists in src/app/api/stripe/webhook/route.ts and can be aligned to src/lib/utils/utc-date.ts.
- AGENT_ID literal is repeated across multiple API modules; consider one shared telemetry constants module.
- NextResponse error payload shaping and catch-block logging patterns are repeated in many route handlers.

---

## 4. What Has Been Implemented ✅
List every feature/functionality that exists and works. Be specific.

### Core Product
- [x] Consultation session creation/update and report generation in src/app/api/session-chat/route.ts.
- [x] Consultation funnel event capture in src/app/api/consultation-funnel/route.ts.
- [x] Doctor recommendation engine with plan-aware model routing in src/app/api/suggest-doctor/route.ts.

### Auth & Users
- [x] NextAuth credentials + OAuth providers wired in src/auth.ts.
- [x] Rolling failed-login controls, CAPTCHA escalation, and temporary lockout handling in src/auth.ts + src/lib/security/rate-limit.ts.
- [x] User usage entitlement API in src/app/api/user/usage/route.ts.

### Billing & Revenue
- [x] Stripe checkout flow in src/app/api/billing/checkout/route.ts.
- [x] Stripe billing portal flow in src/app/api/billing/portal/route.ts.
- [x] Stripe webhook event processing with invoice/payment/subscription sync in src/app/api/stripe/webhook/route.ts.
- [x] Plan gating and entitlement checks in src/lib/billing/entitlements.ts, src/lib/billing/plan-gate.ts, src/lib/billing/plans.ts.

### Onboarding & Activation
- [x] Multi-step onboarding lifecycle and growth campaigns in src/app/api/cron/growth-automation/route.ts.
- [x] Exit-intent lead capture component and endpoint in src/components/marketing/ExitIntentLeadCapture.tsx and src/app/api/marketing/lead-capture/route.ts.
- [x] Guided upgrade flow modal in src/app/pricing/_components/GuidedUpgradeFlow.tsx.

### Notifications & Email
- [x] Transactional templates (payment confirmation/failure/cancellation) in src/lib/email-templates.ts.
- [x] Growth templates (weekly campaign, onboarding lifecycle, abandoned consultation, weekly incomplete summary, disengagement survey) in src/lib/email-templates.ts.
- [x] Alert channels for revenue/security/growth in src/lib/alerts.ts.

### SEO & Content
- [x] Metadata builder and SEO config in src/lib/seo.ts and src/lib/seo.config.ts.
- [x] Structured data generation in src/lib/structured-data.ts.
- [x] Sitemap/robots and content hubs in src/app/sitemap.ts, src/app/robots.ts, src/app/blog/**, src/app/faq/**, src/app/symptoms/**.

### Analytics & Tracking
- [x] Marketing pixel abstraction in src/lib/analytics/pixels.ts.
- [x] Consultation/upgrade tracking wired in dashboard and pricing surfaces.
- [x] Request/audit logging wrappers in src/lib/api/request-audit.ts and route handlers.

### Admin & Internal Tools
- [x] Admin dashboards for users/billing/logs/risk in src/app/(routes)/admin/**.
- [x] AI-assisted risk generation endpoint in src/app/api/admin/risk/generate/route.ts.
- [x] Campaign scheduler endpoint in src/app/api/admin/campaigns/scheduler/route.ts.

### Infrastructure & DevOps
- [x] Prisma schema/migrations and generated client in prisma/** and src/lib/generated/prisma/**.
- [x] Build/lint scripts in package.json with Next build + Biome.
- [x] Authenticated cron endpoints with secret validation.

---

## 5. What Is Incomplete or Broken ⚠️
Features that exist but are partial, buggy, or not wired end-to-end.

| Feature | Location | Gap | Priority |
|---|---|---|---|
| Public API abuse protection | src/app/api/suggest-doctor/route.ts, src/app/api/marketing/lead-capture/route.ts | No explicit per-endpoint rate limiter; vulnerable to automated abuse/spam despite auth checks on some routes. | CRITICAL |
| End-to-end test coverage | repository-wide | No test files detected (*.test / *.spec / __tests__). Regression risk is high for billing/auth/growth automation. | CRITICAL |
| CI/CD automation | repository root | No CI workflow files detected (.github/workflows etc.). Build/lint/test gates are not enforced automatically. | HIGH |
| Error monitoring | src/** | No Sentry/Datadog/Rollbar integration detected; only console/audit logs. Incident triage latency risk. | HIGH |
| Growth automation resilience | src/app/api/cron/growth-automation/route.ts | No queue, retry backoff, or dead-letter flow for partial email/API failures. | HIGH |
| Route-level validation consistency | src/app/api/** | 7/15 API route handlers use Zod; several endpoints rely on implicit assumptions. | MEDIUM |
| Legacy route alias visibility | src/app/api/stripe/checkout/route.ts, src/app/api/stripe/portal/route.ts | Aliases work but route analysis can misclassify controls because wrappers are delegated; document this clearly in API conventions. | LOW |

---

## 6. What Should Be Built Next 🚀
Recommended features to scale the product, grow traffic, and close more sales.
Ordered by business impact.

### 6a. Revenue & Conversion (Highest ROI)
- Dynamic upgrade offer engine (segment + behavior aware)
  Why: Current prompts are rule-based and static; conversion lift depends on contextual targeting.
  What to build: Offer service keyed by plan, usage, abandonment step, and referral source; A/B test offer variants and CTA copy.
  Estimated effort: M

- Failed-payment recovery sequence with auto-dunning
  Why: Payment failure currently logs and emails, but lacks staged retry incentives and in-app urgency loops.
  What to build: Dunning schedule (T+0, T+2, T+5), card update nudges, temporary grace state, recovery metrics dashboard.
  Estimated effort: M

- Admin conversion funnel dashboard
  Why: Events exist but are not assembled into decision-ready conversion metrics.
  What to build: Signup -> first consultation -> paywall hit -> checkout started -> payment succeeded funnel view with cohort slicing.
  Estimated effort: M

### 6b. Retention & Engagement
- Lifecycle orchestration queue
  Why: Growth cron is monolithic and synchronous.
  What to build: Job queue (e.g., BullMQ/Cloud Tasks), idempotent jobs, retry policies, dead-letter storage, replay tooling.
  Estimated effort: L

- Re-engagement personalization
  Why: Current campaigns are mostly templated by broad segments.
  What to build: Last specialty, last symptom cluster, and usage trend personalization for reactivation campaigns.
  Estimated effort: M

### 6c. Acquisition & SEO
- Programmatic long-tail symptom landing pages
  Why: Existing SEO foundation can scale materially with targeted pages.
  What to build: Controlled symptom-template generator, internal link graph expansion, schema-rich FAQ blocks, editorial review workflow.
  Estimated effort: M

- Technical SEO monitoring pipeline
  Why: Sitemap and metadata exist, but there is no automated health signal.
  What to build: Scheduled checks for sitemap freshness, broken links, missing metadata/schema, and CWV trend snapshots.
  Estimated effort: S

### 6d. Operational Scalability
- Observability baseline
  Why: Console + DB logs are insufficient under scale incidents.
  What to build: Error monitoring SDK, structured request IDs, alert routing, SLO-based escalation for billing/auth/cron failures.
  Estimated effort: M

- API protection hardening
  Why: Public endpoints lack consistent throttling and bot checks.
  What to build: Shared rate-limit middleware for route handlers + optional bot challenge for abusive patterns.
  Estimated effort: S

### 6e. Developer Experience & Code Quality
- Contract tests for billing/auth/core APIs
  Why: No automated tests in critical flows.
  What to build: API integration tests for checkout/webhook/session-chat/auth lockout behavior.
  Estimated effort: M

- Route handler service-layer extraction
  Why: Several route handlers are over 400 LOC and blend orchestration with domain rules.
  What to build: Move business logic into domain services under src/lib/** with slim transport handlers.
  Estimated effort: L

---

## 7. Dead Code & Cleanup
List all unused exports, orphaned files, or commented-out blocks found.

| File | Symbol / Block | Action |
|---|---|---|
| src/lib/actions/auth.ts | revokeUserSessions() | Candidate cleanup: no references found via repository symbol search; remove or wire explicitly. |
| src/lib/admin.ts | logAdminAction() | Candidate cleanup: no references found; either integrate in admin routes or delete. |
| src/lib/blog.ts | getPublishedBlogSlugs() | Candidate cleanup: no references found; remove if not planned for future routing. |
| src/lib/content/growth-seo.ts | findFaqTopicCluster() | Candidate cleanup: no references found; remove or integrate in FAQ topic route composition. |
| output.txt | ad-hoc artifact file | Delete if no operational use; appears to be non-runtime repository artifact. |

---

## 8. Security & Reliability Flags
Any hardcoded secrets, missing validation, unhandled errors, or missing rate limits.

| Severity | File | Issue | Recommended Fix |
|---|---|---|---|
| HIGH | prisma/seed.ts | Default seed credentials include fallback password value. | Require explicit env values in non-local environments; fail hard when defaults are used outside development. |
| HIGH | src/app/api/suggest-doctor/route.ts | No explicit route rate limiting despite expensive LLM calls. | Add shared request throttling and abuse detection keyed by user/IP. |
| HIGH | src/app/api/marketing/lead-capture/route.ts | Public lead-capture endpoint has no explicit rate limiting/captcha. | Add bot mitigation and rate limits; optionally double opt-in workflow. |
| HIGH | src/** | No external error-monitoring SDK integration detected. | Add Sentry (or equivalent) to capture exceptions, traces, and release health. |
| MEDIUM | src/app/api/** (multiple) | Validation and CSRF coverage are inconsistent by route category. | Standardize route middleware template: auth + csrf + schema validation + audit wrapper. |
| MEDIUM | src/app/api/cron/growth-automation/route.ts | No retry/dead-letter strategy for campaign sends. | Move dispatch to queue with retry/backoff and failure replay tooling. |

---

## 9. Quick Wins (implement in under 2 hours each)
Low-effort, high-impact items that can ship immediately.

1. Add rate-limit middleware to suggest-doctor and lead-capture endpoints using the existing security utilities.
2. Add a shared API route checklist utility/template (auth/csrf/zod/audit) and apply it to remaining handlers.
3. Add basic GitHub Actions workflow for npm ci + npm run build + targeted lint to prevent regressions on merge.

---

## 10. Refactoring Summary
- Total duplications resolved: 2
- Files modified: 5
- Files created (shared utilities): 2
- Lines removed through consolidation: ~73
- Shared modules created: src/lib/security/cron.ts, src/lib/utils/utc-date.ts
