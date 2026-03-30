import prisma from '@/lib/prisma';
import {
  BASIC_MONTHLY_CONSULTATIONS,
  canAccessComprehensiveReports,
  canAccessPremiumModels,
  canAccessSpecialistRouting,
  FREE_TRIAL_CREDITS,
  getHigherPlan,
  normalizePlan,
  type PlanTier,
} from './plans';

const BASIC_USAGE_PERIOD_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  timeZone: 'UTC',
});

type ActiveSubscription = {
  planTier: string;
  status: string;
  currentPeriodEnd: Date | null;
};

type AccessStatus = 'ALLOWED' | 'DENIED' | 'PREMIUM_PENDING';

const TRANSACTION_MAX_WAIT_MS = 15_000;
const TRANSACTION_TIMEOUT_MS = 20_000;

const getCurrentPeriodKey = (date = new Date()) => {
  return BASIC_USAGE_PERIOD_FORMATTER.format(date);
};

const getCurrentCycleStart = (date = new Date()) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
};

const needsMonthlyReset = (consultationsResetAt: Date | null | undefined, now = new Date()) => {
  if (!consultationsResetAt) {
    return true;
  }

  return consultationsResetAt < getCurrentCycleStart(now);
};

const isSubscriptionCurrentlyActive = (subscription: ActiveSubscription, now = new Date()) => {
  const status = subscription.status.toUpperCase();
  if (status !== 'ACTIVE' && status !== 'TRIALING') {
    return false;
  }

  return !subscription.currentPeriodEnd || subscription.currentPeriodEnd > now;
};

const resolveEffectivePlan = (
  _storedPlanTier: unknown,
  subscriptions: ActiveSubscription[],
  now = new Date()
): PlanTier => {
  const activePlans = subscriptions
    .filter((subscription) => isSubscriptionCurrentlyActive(subscription, now))
    .map((subscription) => normalizePlan(subscription.planTier));

  if (activePlans.length === 0) {
    return 'FREE';
  }

  return activePlans.reduce<PlanTier>(
    (highestPlan, planTier) => getHigherPlan(highestPlan, planTier),
    'FREE'
  );
};

export type EntitlementSnapshot = {
  plan: PlanTier;
  freeCreditsRemaining: number;
  basicMonthlyLimit: number;
  basicMonthlyUsed: number;
  consultationsUsed: number;
  consultationsRemaining: number | null;
  canAccessSpecialists: boolean;
  canAccessPremiumModels: boolean;
  canAccessComprehensiveReports: boolean;
  premiumAccessPending: boolean;
  premiumAccessGrantedAt: Date | null;
  currentPeriodKey: string;
};

export type ConsultationAccessResult = {
  status: AccessStatus;
  planTier: PlanTier;
  consultationsUsed: number;
  consultationsLimit: number | null;
  consultationsRemaining: number | null;
  currentPeriodKey: string;
  premiumAccessPending: boolean;
  premiumAccessGrantedAt: Date | null;
  reason: string | null;
};

export class EntitlementError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'EntitlementError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const buildSnapshot = (
  plan: PlanTier,
  consultationsUsed: number,
  premiumAccessGrantedAt: Date | null,
  currentPeriodKey: string
): EntitlementSnapshot => {
  const freeCreditsRemaining = Math.max(0, FREE_TRIAL_CREDITS - consultationsUsed);
  const basicMonthlyUsed = consultationsUsed;
  let consultationsRemaining: number | null = null;

  if (plan === 'FREE') {
    consultationsRemaining = freeCreditsRemaining;
  } else if (plan === 'BASIC') {
    consultationsRemaining = Math.max(0, BASIC_MONTHLY_CONSULTATIONS - basicMonthlyUsed);
  }

  return {
    plan,
    freeCreditsRemaining,
    basicMonthlyLimit: BASIC_MONTHLY_CONSULTATIONS,
    basicMonthlyUsed,
    consultationsUsed,
    consultationsRemaining,
    canAccessSpecialists: canAccessSpecialistRouting(plan),
    canAccessPremiumModels: canAccessPremiumModels(plan),
    canAccessComprehensiveReports: canAccessComprehensiveReports(plan),
    premiumAccessPending: (plan === 'BASIC' || plan === 'PRO') && premiumAccessGrantedAt === null,
    premiumAccessGrantedAt,
    currentPeriodKey,
  };
};

