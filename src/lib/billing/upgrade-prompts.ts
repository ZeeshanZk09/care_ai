import type { PlanTier } from './plans';

export type UpgradePromptStep = 1 | 2 | 3;
export type HighValueAction = 'CONSULTATION' | 'EXPORT' | 'API_CALL';
export type UpgradePromptVariant = 'DISCOUNT' | 'FEATURE_UNLOCK';
export type UpgradePromptTrigger = HighValueAction | 'SESSION_START' | 'PLAN_LIMIT' | 'PLAN_GATE';

export type UpgradePrompt = {
  step: UpgradePromptStep;
  triggeredBy: UpgradePromptTrigger;
  variant: UpgradePromptVariant;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  discountCode: string;
  validDays: number;
};

type PromptInput = {
  plan: PlanTier;
  consultationsUsed: number;
  action: HighValueAction;
};

const PROMPT_CTA = {
  ctaLabel: 'Upgrade to Pro',
  ctaHref: '/pricing',
  discountCode: 'CARE30',
  validDays: 7,
};

const buildPrompt = (
  step: UpgradePromptStep,
  triggeredBy: UpgradePromptTrigger,
  variant: UpgradePromptVariant,
  title: string,
  message: string
): UpgradePrompt => {
  return {
    step,
    triggeredBy,
    variant,
    title,
    message,
    ...PROMPT_CTA,
  };
};

const resolveVariantForMilestone = (consultationsUsed: number): UpgradePromptVariant => {
  return consultationsUsed % 2 === 0 ? 'FEATURE_UNLOCK' : 'DISCOUNT';
};

export const getUpgradePromptForHighValueAction = ({
  plan,
  consultationsUsed,
  action,
}: PromptInput): UpgradePrompt | null => {
  if (plan !== 'FREE') {
    return null;
  }

  if (action === 'CONSULTATION') {
    if (consultationsUsed === 3) {
      return buildPrompt(
        1,
        action,
        resolveVariantForMilestone(consultationsUsed),
        'Step 1 of 3: Unlock faster consultations',
        'You have completed 3 consultations. Upgrade to Pro to unlock premium model quality and 30% off for 7 days.'
      );
    }

    if (consultationsUsed === 6) {
      return buildPrompt(
        2,
        action,
        resolveVariantForMilestone(consultationsUsed),
        'Step 2 of 3: Keep momentum with Pro',
        'You are at 6 consultations. Pro removes usage anxiety and gives comprehensive reports with a limited 30% discount.'
      );
    }

    if (consultationsUsed === 9) {
      return buildPrompt(
        3,
        action,
        resolveVariantForMilestone(consultationsUsed),
        'Final Step: Last free consultation remaining',
        'You have reached 9 consultations and only one free consultation is left. Upgrade now with code CARE30 before it expires.'
      );
    }
  }

  return null;
};

export const getSessionStartUpgradePrompt = (
  plan: PlanTier,
  consultationsRemaining: number | null
): UpgradePrompt | null => {
  if (plan !== 'FREE') {
    return null;
  }

  const remainingLabel =
    typeof consultationsRemaining === 'number'
      ? `${consultationsRemaining}`
      : 'a limited number of';

  return buildPrompt(
    1,
    'SESSION_START',
    'FEATURE_UNLOCK',
    'Upgrade before your free credits run out',
    `You have ${remainingLabel} free consultations left. Upgrade now to avoid interruptions and unlock comprehensive reports.`
  );
};

export const getUpgradePromptForPlanLimit = (
  plan: PlanTier,
  consultationsUsed: number,
  consultationsLimit: number | null
): UpgradePrompt | null => {
  if (consultationsLimit === null) {
    return null;
  }

  const limitLabel = consultationsLimit > 0 ? consultationsLimit : consultationsUsed;
  const planLabel = plan === 'FREE' ? 'free' : 'Basic';

  return buildPrompt(
    3,
    'PLAN_LIMIT',
    'DISCOUNT',
    `Your ${planLabel} consultation limit has been reached`,
    `You have used ${consultationsUsed} of ${limitLabel} consultations. Upgrade now to continue without service disruption.`
  );
};

export const getUpgradePromptForPlanGate = (
  requiredPlan: Exclude<PlanTier, 'FREE'>,
  featureName: string
): UpgradePrompt => {
  return buildPrompt(
    2,
    'PLAN_GATE',
    'FEATURE_UNLOCK',
    `${featureName} requires ${requiredPlan}`,
    `This feature is locked on your current plan. Upgrade to ${requiredPlan} to continue.`
  );
};
