'use client';

import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] px-4 text-center'>
      <div className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-6'>
        <AlertTriangle className='h-10 w-10 text-red-600 dark:text-red-500' />
      </div>
      <h2 className='text-3xl font-bold tracking-tight mb-2'>Something went wrong!</h2>
      <p className='text-neutral-500 dark:text-neutral-400 mb-8 max-w-md'>
        An unexpected error occurred. Our team has been notified.
        {error?.message && (
          <span className='block mt-4 text-sm font-mono opacity-80 bg-neutral-100 dark:bg-neutral-800 p-2 rounded'>
            {error.message}
          </span>
        )}
      </p>
      <div className='flex flex-wrap items-center justify-center gap-4'>
        <Button onClick={() => reset()} variant='default'>
          Try again
        </Button>
        <Button asChild variant='outline'>
          <Link href='/'>Return to Home</Link>
        </Button>
      </div>
    </div>
  );
}
