import prisma from '@/lib/prisma';

const PLAN_PRICE_CENTS: Record<'FREE' | 'BASIC' | 'PRO', number> = {
  FREE: 0,
  BASIC: 1900,
  PRO: 4900,
};

const formatCurrency = (amountCents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100);
};

const formatDate = (date: Date | null | undefined) => {
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
};

const monthKey = (date: Date) => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const getMonthStartUtc = (offsetMonths = 0) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1, 0, 0, 0, 0));
};

const buildLinePath = (values: number[]) => {
  if (values.length === 0) {
    return '';
  }

  const max = Math.max(...values, 1);
  const width = 560;
  const height = 220;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

const buildDonutSegments = (counts: number[]) => {
  const total = Math.max(
    1,
    counts.reduce((sum, value) => sum + value, 0)
  );
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  let consumed = 0;
  return counts.map((value) => {
    const segment = (value / total) * circumference;
    const strokeDasharray = `${segment} ${circumference - segment}`;
    const strokeDashoffset = -consumed;
    consumed += segment;
    return { strokeDasharray, strokeDashoffset };
  });
};

export default async function AdminBillingPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tab?: 'active' | 'churned' }>;
}>) {
  const query = await searchParams;
  const activeTab = query.tab === 'churned' ? 'churned' : 'active';

  const [
    activeSubscribers,
    freeUsers,
    usersByPlan,
    payments,
    currentMonthPayments,
    previousMonthPayments,
  ] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
      orderBy: {
        currentPeriodEnd: 'asc',
      },
      select: {
        id: true,
        planTier: true,
        status: true,
        currentPeriodEnd: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        planTier: 'FREE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.user.groupBy({
      by: ['planTier'],
      _count: {
        _all: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        createdAt: {
          gte: getMonthStartUtc(-11),
        },
        amount: {
          gt: 0,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    }),
    prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: getMonthStartUtc(0),
        },
        amount: {
          gt: 0,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: getMonthStartUtc(-1),
          lt: getMonthStartUtc(0),
        },
        amount: {
          gt: 0,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const monthlyTotals = new Map<string, number>();
  for (let i = 11; i >= 0; i -= 1) {
    const date = getMonthStartUtc(-i);
    monthlyTotals.set(monthKey(date), 0);
  }

  for (const payment of payments) {
    const key = monthKey(payment.createdAt);
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + payment.amount);
  }

  const monthlySeries = [...monthlyTotals.entries()].map(([key, total]) => ({ key, total }));
  const mrrCurrent = currentMonthPayments._sum.amount ?? 0;
  const mrrPrevious = previousMonthPayments._sum.amount ?? 0;
  const growthPct = mrrPrevious > 0 ? ((mrrCurrent - mrrPrevious) / mrrPrevious) * 100 : 0;

  const planCounts = {
    FREE: usersByPlan.find((row) => row.planTier === 'FREE')?._count._all ?? 0,
    BASIC: usersByPlan.find((row) => row.planTier === 'BASIC')?._count._all ?? 0,
    PRO: usersByPlan.find((row) => row.planTier === 'PRO')?._count._all ?? 0,
  };

  const donutSegments = buildDonutSegments([planCounts.FREE, planCounts.BASIC, planCounts.PRO]);
  const linePath = buildLinePath(monthlySeries.map((item) => item.total));

  return (
    <section className='space-y-4'>
      <header className='rounded-xl border bg-card p-4 shadow-sm'>
        <h2 className='text-xl font-semibold'>Billing Management</h2>
        <p className='mt-1 text-sm text-muted-foreground'>
          Subscriber operations, revenue visibility, and plan distribution analytics.
        </p>
      </header>

      <div className='grid gap-4 lg:grid-cols-3'>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs uppercase text-muted-foreground'>MRR</p>
          <p className='mt-1 text-2xl font-semibold'>{formatCurrency(mrrCurrent)}</p>
          <p className='mt-1 text-sm text-muted-foreground'>
            Growth vs last month: {growthPct >= 0 ? '+' : ''}
            {growthPct.toFixed(2)}%
          </p>
        </article>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs uppercase text-muted-foreground'>Users by Plan</p>
          <p className='mt-1 text-sm'>Free: {planCounts.FREE}</p>
          <p className='text-sm'>Basic: {planCounts.BASIC}</p>
          <p className='text-sm'>Pro: {planCounts.PRO}</p>
        </article>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs uppercase text-muted-foreground'>Active Subscribers</p>
          <p className='mt-1 text-2xl font-semibold'>{activeSubscribers.length}</p>
          <p className='mt-1 text-sm text-muted-foreground'>
            Trialing, active, and past due customers.
          </p>
        </article>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <h3 className='text-base font-semibold'>MRR Trend (12 months)</h3>
          <svg viewBox='0 0 560 240' className='mt-3 w-full'>
            <path d={linePath} fill='none' stroke='currentColor' strokeWidth='2' />
          </svg>
          <div className='mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground sm:grid-cols-6'>
            {monthlySeries.map((item) => (
              <span key={item.key}>{item.key}</span>
            ))}
          </div>
        </article>

        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <h3 className='text-base font-semibold'>Plan Distribution</h3>
          <div className='mt-3 flex items-center gap-6'>
            <svg viewBox='0 0 180 180' width='180' height='180'>
              <g transform='translate(90 90)'>
                <circle r='70' fill='none' stroke='#e5e7eb' strokeWidth='24' />
                <circle
                  r='70'
                  fill='none'
                  stroke='#93c5fd'
                  strokeWidth='24'
                  strokeDasharray={donutSegments[0]?.strokeDasharray}
                  strokeDashoffset={donutSegments[0]?.strokeDashoffset}
                  transform='rotate(-90)'
                />
                <circle
                  r='70'
                  fill='none'
                  stroke='#60a5fa'
                  strokeWidth='24'
                  strokeDasharray={donutSegments[1]?.strokeDasharray}
                  strokeDashoffset={donutSegments[1]?.strokeDashoffset}
                  transform='rotate(-90)'
                />
                <circle
                  r='70'
                  fill='none'
                  stroke='#1d4ed8'
                  strokeWidth='24'
                  strokeDasharray={donutSegments[2]?.strokeDasharray}
                  strokeDashoffset={donutSegments[2]?.strokeDashoffset}
                  transform='rotate(-90)'
                />
              </g>
            </svg>
            <div className='space-y-2 text-sm'>
              <p>
                <span className='inline-block h-2 w-2 rounded-full bg-blue-300' /> Free:{' '}
                {planCounts.FREE}
              </p>
              <p>
                <span className='inline-block h-2 w-2 rounded-full bg-blue-400' /> Basic:{' '}
                {planCounts.BASIC}
              </p>
              <p>
                <span className='inline-block h-2 w-2 rounded-full bg-blue-700' /> Pro:{' '}
                {planCounts.PRO}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className='rounded-xl border bg-card p-4 shadow-sm'>
        <div className='mb-4 flex gap-2'>
          <a
            href='/admin/billing?tab=active'
            className={`rounded-md border px-3 py-2 text-sm ${activeTab === 'active' ? 'bg-primary text-primary-foreground' : ''}`}
          >
            Active Subscribers
          </a>
          <a
            href='/admin/billing?tab=churned'
            className={`rounded-md border px-3 py-2 text-sm ${activeTab === 'churned' ? 'bg-primary text-primary-foreground' : ''}`}
          >
            Free and Churned Users
          </a>
        </div>

        {activeTab === 'active' ? (
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='border-b text-left'>
                  <th className='px-2 py-2'>Name</th>
                  <th className='px-2 py-2'>Email</th>
                  <th className='px-2 py-2'>Plan</th>
                  <th className='px-2 py-2'>Amount</th>
                  <th className='px-2 py-2'>Billing Date</th>
                  <th className='px-2 py-2'>Stripe Status</th>
                </tr>
              </thead>
              <tbody>
                {activeSubscribers.map((subscription) => (
                  <tr key={subscription.id} className='border-b'>
                    <td className='px-2 py-2'>{subscription.user.name ?? '-'}</td>
                    <td className='px-2 py-2'>{subscription.user.email}</td>
                    <td className='px-2 py-2'>{subscription.planTier}</td>
                    <td className='px-2 py-2'>
                      {formatCurrency(PLAN_PRICE_CENTS[subscription.planTier] ?? 0)}
                    </td>
                    <td className='px-2 py-2'>{formatDate(subscription.currentPeriodEnd)}</td>
                    <td className='px-2 py-2'>{subscription.status}</td>
                  </tr>
                ))}
                {activeSubscribers.length === 0 ? (
                  <tr>
                    <td className='px-2 py-4 text-muted-foreground' colSpan={6}>
                      No active subscribers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='border-b text-left'>
                  <th className='px-2 py-2'>Name</th>
                  <th className='px-2 py-2'>Email</th>
                  <th className='px-2 py-2'>Joined</th>
                  <th className='px-2 py-2'>Campaign</th>
                </tr>
              </thead>
              <tbody>
                {freeUsers.map((user) => {
                  const subject = encodeURIComponent('Come back to CareAI Premium Plans');
                  const body = encodeURIComponent(
                    `Hi ${user.name ?? 'there'},\n\nWe noticed you are currently on the Free plan. We would love to help you unlock advanced features with Basic or Pro.\n\nBest,\nCareAI Team`
                  );

                  return (
                    <tr key={user.id} className='border-b'>
                      <td className='px-2 py-2'>{user.name ?? '-'}</td>
                      <td className='px-2 py-2'>{user.email}</td>
                      <td className='px-2 py-2'>{formatDate(user.createdAt)}</td>
                      <td className='px-2 py-2'>
                        <a
                          href={`mailto:${user.email}?subject=${subject}&body=${body}`}
                          className='rounded-md border px-3 py-1 text-xs hover:bg-muted'
                        >
                          Draft Campaign Email
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {freeUsers.length === 0 ? (
                  <tr>
                    <td className='px-2 py-4 text-muted-foreground' colSpan={4}>
                      No free or churned users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
