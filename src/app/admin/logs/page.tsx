import prisma from '@/lib/prisma';

const PAGE_SIZE = 25;

const toDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (date: Date | null | undefined) => {
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getLogRowClassName = (action: string) => {
  const normalized = action.toLowerCase();

  if (
    normalized.includes('auth.signin.failed') ||
    normalized.includes('rate_limited') ||
    normalized.includes('consultation_denied')
  ) {
    return 'bg-amber-50';
  }

  if (
    normalized.includes('webhook') &&
    (normalized.includes('error') || normalized.includes('failed'))
  ) {
    return 'bg-rose-50';
  }

  if (normalized.includes('error') || normalized.includes('failed')) {
    return 'bg-rose-50';
  }

  return '';
};

export default async function AdminLogsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    q?: string;
    action?: string;
    userId?: string;
    ip?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}>) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? '1') || 1);
  const fromDate = toDate(query.from);
  const toDateValue = toDate(query.to);

  const where: any = {};
  if (query.action) {
    where.action = {
      contains: query.action,
      mode: 'insensitive',
    };
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.ip) {
    where.ipAddress = {
      contains: query.ip,
      mode: 'insensitive',
    };
  }

  if (query.q) {
    where.OR = [
      {
        action: {
          contains: query.q,
          mode: 'insensitive',
        },
      },
      {
        user: {
          email: {
            contains: query.q,
            mode: 'insensitive',
          },
        },
      },
    ];
  }

  if (fromDate || toDateValue) {
    where.createdAt = {};
    if (fromDate) {
      where.createdAt.gte = fromDate;
    }
    if (toDateValue) {
      where.createdAt.lte = toDateValue;
    }
  }

  const [totalLogs, logs, latestWebhook, latestCronRun, apiErrorsLast24h, dbConnectivityProbe] =
    await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          action: true,
          userId: true,
          ipAddress: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.stripeWebhookEvent.findFirst({
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      }),
      prisma.auditLog.findFirst({
        where: {
          action: 'system.cron.reset_consultations.completed',
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          OR: [
            {
              action: {
                contains: 'error',
                mode: 'insensitive',
              },
            },
            {
              action: {
                contains: 'failed',
                mode: 'insensitive',
              },
            },
          ],
        },
      }),
      prisma.user.count(),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));

  return (
    <section className='space-y-4'>
      <header className='rounded-xl border bg-card p-4 shadow-sm'>
        <h2 className='text-xl font-semibold'>Logs and Monitoring</h2>
        <p className='mt-1 text-sm text-muted-foreground'>
          Search and inspect append-only audit logs with system health indicators.
        </p>
      </header>

      <div className='grid gap-4 lg:grid-cols-4'>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs uppercase text-muted-foreground'>Database</p>
          <p className='mt-1 text-lg font-semibold'>
            {typeof dbConnectivityProbe === 'number' ? 'Connected' : 'Unavailable'}
          </p>
        </article>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs uppercase text-muted-foreground'>Stripe Webhook Last Seen</p>
          <p className='mt-1 text-sm font-semibold'>{formatDateTime(latestWebhook?.createdAt)}</p>
        </article>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs uppercase text-muted-foreground'>Last Cron Run</p>
          <p className='mt-1 text-sm font-semibold'>{formatDateTime(latestCronRun?.createdAt)}</p>
        </article>
        <article className='rounded-xl border bg-card p-4 shadow-sm'>
          <p className='text-xs uppercase text-muted-foreground'>API Errors (24h)</p>
          <p className='mt-1 text-lg font-semibold'>{apiErrorsLast24h}</p>
        </article>
      </div>

      <form className='grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-6'>
        <input
          type='text'
          name='q'
          defaultValue={query.q ?? ''}
          placeholder='Search action/email'
          className='rounded-md border px-3 py-2 text-sm'
        />
        <input
          type='text'
          name='action'
          defaultValue={query.action ?? ''}
          placeholder='Action filter'
          className='rounded-md border px-3 py-2 text-sm'
        />
        <input
          type='text'
          name='userId'
          defaultValue={query.userId ?? ''}
          placeholder='User ID'
          className='rounded-md border px-3 py-2 text-sm'
        />
        <input
          type='text'
          name='ip'
          defaultValue={query.ip ?? ''}
          placeholder='IP address'
          className='rounded-md border px-3 py-2 text-sm'
        />
        <input
          type='date'
          name='from'
          defaultValue={query.from ?? ''}
          className='rounded-md border px-3 py-2 text-sm'
        />
        <input
          type='date'
          name='to'
          defaultValue={query.to ?? ''}
          className='rounded-md border px-3 py-2 text-sm'
        />
        <input type='hidden' name='page' value='1' />
        <button type='submit' className='rounded-md bg-primary px-4 py-2 text-primary-foreground'>
          Filter Logs
        </button>
      </form>

      <div className='overflow-x-auto rounded-xl border bg-card p-4 shadow-sm'>
        <table className='min-w-full text-sm'>
          <thead>
            <tr className='border-b text-left'>
              <th className='px-2 py-2'>Timestamp</th>
              <th className='px-2 py-2'>Action</th>
              <th className='px-2 py-2'>User</th>
              <th className='px-2 py-2'>IP</th>
              <th className='px-2 py-2'>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className={`border-b align-top ${getLogRowClassName(log.action)}`}>
                <td className='px-2 py-2 whitespace-nowrap'>{formatDateTime(log.createdAt)}</td>
                <td className='px-2 py-2'>{log.action}</td>
                <td className='px-2 py-2'>{log.user?.email ?? log.userId ?? '-'}</td>
                <td className='px-2 py-2'>{log.ipAddress ?? '-'}</td>
                <td className='px-2 py-2'>
                  <pre className='whitespace-pre-wrap text-xs text-muted-foreground'>
                    {JSON.stringify(log.metadata ?? {}, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td className='px-2 py-6 text-muted-foreground' colSpan={5}>
                  No logs found for the selected filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className='flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm'>
        <p className='text-sm text-muted-foreground'>
          Showing page {page} of {totalPages} ({totalLogs} logs)
        </p>
        <div className='flex gap-2'>
          <a
            className={`rounded-md border px-3 py-2 text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
            href={`?q=${encodeURIComponent(query.q ?? '')}&action=${encodeURIComponent(query.action ?? '')}&userId=${encodeURIComponent(query.userId ?? '')}&ip=${encodeURIComponent(query.ip ?? '')}&from=${query.from ?? ''}&to=${query.to ?? ''}&page=${Math.max(1, page - 1)}`}
          >
            Previous
          </a>
          <a
            className={`rounded-md border px-3 py-2 text-sm ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
            href={`?q=${encodeURIComponent(query.q ?? '')}&action=${encodeURIComponent(query.action ?? '')}&userId=${encodeURIComponent(query.userId ?? '')}&ip=${encodeURIComponent(query.ip ?? '')}&from=${query.from ?? ''}&to=${query.to ?? ''}&page=${Math.min(totalPages, page + 1)}`}
          >
            Next
          </a>
        </div>
      </div>
    </section>
  );
}
