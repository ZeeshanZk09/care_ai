'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PaymentElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { CREDIT_PACKAGES, type CreditPackage, type CreditPackageId } from '@/lib/billing/plans';
import { toast } from 'sonner';

type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  featureKey: string | null;
  createdAt: string;
};

type CreditsResponse = {
  balance: number;
  ledger: LedgerRow[];
};

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
console.log(publishableKey);
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const formatCurrency = (amountCents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100);
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

type TopUpCheckoutFormProps = {
  packageInfo: CreditPackage;
  clientSecret: string;
  onCompleted: () => Promise<void>;
};

function TopUpCheckoutForm({
  packageInfo,
  clientSecret,
  onCompleted,
}: Readonly<TopUpCheckoutFormProps>) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required',
      });

      if (result.error) {
        throw new Error(result.error.message || 'Payment confirmation failed.');
      }

      toast.success(`Top-up complete: ${packageInfo.totalCredits} credits added.`);
      await onCompleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Top-up confirmation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className='space-y-3'>
      <PaymentElement />
      <Button type='submit' disabled={!stripe || !elements || submitting}>
        {submitting ? 'Confirming...' : `Pay ${formatCurrency(packageInfo.amountCents)}`}
      </Button>
    </form>
  );
}

export default function CreditWallet() {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<CreditPackageId | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);

  const selectedPackage = useMemo(
    () => CREDIT_PACKAGES.find((item) => item.id === selectedPackageId) ?? null,
    [selectedPackageId]
  );

  const refreshCredits = useCallback(async (): Promise<number | null> => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/credits');
      if (!response.ok) {
        throw new Error('Failed to fetch credits.');
      }

      const payload = (await response.json()) as CreditsResponse;
      setBalance(payload.balance);
      setLedger(payload.ledger || []);
      return payload.balance;
    } catch (error) {
      console.warn('[CreditWallet] Failed to refresh credits:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    const openTopUp = () => {
      setOpen(true);
    };

    window.addEventListener('credits:open-topup', openTopUp);
    return () => {
      window.removeEventListener('credits:open-topup', openTopUp);
    };
  }, []);

  const beginTopUp = async (packageId: CreditPackageId) => {
    setLoadingIntent(true);
    setClientSecret(null);
    setSelectedPackageId(packageId);

    try {
      const response = await fetch('/api/billing/credits/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to initialize top-up.');
      }

      if (!payload?.clientSecret) {
        throw new Error('Stripe client secret was not returned.');
      }

      setClientSecret(payload.clientSecret);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to initialize top-up.');
      setSelectedPackageId(null);
      setClientSecret(null);
    } finally {
      setLoadingIntent(false);
    }
  };

  const handlePaymentCompleted = async () => {
    const beforeBalance = balance;
    let latestBalance = beforeBalance;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fetchedBalance = await refreshCredits();
      if (typeof fetchedBalance === 'number') {
        latestBalance = fetchedBalance;
      }

      if (latestBalance > beforeBalance) {
        break;
      }

      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setClientSecret(null);
    setSelectedPackageId(null);
  };

  return (
    <div className='flex items-center gap-2'>
      <span className='rounded-full border px-3 py-1 text-xs font-semibold'>
        Credits: {loading ? '...' : formatCurrency(balance)}
      </span>
      <Button type='button' size='sm' onClick={() => setOpen(true)}>
        Top Up
      </Button>

      {open ? (
        <div className='fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-2xl rounded-xl border bg-background p-5 shadow-xl'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold'>Credit Wallet</h3>
              <Button type='button' variant='ghost' onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>

            <p className='mt-1 text-sm text-muted-foreground'>
              Current balance: <strong>{formatCurrency(balance)}</strong>
            </p>

            {publishableKey ? null : (
              <div className='mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900'>
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing. Stripe top-up UI is unavailable.
              </div>
            )}

            <div className='mt-4 grid gap-3 md:grid-cols-3'>
              {CREDIT_PACKAGES.map((pack) => (
                <button
                  type='button'
                  key={pack.id}
                  onClick={() => void beginTopUp(pack.id)}
                  className={`rounded-lg border p-3 text-left ${selectedPackageId === pack.id ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  <p className='text-sm font-semibold'>{pack.id.replace('credits_', '')} credits</p>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Pay {formatCurrency(pack.amountCents)}
                  </p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Base: {pack.credits} | Bonus: {pack.bonus}
                  </p>
                </button>
              ))}
            </div>

            {loadingIntent ? <p className='mt-3 text-sm'>Initializing payment...</p> : null}

            {selectedPackage && clientSecret && publishableKey ? (
              <div className='mt-4 rounded-lg border p-3'>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <TopUpCheckoutForm
                    packageInfo={selectedPackage}
                    clientSecret={clientSecret}
                    onCompleted={handlePaymentCompleted}
                  />
                </Elements>
              </div>
            ) : null}

            <details className='mt-5 rounded-lg border p-3'>
              <summary className='cursor-pointer text-sm font-medium'>
                Recent ledger activity
              </summary>
              <div className='mt-3 max-h-64 overflow-auto'>
                <table className='min-w-full text-sm'>
                  <thead>
                    <tr className='border-b text-left'>
                      <th className='px-2 py-1'>Delta</th>
                      <th className='px-2 py-1'>Reason</th>
                      <th className='px-2 py-1'>Feature</th>
                      <th className='px-2 py-1'>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row) => (
                      <tr key={row.id} className='border-b'>
                        <td className='px-2 py-1'>
                          {row.delta > 0 ? '+' : ''}
                          {formatCurrency(row.delta)}
                        </td>
                        <td className='px-2 py-1'>{row.reason}</td>
                        <td className='px-2 py-1'>{row.featureKey ?? '-'}</td>
                        <td className='px-2 py-1'>{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                    {ledger.length === 0 ? (
                      <tr>
                        <td className='px-2 py-2 text-muted-foreground' colSpan={4}>
                          No credit activity yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </div>
      ) : null}
    </div>
  );
}
