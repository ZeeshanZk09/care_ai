'use client';

import { Button } from '@/components/ui/button';

type PaygGateProps = {
  open: boolean;
  balance: number;
  required: number;
  featureLabel: string;
  onClose: () => void;
};

const formatCurrency = (amountCents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100);
};

export default function PaygGate({
  open,
  balance,
  required,
  featureLabel,
  onClose,
}: Readonly<PaygGateProps>) {
  if (!open) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-4'>
      <div className='w-full max-w-md rounded-xl border bg-background p-5 shadow-xl'>
        <p className='text-xs font-semibold uppercase tracking-wide text-primary'>
          Credits Required
        </p>
        <h3 className='mt-2 text-lg font-semibold'>Not enough credits for {featureLabel}</h3>
        <p className='mt-2 text-sm text-muted-foreground'>
          This feature requires {formatCurrency(required)} credits. Your current balance is{' '}
          {formatCurrency(balance)}.
        </p>

        <div className='mt-3 rounded-md border bg-muted/40 p-3 text-sm'>
          <p>
            Balance: <strong>{formatCurrency(balance)}</strong>
          </p>
          <p>
            Required: <strong>{formatCurrency(required)}</strong>
          </p>
        </div>

        <div className='mt-4 flex flex-wrap justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onClose}>
            Close
          </Button>
          <Button
            type='button'
            onClick={() => {
              window.dispatchEvent(new CustomEvent('credits:open-topup'));
              onClose();
            }}
          >
            Top Up Credits
          </Button>
        </div>
      </div>
    </div>
  );
}
