import type { Prisma } from '@/lib/generated/prisma/client';
import prisma from '@/lib/prisma';

export class InsufficientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CREDITS';

  constructor(message = 'Insufficient credits.') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

const ensureBalanceRow = async (tx: typeof prisma, userId: string) => {
  await tx.creditBalance.upsert({
    where: { userId },
    create: {
      userId,
      balance: 0,
    },
    update: {},
  });
};

const toJson = (value: Record<string, unknown> | undefined) => {
  if (!value) {
    return undefined;
  }

  return value as unknown as Prisma.InputJsonValue;
};

export const getBalance = async (userId: string): Promise<number> => {
  const row = await prisma.creditBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });

  return row?.balance ?? 0;
};

export const topUp = async (
  userId: string,
  amountCents: number,
  stripePaymentIntentId: string
): Promise<void> => {
  if (amountCents <= 0) {
    throw new Error('Top-up amount must be greater than zero.');
  }

  await prisma.$transaction(async (tx) => {
    await ensureBalanceRow(tx as typeof prisma, userId);

    await tx.creditBalance.update({
      where: { userId },
      data: {
        balance: {
          increment: amountCents,
        },
      },
    });

    await tx.creditLedger.create({
      data: {
        userId,
        delta: amountCents,
        reason: 'purchase',
        featureKey: null,
        meta: {
          stripePaymentIntentId,
        },
      },
    });
  });
};

export const adminAdjustBalance = async (
  userId: string,
  deltaCents: number,
  meta?: Record<string, unknown>
): Promise<void> => {
  if (!Number.isInteger(deltaCents) || deltaCents === 0) {
    throw new Error('Adjustment delta must be a non-zero integer amount.');
  }

  await prisma.$transaction(async (tx) => {
    await ensureBalanceRow(tx as typeof prisma, userId);

    if (deltaCents > 0) {
      await tx.creditBalance.update({
        where: { userId },
        data: {
          balance: {
            increment: deltaCents,
          },
        },
      });
    } else {
      const decrementAmount = Math.abs(deltaCents);
      const updated = await tx.creditBalance.updateMany({
        where: {
          userId,
          balance: {
            gte: decrementAmount,
          },
        },
        data: {
          balance: {
            decrement: decrementAmount,
          },
        },
      });

      if (updated.count === 0) {
        throw new InsufficientCreditsError('Cannot adjust credits below zero balance.');
      }
    }

    await tx.creditLedger.create({
      data: {
        userId,
        delta: deltaCents,
        reason: 'admin_adjustment',
        featureKey: null,
        meta: toJson(meta),
      },
    });
  });
};

export const deduct = async (
  userId: string,
  amountCents: number,
  featureKey: string,
  meta?: Record<string, unknown>
): Promise<void> => {
  if (amountCents < 0) {
    throw new Error('Deduction amount cannot be negative.');
  }

  await prisma.$transaction(async (tx) => {
    await ensureBalanceRow(tx as typeof prisma, userId);

    if (amountCents > 0) {
      const updated = await tx.creditBalance.updateMany({
        where: {
          userId,
          balance: {
            gte: amountCents,
          },
        },
        data: {
          balance: {
            decrement: amountCents,
          },
        },
      });

      if (updated.count === 0) {
        throw new InsufficientCreditsError();
      }
    }

    await tx.creditLedger.create({
      data: {
        userId,
        delta: -amountCents,
        reason: `feature:${featureKey}`,
        featureKey,
        meta: toJson(meta),
      },
    });
  });
};

export const refund = async (
  userId: string,
  amountCents: number,
  featureKey: string
): Promise<void> => {
  if (amountCents <= 0) {
    throw new Error('Refund amount must be greater than zero.');
  }

  await prisma.$transaction(async (tx) => {
    await ensureBalanceRow(tx as typeof prisma, userId);

    await tx.creditBalance.update({
      where: { userId },
      data: {
        balance: {
          increment: amountCents,
        },
      },
    });

    await tx.creditLedger.create({
      data: {
        userId,
        delta: amountCents,
        reason: 'refund',
        featureKey,
        meta: {
          refundedFeatureKey: featureKey,
        },
      },
    });
  });
};

export const hasEnoughCredits = async (userId: string, amountCents: number): Promise<boolean> => {
  if (amountCents <= 0) {
    return true;
  }

  const balance = await getBalance(userId);
  return balance >= amountCents;
};

export const hasUsedFreeTrial = async (userId: string, featureKey: string): Promise<boolean> => {
  const row = await prisma.creditLedger.findFirst({
    where: {
      userId,
      reason: `feature:${featureKey}`,
    },
    select: {
      id: true,
    },
  });

  return Boolean(row);
};

export const logFreeTrialUsage = async (
  userId: string,
  featureKey: string,
  meta?: Record<string, unknown>
): Promise<void> => {
  const trialMeta = meta ? { ...meta, freeTrial: true } : { freeTrial: true };
  await deduct(userId, 0, featureKey, trialMeta);
};

export const getRecentLedgerRows = async (userId: string, take = 20) => {
  return prisma.creditLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
};
