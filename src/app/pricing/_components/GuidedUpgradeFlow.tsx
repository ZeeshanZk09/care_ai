'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type GuidedUpgradeFlowProps = {
  isAuthenticated: boolean;
};

type UpgradePlan = 'BASIC' | 'PRO';

const PLAN_MONTHLY_CENTS: Record<UpgradePlan, number> = {
  BASIC: 1900,
  PRO: 4900,
};

const formatCurrency = (amountCents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
};

export default function GuidedUpgradeFlow({ isAuthenticated }: Readonly<GuidedUpgradeFlowProps>) {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan>('BASIC');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    const monthly = PLAN_MONTHLY_CENTS[selectedPlan];
    const annualProjected = monthly * 12;

    return {
      monthly,
      annualProjected,
    };
  }, [selectedPlan]);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to continue to checkout.');
      }

      if (!payload?.url) {
        throw new Error('Checkout URL not returned.');
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className='mt-10 rounded-xl border bg-card p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-2xl font-semibold'>Guided Upgrade Flow</h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            Move through a simple plan selector and summary before Stripe checkout.
          </p>
        </div>
        <Button type='button' onClick={() => setOpen(true)}>
          Open Guided Flow
        </Button>
      </div>

      {open ? (
        <div className='fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-lg rounded-xl border bg-background p-5 shadow-xl'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold'>Upgrade in 2 steps</h3>
              <Button type='button' variant='ghost' onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>

            {isAuthenticated ? null : (
              <div className='mt-4 rounded-lg border p-4'>
                <p className='text-sm text-muted-foreground'>
                  Sign in first to continue with the guided upgrade flow.
                </p>
                <div className='mt-3'>
                  <Button asChild>
                    <Link href='/sign-in'>Sign In</Link>
                  </Button>
                </div>
              </div>
            )}

            {isAuthenticated && step === 1 ? (
              <div className='mt-4 space-y-3'>
                <p className='text-sm font-medium'>Step 1: Choose plan</p>
                <label className='flex items-center gap-2 rounded-md border p-3'>
                  <input
                    type='radio'
                    checked={selectedPlan === 'BASIC'}
                    onChange={() => setSelectedPlan('BASIC')}
                  />
                  <span>Basic - {formatCurrency(PLAN_MONTHLY_CENTS.BASIC)} / month</span>
                </label>
                <label className='flex items-center gap-2 rounded-md border p-3'>
                  <input
                    type='radio'
                    checked={selectedPlan === 'PRO'}
                    onChange={() => setSelectedPlan('PRO')}
                  />
                  <span>Pro - {formatCurrency(PLAN_MONTHLY_CENTS.PRO)} / month</span>
                </label>

                <div className='mt-4 flex justify-end'>
                  <Button type='button' onClick={() => setStep(2)}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : null}

            {isAuthenticated && step === 2 ? (
              <div className='mt-4 space-y-3'>
                <p className='text-sm font-medium'>Step 2: Confirm summary</p>
                <div className='rounded-md border p-3 text-sm'>
                  <p>
                    <strong>Selected plan:</strong> {selectedPlan}
                  </p>
                  <p>
                    <strong>Monthly price:</strong> {formatCurrency(summary.monthly)}
                  </p>
                  <p>
                    <strong>Projected annual spend:</strong>{' '}
                    {formatCurrency(summary.annualProjected)}
                  </p>
                </div>

                <div className='flex justify-between gap-2'>
                  <Button type='button' variant='outline' onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type='button' onClick={startCheckout} disabled={loading}>
                    {loading ? 'Redirecting...' : 'Proceed to Stripe Checkout'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
