import prisma from '@/lib/prisma';
import AdminCreditAdjustForm from './_components/AdminCreditAdjustForm';

const formatCurrency = (amountCents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100);
};

const formatDate = (value: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
};

const readNoteFromMeta = (meta: unknown) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return null;
  }

  const note = (meta as Record<string, unknown>).note;
  if (typeof note !== 'string' || !note.trim()) {
    return null;
  }

  return note;
};

export default async function AdminCreditsPage() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    balancesAggregate,
    walletsCount,
    topBalances,
    recentLedger,
    creditsIn24h,
    creditsOut24h,
    adminAdjustmentsCount,
  ] = await Promise.all([
    prisma.creditBalance.aggregate({
      _sum: {
        balance: true,
      },
      _avg: {
        balance: true,
      },
    }),
    prisma.creditBalance.count(),
    prisma.creditBalance.findMany({
      orderBy: {
        balance: 'desc',
      },
      take: 10,
      select: {
        userId: true,
        balance: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.creditLedger.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      select: {
        id: true,
        delta: true,
        reason: true,
        featureKey: true,
        meta: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.creditLedger.aggregate({
      where: {
        createdAt: {
          gte: dayAgo,
        },
        delta: {
          gt: 0,
        },
      },
      _sum: {
        delta: true,
      },
    }),
    prisma.creditLedger.aggregate({
      where: {
        createdAt: {
          gte: dayAgo,
        },
        delta: {
          lt: 0,
        },
      },
      _sum: {
        delta: true,
      },
    }),
    prisma.creditLedger.count({
      where: {
        reason: 'admin_adjustment',
      },
    }),
  ]);

  const totalBalance = balancesAggregate._sum.balance ?? 0;
  const averageBalance = Math.round(balancesAggregate._avg.balance ?? 0);
  const credited24h = creditsIn24h._sum.delta ?? 0;
  const debited24h = Math.abs(creditsOut24h._sum.delta ?? 0);

  return (
    <section className='space-y-4'>
      <header className='rounded-xl border bg-card p-4 shadow-sm'>
        <h2 className='text-xl font-semibold'>Credit Wallet Controls</h2>
        <p className='mt-1 text-sm text-muted-foreground'>
          Monitor wallet health, inspect ledger activity, and apply manual credit adjustments.
        </p>
      </header>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Outstanding Credits
          </p>
          <p className='mt-1 text-2xl font-semibold'>{formatCurrency(totalBalance)}</p>
        </article>

        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Wallet Accounts
          </p>
          <p className='mt-1 text-2xl font-semibold'>{walletsCount}</p>
        </article>

        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            24h Credits In / Out
          </p>
          <p className='mt-1 text-lg font-semibold'>
            {formatCurrency(credited24h)} / {formatCurrency(debited24h)}
          </p>
        </article>

        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Avg Wallet / Admin Adjustments
          </p>
          <p className='mt-1 text-lg font-semibold'>
            {formatCurrency(averageBalance)} / {adminAdjustmentsCount}
          </p>
        </article>
      </div>

      <AdminCreditAdjustForm />

      <div className='grid gap-4 xl:grid-cols-2'>
        <section className='rounded-xl border bg-card p-4 shadow-sm'>
          <h3 className='text-lg font-semibold'>Top Wallet Balances</h3>
          <div className='mt-3 overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='border-b text-left'>
                  <th className='px-2 py-2'>User</th>
                  <th className='px-2 py-2'>Email</th>
                  <th className='px-2 py-2'>Balance</th>
                  <th className='px-2 py-2'>Updated</th>
                </tr>
              </thead>
              <tbody>
                {topBalances.map((row) => (
                  <tr key={row.userId} className='border-b'>
                    <td className='px-2 py-2 font-medium'>{row.user.name ?? '-'}</td>
                    <td className='px-2 py-2'>{row.user.email}</td>
                    <td className='px-2 py-2'>{formatCurrency(row.balance)}</td>
                    <td className='px-2 py-2'>{formatDate(row.updatedAt)}</td>
                  </tr>
                ))}
                {topBalances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className='px-2 py-4 text-muted-foreground'>
                      No wallet balances yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className='rounded-xl border bg-card p-4 shadow-sm'>
          <h3 className='text-lg font-semibold'>Recent Credit Ledger (50)</h3>
          <div className='mt-3 max-h-135 overflow-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='border-b text-left'>
                  <th className='px-2 py-2'>Time</th>
                  <th className='px-2 py-2'>User</th>
                  <th className='px-2 py-2'>Delta</th>
                  <th className='px-2 py-2'>Reason</th>
                  <th className='px-2 py-2'>Feature</th>
                  <th className='px-2 py-2'>Note</th>
                </tr>
              </thead>
              <tbody>
                {recentLedger.map((row) => {
                  const note = readNoteFromMeta(row.meta);
                  return (
                    <tr key={row.id} className='border-b align-top'>
                      <td className='px-2 py-2 whitespace-nowrap'>{formatDate(row.createdAt)}</td>
                      <td className='px-2 py-2'>
                        <p className='font-medium'>{row.user.name ?? '-'}</p>
                        <p className='text-xs text-muted-foreground'>{row.user.email}</p>
                      </td>
                      <td className='px-2 py-2'>
                        {row.delta > 0 ? '+' : ''}
                        {formatCurrency(row.delta)}
                      </td>
                      <td className='px-2 py-2'>{row.reason}</td>
                      <td className='px-2 py-2'>{row.featureKey ?? '-'}</td>
                      <td className='px-2 py-2 text-muted-foreground'>{note ?? '-'}</td>
                    </tr>
                  );
                })}
                {recentLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='px-2 py-4 text-muted-foreground'>
                      No ledger entries yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
