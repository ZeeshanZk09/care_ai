import { revalidatePath } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getEntitlementSnapshot } from '@/lib/billing/entitlements';
import { PLAN_NAMES, type PlanTier } from '@/lib/billing/plans';
import prisma from '@/lib/prisma';
import BillingPortalButton from '../_component/BillingPortalButton';
import DashboardWelcomeBanner from '../_component/DashboardWelcomeBanner';
import ProfileUsageCharts from './_components/ProfileUsageCharts';

const formatDate = (date: Date | null | undefined) => {
  if (!date) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date);
};

const getNextMonthlyResetDate = (resetDate: Date | null | undefined) => {
  const baseDate = resetDate ?? new Date();
  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 1, 0, 0, 0, 0));
};

const toUtcDayKey = (date: Date) => date.toISOString().slice(0, 10);

const toUtcMonthKey = (date: Date) => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const getLastDayKeys = (totalDays: number) => {
  const now = new Date();
  const keys: string[] = [];

  for (let index = totalDays - 1; index >= 0; index -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - index, 0, 0, 0, 0)
    );
    keys.push(toUtcDayKey(date));
  }

  return keys;
};

const getLastMonthKeys = (totalMonths: number) => {
  const now = new Date();
  const keys: string[] = [];

  for (let index = totalMonths - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1, 0, 0, 0, 0));
    keys.push(toUtcMonthKey(date));
  }

  return keys;
};

