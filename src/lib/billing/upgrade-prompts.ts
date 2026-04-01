import type { PlanTier } from './plans';

export type UpgradePromptStep = 1 | 2 | 3;
export type HighValueAction = 'CONSULTATION' | 'EXPORT' | 'API_CALL';

export type UpgradePrompt = {
  step: UpgradePromptStep;
  triggeredBy: HighValueAction;
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
  triggeredBy: HighValueAction,
  title: string,
  message: string
): UpgradePrompt => {
  return {
    step,
    triggeredBy,
    title,
    message,
    ...PROMPT_CTA,
  };
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
        'Step 1 of 3: Unlock faster consultations',
        'You have completed 3 consultations. Upgrade to Pro to unlock premium model quality and 30% off for 7 days.'
      );
    }

    if (consultationsUsed === 6) {
      return buildPrompt(
        2,
        action,
        'Step 2 of 3: Keep momentum with Pro',
        'You are at 6 consultations. Pro removes usage anxiety and gives comprehensive reports with a limited 30% discount.'
      );
    }

    if (consultationsUsed === 9) {
      return buildPrompt(
        3,
        action,
        'Final Step: Last free consultation remaining',
        'You have reached 9 consultations and only one free consultation is left. Upgrade now with code CARE30 before it expires.'
      );
    }
  }

  return null;
};
