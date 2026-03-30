export const PLAN_TIERS = ['FREE', 'BASIC', 'PRO'] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];
export type PaidPlanTier = Exclude<PlanTier, 'FREE'>;

export const SUBSCRIPTION_STATUSES = [
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'PAUSED',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIALING'];

export const FREE_TRIAL_CREDITS = 10;
export const BASIC_MONTHLY_CONSULTATIONS = 50;

const PLAN_WEIGHT: Record<PlanTier, number> = {
  FREE: 0,
  BASIC: 1,
  PRO: 2,
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  FREE: 'Free Trial',
  BASIC: 'Basic Plan',
  PRO: 'Pro Plan',
};

export const normalizePlan = (value: unknown): PlanTier => {
  if (typeof value !== 'string') {
    return 'FREE';
  }

  const normalized = value.toUpperCase();
  if (normalized === 'BASIC') {
    return 'BASIC';
  }

  if (normalized === 'PRO' || normalized === 'PREMIUM') {
    return 'PRO';
  }

  return 'FREE';
};

export const parsePaidPlanInput = (value: unknown): PaidPlanTier | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'BASIC') {
    return 'BASIC';
  }

  if (normalized === 'PRO') {
    return 'PRO';
  }

  return null;
};

export const getHigherPlan = (a: PlanTier, b: PlanTier): PlanTier => {
  return PLAN_WEIGHT[a] >= PLAN_WEIGHT[b] ? a : b;
};

export const isPaidPlan = (plan: PlanTier): plan is PaidPlanTier => plan !== 'FREE';

export const canAccessSpecialistRouting = (plan: PlanTier) => isPaidPlan(plan);

export const canAccessPremiumModels = (plan: PlanTier) => plan === 'PRO';

export const canAccessComprehensiveReports = (plan: PlanTier) => plan === 'PRO';

export const getConsultationLimit = (plan: PlanTier): number | null => {
  if (plan === 'FREE') {
    return FREE_TRIAL_CREDITS;
  }

  if (plan === 'BASIC') {
    return BASIC_MONTHLY_CONSULTATIONS;
  }

  return null;
};

export const isSubscriptionStatusActive = (status: unknown): status is SubscriptionStatus => {
  if (typeof status !== 'string') {
    return false;
  }

  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status.toUpperCase() as SubscriptionStatus);
};