const normalizeCounterForPlan = (planTier: PlanTier, consultationsUsed: number) => {
  if (planTier === 'PRO') {
    return consultationsUsed;
  }

  if (consultationsUsed < 0) {
    return 0;
  }

  return consultationsUsed;
};

const resolveConsultationLimit = (planTier: PlanTier): number | null => {
  if (planTier === 'FREE') {
    return FREE_TRIAL_CREDITS;
  }

  if (planTier === 'BASIC') {
    return BASIC_MONTHLY_CONSULTATIONS;
  }

  return null;
};

const isTransactionStartTimeoutError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('Transaction API error') &&
    error.message.includes('Unable to start a transaction in the given time')
  );
};

const checkConsultationAccessInternal = async (tx: typeof prisma, userId: string) => {
  const now = new Date();
  const currentPeriodKey = getCurrentPeriodKey(now);

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      planTier: true,
      consultationsUsed: true,
      consultationsResetAt: true,
      premiumAccessGrantedAt: true,
      status: true,
    },
  });

  if (!user) {
    throw new EntitlementError('USER_NOT_FOUND', 'User account not found.', 404);
  }

  if (user.status === 'BLOCKED' || user.status === 'RESTRICTED') {
    return {
      status: 'DENIED' as const,
      planTier: normalizePlan(user.planTier),
      consultationsUsed: user.consultationsUsed,
      consultationsLimit: resolveConsultationLimit(normalizePlan(user.planTier)),
      consultationsRemaining: 0,
      currentPeriodKey,
      premiumAccessPending: false,
      premiumAccessGrantedAt: user.premiumAccessGrantedAt,
      reason: 'Your account access is currently restricted.',
    };
  }

  const subscriptions = await tx.subscription.findMany({
    where: { userId },
    select: {
      planTier: true,
      status: true,
      currentPeriodEnd: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const effectivePlan = resolveEffectivePlan(user.planTier, subscriptions, now);
  const storedPlan = normalizePlan(user.planTier);

  const updateData: {
    planTier?: PlanTier;
    consultationsUsed?: number;
    consultationsResetAt?: Date;
  } = {};

  if (storedPlan !== effectivePlan) {
    updateData.planTier = effectivePlan;
  }

  let normalizedConsultationsUsed = normalizeCounterForPlan(effectivePlan, user.consultationsUsed);
  let consultationsResetAt = user.consultationsResetAt;

  if (effectivePlan === 'BASIC' && needsMonthlyReset(user.consultationsResetAt, now)) {
    normalizedConsultationsUsed = 0;
    consultationsResetAt = getCurrentCycleStart(now);
    updateData.consultationsUsed = 0;
    updateData.consultationsResetAt = consultationsResetAt;
  }

  if (effectivePlan === 'FREE' && user.consultationsResetAt !== null) {
    updateData.consultationsResetAt = getCurrentCycleStart(now);
  }

  if (Object.keys(updateData).length > 0) {
    await tx.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  const limit = resolveConsultationLimit(effectivePlan);
  const remaining = limit === null ? null : Math.max(0, limit - normalizedConsultationsUsed);
  const premiumAccessPending =
    (effectivePlan === 'BASIC' || effectivePlan === 'PRO') && user.premiumAccessGrantedAt === null;

  if (remaining !== null && remaining <= 0) {
    return {
      status: 'DENIED' as const,
      planTier: effectivePlan,
      consultationsUsed: normalizedConsultationsUsed,
      consultationsLimit: limit,
      consultationsRemaining: remaining,
      currentPeriodKey,
      premiumAccessPending,
      premiumAccessGrantedAt: user.premiumAccessGrantedAt,
      reason:
        effectivePlan === 'FREE'
          ? 'You have exhausted your 10 free lifetime consultations.'
          : 'You have reached your Basic monthly consultation limit.',
    };
  }

  if (premiumAccessPending) {
    return {
      status: 'PREMIUM_PENDING' as const,
      planTier: effectivePlan,
      consultationsUsed: normalizedConsultationsUsed,
      consultationsLimit: limit,
      consultationsRemaining: remaining,
      currentPeriodKey,
      premiumAccessPending,
      premiumAccessGrantedAt: user.premiumAccessGrantedAt,
      reason: 'Your premium AI models are still being activated. Standard models remain available.',
    };
  }

  return {
    status: 'ALLOWED' as const,
    planTier: effectivePlan,
    consultationsUsed: normalizedConsultationsUsed,
    consultationsLimit: limit,
    consultationsRemaining: remaining,
    currentPeriodKey,
    premiumAccessPending,
    premiumAccessGrantedAt: user.premiumAccessGrantedAt,
    reason: null,
  };
};

export const syncUserPlanFromBilling = async (userId: string): Promise<PlanTier> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, planTier: true },
  });

  if (!user) {
    throw new EntitlementError('USER_NOT_FOUND', 'User account not found.', 404);
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    select: {
      planTier: true,
      status: true,
      currentPeriodEnd: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const effectivePlan = resolveEffectivePlan(user.planTier, subscriptions);
  const storedPlan = normalizePlan(user.planTier);

  if (storedPlan !== effectivePlan) {
    await prisma.user.update({
      where: { id: userId },
      data: { planTier: effectivePlan },
    });
  }

  return effectivePlan;
};

export const checkConsultationAccess = async (
  userId: string
): Promise<ConsultationAccessResult> => {
  try {
    return await prisma.$transaction(
      (tx) => checkConsultationAccessInternal(tx as typeof prisma, userId),
      {
        maxWait: TRANSACTION_MAX_WAIT_MS,
        timeout: TRANSACTION_TIMEOUT_MS,
      }
    );
  } catch (error) {
    if (!isTransactionStartTimeoutError(error)) {
      throw error;
    }

    // Fall back to a non-transactional read/update flow for access checks under pool pressure.
    return checkConsultationAccessInternal(prisma, userId);
  }
};

export const getEntitlementSnapshot = async (userId: string): Promise<EntitlementSnapshot> => {
  const access = await checkConsultationAccessInternal(prisma, userId);
  return buildSnapshot(
    access.planTier,
    access.consultationsUsed,
    access.premiumAccessGrantedAt,
    access.currentPeriodKey
  );
};

export const consumeConsultationCredit = async (
  userId: string,
  options?: { requiresPaidPlan?: boolean }
): Promise<EntitlementSnapshot> => {
  return prisma.$transaction(
    async (tx) => {
      const access = await checkConsultationAccessInternal(tx as typeof prisma, userId);

      if (options?.requiresPaidPlan && access.planTier === 'FREE') {
        await tx.consultation.create({
          data: {
            userId,
            planTier: access.planTier,
            status: 'DENIED',
            denialReason: 'Paid plan is required for this consultation type.',
          },
        });
        throw new EntitlementError(
          'PAID_PLAN_REQUIRED',
          'This specialist requires an active Basic or Pro plan.',
          403
        );
      }

      if (access.status === 'DENIED') {
        await tx.consultation.create({
          data: {
            userId,
            planTier: access.planTier,
            status: 'DENIED',
            denialReason: access.reason,
          },
        });
        throw new EntitlementError(
          'CONSULTATION_DENIED',
          access.reason ?? 'Consultation access denied for current plan.',
          403
        );
      }

      if (access.planTier === 'FREE' || access.planTier === 'BASIC') {
        const consultationsLimit =
          access.planTier === 'FREE' ? FREE_TRIAL_CREDITS : BASIC_MONTHLY_CONSULTATIONS;
        const incremented = await tx.user.updateMany({
          where: {
            id: userId,
            consultationsUsed: { lt: consultationsLimit },
          },
          data: {
            consultationsUsed: { increment: 1 },
            consultationsResetAt: getCurrentCycleStart(),
          },
        });

        if (incremented.count === 0) {
          await tx.consultation.create({
            data: {
              userId,
              planTier: access.planTier,
              status: 'DENIED',
              denialReason: 'Consultation limit reached during atomic usage update.',
            },
          });

          throw new EntitlementError(
            'CONSULTATION_LIMIT_REACHED',
            'You have reached your consultation limit for the current plan period.',
            403
          );
        }
      } else {
        await tx.user.update({
          where: { id: userId },
          data: {
            consultationsUsed: { increment: 1 },
            consultationsResetAt: getCurrentCycleStart(),
          },
        });
      }

      await tx.consultation.create({
        data: {
          userId,
          planTier: access.planTier,
          status: 'SUCCESS',
        },
      });

      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          consultationsUsed: true,
          premiumAccessGrantedAt: true,
        },
      });

      return buildSnapshot(
        access.planTier,
        updatedUser?.consultationsUsed ?? access.consultationsUsed,
        updatedUser?.premiumAccessGrantedAt ?? access.premiumAccessGrantedAt,
        access.currentPeriodKey
      );
    },
    {
      maxWait: TRANSACTION_MAX_WAIT_MS,
      timeout: TRANSACTION_TIMEOUT_MS,
    }
  );
};