const formatDayLabel = (key: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00.000Z`));
};

const formatMonthLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, (month || 1) - 1, 1, 0, 0, 0, 0)));
};

const getInitials = (name: string | null, email: string) => {
  const source = (name || email).trim();
  if (!source) {
    return 'U';
  }

  const chunks = source.split(/\s+/).filter(Boolean);
  if (chunks.length === 1) {
    return chunks[0].slice(0, 2).toUpperCase();
  }

  return (chunks[0][0] + chunks[1][0]).toUpperCase();
};

const getSixMonthsRangeStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0));
};

export default async function UserProfile({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string }>;
}>) {
  const [session, routeParams] = await Promise.all([auth(), params]);

  if (!session?.user?.id) {
    return (
      <div className='w-full h-screen flex flex-col justify-center items-center gap-4'>
        <h1 className='text-2xl font-bold'>You are not signed in</h1>
        <Link
          href='/sign-in'
          className='px-4 py-2 bg-primary text-white rounded hover:bg-primary/90'
        >
          Sign In
        </Link>
      </div>
    );
  }

  const profileUserId = routeParams.id;
  const isAdmin = session.user.role === 'ADMIN';
  const isOwnProfile = session.user.id === profileUserId;

  if (!isOwnProfile && !isAdmin) {
    redirect(`/dashboard/${session.user.id}`);
  }

  const updateProfileAction = async (formData: FormData) => {
    'use server';

    const currentSession = await auth();
    if (!currentSession?.user?.id) {
      redirect('/sign-in');
    }

    const canEdit =
      currentSession.user.id === profileUserId || currentSession.user.role === 'ADMIN';

    if (!canEdit) {
      redirect(`/dashboard/${currentSession.user.id}`);
    }

    const nameField = formData.get('name');
    const ageField = formData.get('age');
    const nameRaw = typeof nameField === 'string' ? nameField.trim() : '';
    const ageRaw = typeof ageField === 'string' ? ageField.trim() : '';

    let parsedAge: number | null = null;
    if (ageRaw.length > 0) {
      const candidateAge = Number(ageRaw);
      if (Number.isFinite(candidateAge) && candidateAge >= 0 && candidateAge <= 120) {
        parsedAge = Math.floor(candidateAge);
      }
    }

    await prisma.user.update({
      where: { id: profileUserId },
      data: {
        name: nameRaw.length > 0 ? nameRaw : null,
        age: parsedAge,
      },
    });

    revalidatePath(`/dashboard/${profileUserId}`);
  };

  const [
    query,
    user,
    entitlement,
    userState,
    subscription,
    consultationEvents,
    totalConsultations,
  ] = await Promise.all([
    searchParams,
    prisma.user.findUnique({
      where: { id: profileUserId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        age: true,
        status: true,
        createdAt: true,
        lastActiveAt: true,
      },
    }),
    getEntitlementSnapshot(profileUserId),
    prisma.user.findUnique({
      where: { id: profileUserId },
      select: {
        consultationsResetAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: {
        userId: profileUserId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
        },
      },
      select: {
        currentPeriodEnd: true,
      },
      orderBy: {
        currentPeriodEnd: 'desc',
      },
    }),
    prisma.consultation.findMany({
      where: {
        userId: profileUserId,
        createdAt: {
          gte: getSixMonthsRangeStart(),
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
    }),
    prisma.consultation.count({
      where: {
        userId: profileUserId,
      },
    }),
  ]);

  if (!user) {
    return (
      <div className='w-full h-screen flex flex-col justify-center items-center gap-4'>
        <h1 className='text-2xl font-bold'>User profile not found</h1>
        <Link
          href='/dashboard'
          className='px-4 py-2 bg-primary text-white rounded hover:bg-primary/90'
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const dailyKeys = getLastDayKeys(30);
  const monthlyKeys = getLastMonthKeys(6);

  const dailyUsageMap = new Map(dailyKeys.map((key) => [key, 0]));
  const monthlyUsageMap = new Map(monthlyKeys.map((key) => [key, 0]));

  let successfulConsultations = 0;
  let deniedConsultations = 0;

  for (const event of consultationEvents) {
    const dayKey = toUtcDayKey(event.createdAt);
    const monthKey = toUtcMonthKey(event.createdAt);

    if (dailyUsageMap.has(dayKey)) {
      dailyUsageMap.set(dayKey, (dailyUsageMap.get(dayKey) ?? 0) + 1);
    }

    if (monthlyUsageMap.has(monthKey)) {
      monthlyUsageMap.set(monthKey, (monthlyUsageMap.get(monthKey) ?? 0) + 1);
    }

    if (event.status === 'SUCCESS') {
      successfulConsultations += 1;
    } else {
      deniedConsultations += 1;
    }
  }

  const dailyLabels = dailyKeys.map(formatDayLabel);
  const dailyValues = dailyKeys.map((key) => dailyUsageMap.get(key) ?? 0);
  const monthlyLabels = monthlyKeys.map(formatMonthLabel);
  const monthlyValues = monthlyKeys.map((key) => monthlyUsageMap.get(key) ?? 0);

  const displayInitials = getInitials(user.name, user.email);

  const currentPlan: PlanTier = entitlement.plan;
  const isPaidPlan = currentPlan === 'BASIC' || currentPlan === 'PRO';
  const showWelcomeBanner = query.welcome === 'true';
  const nextResetDate =
    currentPlan === 'BASIC' ? getNextMonthlyResetDate(userState?.consultationsResetAt) : null;
  const renewalDate = currentPlan === 'PRO' ? subscription?.currentPeriodEnd : null;

  return (
    <section className='space-y-6 px-4'>
      <div className='w-full flex justify-between items-start mb-8 gap-4 sm:gap-0 px-4'>
        <div className='flex items-center gap-4'>
          {user.image ? (
            <Image
              src={user.image}
              alt='User avatar'
              width={72}
              height={72}
              className='h-18 w-18 rounded-full border object-cover'
            />
          ) : (
            <div className='h-18 w-18 rounded-full border bg-muted flex items-center justify-center text-xl font-semibold'>
              {displayInitials}
            </div>
          )}

          <div>
            <h1 className='text-3xl font-bold'>Profile Management</h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              {user.name || 'CareAI User'} • {user.email}
            </p>
          </div>
        </div>

        <div>
          <p className='mt-2 text-sm text-muted-foreground'>
            Member since {formatDate(user.createdAt)}
          </p>
        </div>
      </div>

      <div className='px-4'>
        {showWelcomeBanner ? <DashboardWelcomeBanner planTier={currentPlan} /> : null}

        {isPaidPlan && entitlement.premiumAccessPending ? (
          <div className='mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900'>
            <p className='font-semibold'>Premium model activation in progress</p>
            <p className='mt-1 text-sm'>
              Your premium AI models are being activated. This typically takes 1 to 2 working days.
              You will receive an email once they are ready. Standard models are available in the
              meantime.
            </p>
          </div>
        ) : null}

        <div className='mb-6 grid gap-4 lg:grid-cols-3'>
          <article className='rounded-xl border bg-card p-5 shadow-sm lg:col-span-2'>
            <h2 className='text-xl font-semibold'>Profile Details</h2>
            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Display Name
                </p>
                <p className='text-base font-semibold'>{user.name || 'Not set'}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Email</p>
                <p className='text-base font-semibold'>{user.email}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Age</p>
                <p className='text-base font-semibold'>{user.age ?? 'Not set'}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Account Status
                </p>
                <p className='text-base font-semibold'>{user.status}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Last Active</p>
                <p className='text-base font-semibold'>{formatDate(user.lastActiveAt)}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>User ID</p>
                <p className='text-sm font-mono break-all'>{user.id}</p>
              </div>
            </div>
          </article>

          <article className='rounded-xl border bg-card p-5 shadow-sm'>
            <h2 className='text-xl font-semibold'>Update Profile</h2>
            <form action={updateProfileAction} className='mt-4 space-y-3'>
              <div>
                <label
                  htmlFor='name'
                  className='text-xs uppercase tracking-wide text-muted-foreground'
                >
                  Name
                </label>
                <input
                  id='name'
                  name='name'
                  defaultValue={user.name ?? ''}
                  placeholder='Your full name'
                  className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                />
              </div>
              <div>
                <label
                  htmlFor='age'
                  className='text-xs uppercase tracking-wide text-muted-foreground'
                >
                  Age
                </label>
                <input
                  id='age'
                  name='age'
                  defaultValue={user.age ?? ''}
                  min={0}
                  max={120}
                  type='number'
                  placeholder='Enter age'
                  className='mt-1 w-full rounded-md border px-3 py-2 text-sm'
                />
              </div>
              <button
                type='submit'
                className='inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90'
              >
                Save Profile
              </button>
            </form>
          </article>
        </div>

        <div className='mb-6 grid gap-4 lg:grid-cols-3'>
          <article className='rounded-xl border bg-card p-5 shadow-sm lg:col-span-2'>
            <h2 className='text-xl font-semibold'>Plan Status</h2>
            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Current Tier
                </p>
                <p className='text-base font-semibold'>{PLAN_NAMES[currentPlan]}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Consultations Used
                </p>
                <p className='text-base font-semibold'>{entitlement.consultationsUsed}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Remaining</p>
                <p className='text-base font-semibold'>
                  {entitlement.consultationsRemaining === null
                    ? 'Unlimited'
                    : entitlement.consultationsRemaining}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Next Reset (Basic)
                </p>
                <p className='text-base font-semibold'>
                  {currentPlan === 'BASIC' ? formatDate(nextResetDate) : 'Not applicable'}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Renewal Date (Pro)
                </p>
                <p className='text-base font-semibold'>
                  {currentPlan === 'PRO' ? formatDate(renewalDate) : 'Not applicable'}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Premium Status
                </p>
                <p className='text-base font-semibold'>
                  {entitlement.premiumAccessPending ? 'Pending activation' : 'Active'}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                  Total Sessions
                </p>
                <p className='text-base font-semibold'>{totalConsultations}</p>
              </div>
            </div>
          </article>

          <article className='rounded-xl border bg-card p-5 shadow-sm'>
            <h2 className='text-xl font-semibold'>Billing</h2>
            <p className='mt-3 text-sm text-muted-foreground'>
              Current plan:{' '}
              <span className='font-semibold text-foreground'>{PLAN_NAMES[currentPlan]}</span>
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>
              Next billing date:{' '}
              <span className='font-semibold text-foreground'>
                {formatDate(subscription?.currentPeriodEnd)}
              </span>
            </p>
            <div className='mt-4'>
              {currentPlan === 'FREE' ? (
                <Link
                  href='/pricing'
                  className='inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90'
                >
                  Upgrade Plan
                </Link>
              ) : (
                <BillingPortalButton />
              )}
            </div>
          </article>
        </div>

        <ProfileUsageCharts
          dailyLabels={dailyLabels}
          dailyValues={dailyValues}
          monthlyLabels={monthlyLabels}
          monthlyValues={monthlyValues}
          successfulConsultations={successfulConsultations}
          deniedConsultations={deniedConsultations}
        />
      </div>
    </section>
  );
}
