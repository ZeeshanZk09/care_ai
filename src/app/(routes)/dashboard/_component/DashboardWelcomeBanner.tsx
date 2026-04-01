'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trackMarketingEvent } from '@/lib/analytics/pixels';

type DashboardWelcomeBannerProps = {
  planTier: 'FREE' | 'BASIC' | 'PRO';
};

export default function DashboardWelcomeBanner({
  planTier,
}: Readonly<DashboardWelcomeBannerProps>) {
  const router = useRouter();
  const isPaidPlan = planTier === 'BASIC' || planTier === 'PRO';

  useEffect(() => {
    trackMarketingEvent('plan_upgraded', {
      planTier,
    });

    const timeout = setTimeout(() => {
      router.replace('/dashboard');
    }, 1800);

    return () => {
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className='mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-green-900'>
      <p className='font-semibold'>Payment successful. Welcome to CareAI.</p>
      {isPaidPlan ? (
        <p className='mt-1 text-sm'>
          Your premium AI models are being activated and are typically ready within 1 to 2 working
          days. We will notify you by email as soon as activation is complete.
        </p>
      ) : (
        <p className='mt-1 text-sm'>
          Your account is ready. You can start consultations immediately.
        </p>
      )}
    </div>
  );
}
