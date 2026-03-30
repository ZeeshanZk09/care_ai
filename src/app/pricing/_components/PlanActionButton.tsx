'use client';

import { Button } from '@/components/ui/button';
import { type PlanTier } from '@/lib/billing/plans';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

type PlanActionButtonProps = {
  targetPlan: PlanTier;
  currentPlan: PlanTier;
  isAuthenticated: boolean;
  defaultLabel: string;
};

const openBillingSession = async (
  endpoint: '/api/stripe/checkout' | '/api/stripe/portal',
  plan?: PlanTier
) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: endpoint === '/api/stripe/checkout' ? JSON.stringify({ plan }) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || 'Unable to continue with billing right now.';
    throw new Error(message);
  }

  if (!payload?.url) {
    throw new Error('Billing session URL was not returned.');
  }

  window.location.href = payload.url;
};

export default function PlanActionButton({
  targetPlan,
  currentPlan,
  isAuthenticated,
  defaultLabel,
}: Readonly<PlanActionButtonProps>) {
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button
        className='w-full mt-auto'
        variant={targetPlan === 'BASIC' ? 'default' : 'outline'}
        asChild
      >
        <Link href={targetPlan === 'FREE' ? '/sign-up' : '/sign-in'}>
          {targetPlan === 'FREE' ? 'Get Started Free' : defaultLabel}
        </Link>
      </Button>
    );
  }

  if (targetPlan === 'FREE') {
    return (
      <Button className='w-full mt-auto' variant='outline' asChild>
        <Link href='/dashboard'>{currentPlan === 'FREE' ? 'Current Plan' : 'Use Free Plan'}</Link>
      </Button>
    );
  }

  const isCurrentPaidPlan = currentPlan === targetPlan;
  const usePortalForDowngrade = currentPlan === 'PRO' && targetPlan === 'BASIC';
  let actionLabel = defaultLabel;
  if (isCurrentPaidPlan) {
    actionLabel = 'Current Plan';
  } else if (usePortalForDowngrade) {
    actionLabel = 'Manage Downgrade';
  }

  const handleClick = async () => {
    try {
      setLoading(true);

      if (isCurrentPaidPlan || usePortalForDowngrade) {
        if (isCurrentPaidPlan) {
          return;
        }

        await openBillingSession('/api/stripe/portal');
        return;
      }

      await openBillingSession('/api/stripe/checkout', targetPlan);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue with billing.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className='w-full mt-auto'
      variant={targetPlan === 'BASIC' ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={loading || isCurrentPaidPlan}
    >
      {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
      {actionLabel}
    </Button>
  );
}
