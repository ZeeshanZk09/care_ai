'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Unable to open billing portal right now.');
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open billing portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type='button' onClick={openPortal} disabled={loading}>
      {loading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
      Open Billing Portal
    </Button>
  );
}
