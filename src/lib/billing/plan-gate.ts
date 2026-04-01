import type { PlanTier } from './plans';

const PLAN_WEIGHT: Record<PlanTier, number> = {
  FREE: 0,
  BASIC: 1,
  PRO: 2,
};

export type PlanGatePayload = {
  error: string;
  code: 'PLAN_UPGRADE_REQUIRED';
  feature: string;
  requiredPlan: PlanTier;
  currentPlan: PlanTier;
};

export type PlanGateResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      status: 402;
      payload: PlanGatePayload;
    };

export const isPlanAtLeast = (currentPlan: PlanTier, requiredPlan: PlanTier) => {
  return PLAN_WEIGHT[currentPlan] >= PLAN_WEIGHT[requiredPlan];
};

export const enforcePlanGate = (
  currentPlan: PlanTier,
  requiredPlan: PlanTier,
  feature: string
): PlanGateResult => {
  if (isPlanAtLeast(currentPlan, requiredPlan)) {
    return {
      allowed: true,
    };
  }

  return {
    allowed: false,
    status: 402,
    payload: {
      error: `Upgrade required: ${feature} needs ${requiredPlan}.`,
      code: 'PLAN_UPGRADE_REQUIRED',
      feature,
      requiredPlan,
      currentPlan,
    },
  };
};