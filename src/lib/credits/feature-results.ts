import { createHash } from 'crypto';
import type { Prisma } from '@/lib/generated/prisma/client';
import prisma from '@/lib/prisma';

const toJson = (value: unknown) => {
  return value as Prisma.InputJsonValue;
};

export const hashFeatureInput = (payload: unknown): string => {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

export const saveFeatureResult = async (params: {
  userId: string;
  featureKey: string;
  input: unknown;
  result: unknown;
}) => {
  const inputHash = hashFeatureInput(params.input);

  return prisma.featureResult.create({
    data: {
      userId: params.userId,
      featureKey: params.featureKey,
      inputHash,
      result: toJson(params.result),
    },
  });
};

export const getLatestFeatureUsageByKeys = async (userId: string, featureKeys: string[]) => {
  const rows = await prisma.featureResult.findMany({
    where: {
      userId,
      featureKey: {
        in: featureKeys,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      featureKey: true,
      createdAt: true,
    },
  });

  const latest = new Map<string, Date>();
  for (const row of rows) {
    if (!latest.has(row.featureKey)) {
      latest.set(row.featureKey, row.createdAt);
    }
  }

  return latest;
};

export const getAllFeatureResults = async (userId: string) => {
  return prisma.featureResult.findMany({
    where: { userId },
    orderBy: {
      createdAt: 'desc',
    },
  });
};
