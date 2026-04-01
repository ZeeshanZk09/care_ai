# CareAI Remediation Status Report

- Generated at: 2026-04-01T10:48:00Z
- Agent ID: GPT-5.3-Codex
- Source risk score: 78 / 100

## T1 - MRR Tracking and PRO Plan Audit

### T1 Findings

- Current MRR: 0 cents (current month payment aggregate).
- PRO users in database: 1 (admin account).
- Local PRO subscription records: 0.
- Stripe customer id on PRO user: missing.
- Stripe provider audit: 0 subscriptions found; no active paid subscription detected.

### T1 Actions Completed

- Added daily monitoring endpoint: `/api/cron/risk-monitoring`.
- Added MRR threshold constant ($200 = 20,000 cents) and daily audit logging.
- Added zero-MRR alert dispatch and 72-hour escalation path to human operators.
- Added MRR threshold context to AI risk snapshot generation.
- Added billing dashboard card showing current MRR vs threshold.
- Added PRO billing audit panel with flagged-account reactivation email drafts.

### T1 Pending Confirmation

- No subscriber notification email was sent automatically.
- No billing reactivation was executed automatically.
- Manual confirmation is required before notifying the flagged PRO user or changing billing state.

## T2 - Free-to-Paid Conversion Campaign

### T2 Feature Gate Audit

- FREE plan:
  - 10 one-time consultations.
  - Standard models only.
  - No paid-specialist-only consultations.
- BASIC plan:
  - 50 consultations/month.
  - Specialist routing enabled.
  - No premium model access.
- PRO plan:
  - Unlimited consultations.
  - Premium models.
  - Comprehensive reports.

### T2 Actions Completed

- Implemented 3-step in-app upgrade prompts triggered on the 3rd, 6th, and 9th FREE consultation.
- Wired prompt payload from backend (`/api/session-chat`) to dashboard UI CTA flow.
- Updated FREE-user campaign draft links to personalized 30%-off Pro offer copy (7-day validity, code `CARE30`).
- Added conversion KPI card in billing dashboard: target >=2 FREE->paid conversions within 30 days.
- Added BASIC tier proposal card (pending confirmation): $24/mo (~49% of Pro), strict subset of PRO capabilities.

### T2 Pending Confirmation

- Campaign emails remain drafts only; no outbound campaign send was executed.

## T3 - Consultation Volume Root-Cause Analysis

### T3 Timeline Evidence

- Last March consultation: 2026-03-31T19:09:36.169Z.
- First April consultation: 2026-04-01T04:19:31.636Z.
- Consultation daily counts (Mar 25 - Apr 1):
  - 2026-03-30: 3
  - 2026-03-31: 14
  - 2026-04-01: 1

### T3 Deployment Correlation (Mar 25 - Apr 1)

- 2026-03-29: initial care app baseline.
- 2026-03-30: major auth, billing, plan entitlement, and admin monitoring rollout.
- 2026-03-31: auth/prisma updates and content/SEO updates.
- No single deployment error signature directly maps to an outage; activity suggests behavior change risk after major auth/billing rollout.

### T3 Error Pattern (Mar 25 - Apr 1)

- API logs:
  - 2026-03-30: 209 total, 3 with 4xx/5xx.
  - 2026-03-31: 306 total, 5 with 4xx/5xx.
  - 2026-04-01: 51 total, 0 with 4xx/5xx.
- No severe error spike aligned with the consultation drop.

### T3 Disengagement Survey

- Candidate recipients (consulted in March but not April): 6 users identified.
- Survey questions prepared:
  1. What was the main reason you did not start a consultation in April?
  2. Did anything in the app experience make consultations harder to begin or complete?
  3. How satisfied were you with consultation quality in March (1-5)?
  4. What feature would most increase your likelihood to return this month?
  5. Would a limited-time Pro discount motivate you to resume consultations?

### T3 Root-Cause Hypothesis (48h Draft)

- Most likely cause is conversion and activation friction after auth/billing/security changes, not a reliability outage.
- Secondary contributors: value communication gap for FREE users and insufficient retention nudges after high-intent sessions.

### T3 Recommended Corrective Actions

- Run confirmation-gated disengagement survey send to the 6-user cohort.
- Pair survey with a 7-day CARE30 incentive and one-click upgrade CTA.
- Add onboarding nudge after successful consultation #1 and #2 to reduce April churn.

### T3 Pending Confirmation

- No disengagement survey emails were sent automatically.

## T4 - Login Security Hardening

### T4 Findings

- Latest failed login event reviewed.
- Failed IP in last event: 103.244.176.38.
- Match with successful known IP for same user: no matches found.

### T4 Actions Completed

- Updated credential rate limit to 5 failed attempts per IP per 10 minutes.
- Implemented CAPTCHA soft-lock flow after rate-limit breach.
- Added sign-in UI handling for CAPTCHA challenge responses.
- Added real-time security alert trigger when an IP exceeds 3 failed logins in 5 minutes.
- Added escalation path when an IP exceeds 10 failed logins in 10 minutes.
- Added cron-based retention cleanup for failed-login related logs older than 30 days.

## Change Log

- 2026-04-01T10:48:00Z - Agent GPT-5.3-Codex began risk remediation workflow.
- 2026-04-01T10:48:00Z - Agent GPT-5.3-Codex deployed MRR monitoring and escalation automation.
- 2026-04-01T10:48:00Z - Agent GPT-5.3-Codex implemented conversion prompts and KPI instrumentation.
- 2026-04-01T10:48:00Z - Agent GPT-5.3-Codex implemented login hardening, alerting, and retention policy.

## Confirmation Gate Summary

The following were intentionally not auto-executed due safeguards:

- Sending campaign or disengagement survey emails.
- Billing reactivation or direct subscription mutation.

Manual operator confirmation is required before those actions are executed.
