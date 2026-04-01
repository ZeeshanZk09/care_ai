import { auth } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { getBalance, getRecentLedgerRows, hasUsedFreeTrial } from '@/lib/credits/credit-service';
import { PAYG_FEATURES } from '@/lib/credits/features';
import { NextResponse } from 'next/server';

const getHandler = async () => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
  }

  const [balance, ledger, trialRows] = await Promise.all([
    getBalance(userId),
    getRecentLedgerRows(userId, 20),
    Promise.all(
      PAYG_FEATURES.map(async (feature) => ({
        featureKey: feature.key,
        used: await hasUsedFreeTrial(userId, feature.key),
      }))
    ),
  ]);

  const freeTrials = trialRows.reduce<Record<string, { used: boolean; remaining: number }>>(
    (acc, row) => {
      acc[row.featureKey] = {
        used: row.used,
        remaining: row.used ? 0 : 1,
      };
      return acc;
    },
    {}
  );

  return NextResponse.json(
    {
      balance,
      ledger,
      freeTrials,
    },
    { status: 200 }
  );
};

export const GET = withApiRequestAudit(async () => getHandler());
