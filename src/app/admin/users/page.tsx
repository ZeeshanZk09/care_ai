import prisma from '@/lib/prisma';
import UserActionButtons from './_components/UserActionButtons';

const PAGE_SIZE = 12;

const toDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const formatDate = (value: Date | null | undefined) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(value);
};

export default async function AdminUsersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    q?: string;
    plan?: 'FREE' | 'BASIC' | 'PRO';
    status?: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED';
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

  if (query.q) {
    where.OR = [
      {
        name: {
          contains: query.q,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: query.q,
          mode: 'insensitive',
        },
      },
    ];
  }

  if (query.plan && ['FREE', 'BASIC', 'PRO'].includes(query.plan)) {
    where.planTier = query.plan;
  }

  if (query.status && ['ACTIVE', 'RESTRICTED', 'BLOCKED'].includes(query.status)) {
    where.status = query.status;
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

  const [totalUsers, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        planTier: true,
        status: true,
        consultationsUsed: true,
        createdAt: true,
        lastActiveAt: true,
        premiumAccessGrantedAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

  return (
    <section className='space-y-4'>
      <header className='rounded-xl border bg-card p-4 shadow-sm'>
        <h2 className='text-xl font-semibold'>User Management</h2>
        <p className='mt-1 text-sm text-muted-foreground'>
          Search users, filter by plan/status/date, and execute admin account controls.
        </p>
      </header>

      <form className='grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-5'>
        <input
          type='text'
          name='q'
          defaultValue={query.q ?? ''}
          placeholder='Search name or email'
          className='rounded-md border px-3 py-2 text-sm'
        />
        <select
          name='plan'
          defaultValue={query.plan ?? ''}
          className='rounded-md border px-3 py-2 text-sm'
        >
          <option value=''>All Plans</option>
          <option value='FREE'>Free</option>
          <option value='BASIC'>Basic</option>
          <option value='PRO'>Pro</option>
        </select>
        <select
          name='status'
          defaultValue={query.status ?? ''}
          className='rounded-md border px-3 py-2 text-sm'
        >
          <option value=''>All Statuses</option>
          <option value='ACTIVE'>Active</option>
          <option value='RESTRICTED'>Restricted</option>
          <option value='BLOCKED'>Blocked</option>
        </select>
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
          Apply Filters
        </button>
      </form>

      <div className='overflow-x-auto rounded-xl border bg-card p-4 shadow-sm'>
        <table className='min-w-full text-sm'>
          <thead>
            <tr className='border-b text-left'>
              <th className='px-2 py-2'>Name</th>
              <th className='px-2 py-2'>Email</th>
              <th className='px-2 py-2'>Plan</th>
              <th className='px-2 py-2'>Status</th>
              <th className='px-2 py-2'>Consultations</th>
              <th className='px-2 py-2'>Joined</th>
              <th className='px-2 py-2'>Last Active</th>
              <th className='px-2 py-2'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className='border-b align-top'>
                <td className='px-2 py-3 font-medium'>{user.name ?? '-'}</td>
                <td className='px-2 py-3'>{user.email}</td>
                <td className='px-2 py-3'>{user.planTier}</td>
                <td className='px-2 py-3'>{user.status}</td>
                <td className='px-2 py-3'>{user.consultationsUsed}</td>
                <td className='px-2 py-3'>{formatDate(user.createdAt)}</td>
                <td className='px-2 py-3'>{formatDate(user.lastActiveAt)}</td>
                <td className='px-2 py-3'>
                  <UserActionButtons
                    userId={user.id}
                    disabledPremiumActivation={
                      user.planTier === 'FREE' || user.premiumAccessGrantedAt !== null
                    }
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className='px-2 py-6 text-muted-foreground' colSpan={8}>
                  No users matched your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className='flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm'>
        <p className='text-sm text-muted-foreground'>
          Showing page {page} of {totalPages} ({totalUsers} users)
        </p>
        <div className='flex gap-2'>
          <a
            className={`rounded-md border px-3 py-2 text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
            href={`?q=${encodeURIComponent(query.q ?? '')}&plan=${query.plan ?? ''}&status=${query.status ?? ''}&from=${query.from ?? ''}&to=${query.to ?? ''}&page=${Math.max(1, page - 1)}`}
          >
            Previous
          </a>
          <a
            className={`rounded-md border px-3 py-2 text-sm ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
            href={`?q=${encodeURIComponent(query.q ?? '')}&plan=${query.plan ?? ''}&status=${query.status ?? ''}&from=${query.from ?? ''}&to=${query.to ?? ''}&page=${Math.min(totalPages, page + 1)}`}
          >
            Next
          </a>
        </div>
      </div>
    </section>
  );
}
