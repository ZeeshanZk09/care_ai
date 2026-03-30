import { type PaidPlanTier } from './plans';
import { env, requireStripeEnv } from '@/env';

const getPriceMap = (): Record<PaidPlanTier, string | undefined> => {
  const stripeEnv = requireStripeEnv();
  return {
    BASIC: stripeEnv.STRIPE_BASIC_PRICE_ID,
    PRO: stripeEnv.STRIPE_PRO_PRICE_ID,
  };
};

export const getStripePriceIdForPlan = (plan: PaidPlanTier): string => {
  const priceByPlan = getPriceMap();
  const priceId = priceByPlan[plan];
  if (!priceId) {
    throw new Error(`Missing Stripe price id configuration for ${plan}.`);
  }

  return priceId;
};

export const getPlanForStripePriceId = (
  priceId: string | null | undefined
): PaidPlanTier | null => {
  const priceByPlan = getPriceMap();

  if (!priceId) {
    return null;
  }

  if (priceId === priceByPlan.BASIC) {
    return 'BASIC';
  }

  if (priceId === priceByPlan.PRO) {
    return 'PRO';
  }

  return null;
};

export const getStripeWebhookSecret = (): string => {
  const secret = requireStripeEnv().STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable.');
  }

  return secret;
};

export const getAppBaseUrl = (): string => {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error('Missing NEXT_PUBLIC_APP_URL environment variable.');
  }

  return appUrl.replace(/\/$/, '');
};
