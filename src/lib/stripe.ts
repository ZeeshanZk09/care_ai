import Stripe from 'stripe';
import { requireStripeEnv } from '@/env';

declare global {
  var stripeClient: Stripe | undefined;
}

export const getStripeClient = (): Stripe => {
  const { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: secretKey } = requireStripeEnv();

  if (global.stripeClient) {
    return global.stripeClient;
  }

  const stripe = new Stripe(secretKey);

  if (process.env.NODE_ENV !== 'production') {
    global.stripeClient = stripe;
  }

  return stripe;
};
