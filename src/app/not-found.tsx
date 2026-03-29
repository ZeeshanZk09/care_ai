import Link from 'next/link';
import { Button } from '../components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] px-4 text-center'>
      <div className='flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 mb-6'>
        <FileQuestion className='h-10 w-10 text-blue-600 dark:text-blue-500' />
      </div>
      <h2 className='text-3xl font-bold tracking-tight mb-2'>404 - Page Not Found</h2>
      <p className='text-neutral-500 dark:text-neutral-400 mb-8 max-w-md'>
        We couldn't find the page you were looking for. It might have been moved, deleted, or never
        existed in the first place.
      </p>
      <Button asChild>
        <Link href='/'>Return to Home page</Link>
      </Button>
    </div>
  );
}
