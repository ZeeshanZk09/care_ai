'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminCreditAdjustForm() {
  const router = useRouter();
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [amountDollars, setAmountDollars] = useState('10');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = targetUserEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Target user email is required.');
      return;
    }

    const parsedAmount = Number(amountDollars);
    if (!Number.isFinite(parsedAmount)) {
      toast.error('Enter a valid adjustment amount.');
      return;
    }

    const deltaCents = Math.round(parsedAmount * 100);
    if (deltaCents === 0) {
      toast.error('Adjustment must be non-zero.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserEmail: normalizedEmail,
          deltaCents,
          note: note.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to adjust credits.');
      }

      toast.success('Credits adjusted successfully.');
      setAmountDollars('');
      setNote('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to adjust credits.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='grid gap-3 rounded-xl border bg-card p-4 shadow-sm'>
      <h3 className='text-lg font-semibold'>Manual Credit Adjustment</h3>
      <p className='text-sm text-muted-foreground'>
        Enter a positive amount to add credits, or a negative amount to subtract credits.
      </p>

      <input
        type='email'
        value={targetUserEmail}
        onChange={(event) => setTargetUserEmail(event.target.value)}
        placeholder='Target user email'
        className='rounded-md border px-3 py-2 text-sm'
        required
      />

      <input
        type='number'
        step='0.01'
        value={amountDollars}
        onChange={(event) => setAmountDollars(event.target.value)}
        placeholder='Amount in USD (ex: 12.50 or -8.00)'
        className='rounded-md border px-3 py-2 text-sm'
        required
      />

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder='Optional note (appears in admin logs)'
        className='h-24 rounded-md border px-3 py-2 text-sm'
      />

      <div className='flex justify-end'>
        <Button type='submit' disabled={submitting}>
          {submitting ? 'Applying...' : 'Apply Adjustment'}
        </Button>
      </div>
    </form>
  );
}
