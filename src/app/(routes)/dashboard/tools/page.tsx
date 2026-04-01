import { auth } from '@/auth';
import { PAYG_FEATURES } from '@/lib/credits/features';
import prisma from '@/lib/prisma';
import { buildMetadata } from '@/lib/seo';
import { redirect } from 'next/navigation';
import ToolsClient from './_components/ToolsClient';

export const metadata = buildMetadata({
  title: 'PAYG Tools',
  description: 'Pay-as-you-go clinical support tools powered by CareAI credits.',
  path: '/dashboard/tools',
  noIndex: true,
});

export default async function DashboardToolsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/sign-in');
  }

  const featureKeys = PAYG_FEATURES.map((feature) => feature.key);

  const [featureUsageRows, trialUsageRows] = await Promise.all([
    prisma.featureResult.groupBy({
      by: ['featureKey'],
      where: {
        userId,
        featureKey: {
          in: featureKeys,
        },
      },
      _max: {
        createdAt: true,
      },
    }),
    prisma.creditLedger.findMany({
      where: {
        userId,
        featureKey: {
          in: featureKeys,
        },
        reason: {
          startsWith: 'feature:',
        },
      },
      distinct: ['featureKey'],
      select: {
        featureKey: true,
      },
    }),
  ]);

  const lastUsedByFeature = featureUsageRows.reduce<Record<string, string>>((acc, row) => {
    if (row._max.createdAt) {
      acc[row.featureKey] = row._max.createdAt.toISOString();
    }
    return acc;
  }, {});

  const trialUsedByFeature = trialUsageRows.reduce<Record<string, boolean>>((acc, row) => {
    if (row.featureKey) {
      acc[row.featureKey] = true;
    }
    return acc;
  }, {});

  return (
    <section className='mx-auto my-8 w-full max-w-7xl px-4'>
      <header className='mb-6 rounded-xl border bg-card p-4 shadow-sm'>
        <h1 className='text-2xl font-semibold'>PAYG Clinical Tools</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Run advanced one-off analyses with credits. Each tool includes one free trial per user.
        </p>
      </header>

      <ToolsClient
        initialLastUsedByFeature={lastUsedByFeature}
        initialTrialUsedByFeature={trialUsedByFeature}
      />
    </section>
  );
}
