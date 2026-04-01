import { auth } from '@/auth';
import {
  deduct,
  getBalance,
  hasEnoughCredits,
  hasUsedFreeTrial,
  InsufficientCreditsError,
  logFreeTrialUsage,
} from '@/lib/credits/credit-service';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { NextResponse } from 'next/server';

type RouteHandler<TContext = unknown> = (request: Request, context: TContext) => Promise<Response>;

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Wraps a route handler with PAYG credit checks, free-trial handling, and per-feature rate limiting.
 */
export const withPaygGate = <TContext>(featureKey: string, costCents: number) => {
  return (handler: RouteHandler<TContext>): RouteHandler<TContext> => {
    return async (request: Request, context: TContext): Promise<Response> => {
      const session = await auth();
      const userId = session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
      }

      const rateLimit = consumeRateLimit(
        `payg:${featureKey}:${userId}`,
        RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_WINDOW_MS
      );

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'rate_limited',
            retryAfterSeconds: rateLimit.retryAfterSeconds,
            featureKey,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimit.retryAfterSeconds),
            },
          }
        );
      }

      const freeTrialAlreadyUsed = await hasUsedFreeTrial(userId, featureKey);
      const shouldUseFreeTrial = !freeTrialAlreadyUsed;

      if (!shouldUseFreeTrial) {
        const enoughCredits = await hasEnoughCredits(userId, costCents);
        if (!enoughCredits) {
          const balance = await getBalance(userId);
          return NextResponse.json(
            {
              error: 'insufficient_credits',
              featureKey,
              balance,
              required: costCents,
            },
            { status: 402 }
          );
        }
      }

      const response = await handler(request, context);
      if (!response.ok) {
        return response;
      }

      try {
        if (shouldUseFreeTrial) {
          await logFreeTrialUsage(userId, featureKey, {
            mode: 'free_trial',
          });
          return response;
        }

        await deduct(userId, costCents, featureKey, {
          mode: 'paid',
        });
        return response;
      } catch (error) {
        if (error instanceof InsufficientCreditsError) {
          const balance = await getBalance(userId);
          return NextResponse.json(
            {
              error: 'insufficient_credits',
              featureKey,
              balance,
              required: costCents,
            },
            { status: 402 }
          );
        }

        throw error;
      }
    };
  };
};
