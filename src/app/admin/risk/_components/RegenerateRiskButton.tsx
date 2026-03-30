'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function RegenerateRiskButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const regenerate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/risk/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to generate risk report.');
      }

      toast.success('Risk report generated successfully.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Risk report generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type='button' onClick={regenerate} disabled={loading}>
      {loading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
      Regenerate Report
    </Button>
  );
}
