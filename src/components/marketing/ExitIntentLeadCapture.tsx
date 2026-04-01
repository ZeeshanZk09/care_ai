'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ExitIntentLeadCaptureProps = {
  context: 'pricing' | 'consultation';
  title: string;
  description: string;
};

const STORAGE_KEY_PREFIX = 'exit_intent_seen';

export default function ExitIntentLeadCapture({
  context,
  title,
  description,
}: Readonly<ExitIntentLeadCaptureProps>) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}_${context}`;
    const alreadySeen = window.sessionStorage.getItem(storageKey) === 'true';
    if (alreadySeen) {
      return;
    }

    const handleMouseOut = (event: MouseEvent) => {
      const leavingTop = event.clientY <= 0;
      if (!leavingTop) {
        return;
      }

      window.sessionStorage.setItem(storageKey, 'true');
      setOpen(true);
    };

    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [context]);

  const submitLead = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/marketing/lead-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          context,
          sourcePath: window.location.pathname,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to submit lead capture.');
      }

      toast.success(payload?.message || 'Thanks! Check your resource now.');
      setOpen(false);

      if (payload?.resourceLink && typeof payload.resourceLink === 'string') {
        window.location.href = payload.resourceLink;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lead capture failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-4'>
      <div className='w-full max-w-md rounded-xl border bg-background p-5 shadow-xl'>
        <p className='text-xs font-semibold uppercase tracking-wide text-primary'>Free Resource</p>
        <h3 className='mt-2 text-lg font-semibold'>{title}</h3>
        <p className='mt-2 text-sm text-muted-foreground'>{description}</p>

        <label htmlFor='exit-intent-email' className='mt-4 block text-sm font-medium'>
          Email
        </label>
        <input
          id='exit-intent-email'
          type='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder='you@example.com'
          className='mt-2 w-full rounded-md border px-3 py-2 text-sm'
        />

        <div className='mt-4 flex flex-wrap justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Dismiss
          </Button>
          <Button type='button' onClick={submitLead} disabled={submitting}>
            {submitting ? 'Sending...' : 'Get Free Resource'}
          </Button>
        </div>
      </div>
    </div>
  );
}
