import { signIn } from '@/auth';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
      <h1 className='text-2xl font-bold'>Welcome to CareAI</h1>
      <p className='text-gray-600 mb-8'>Sign in to start your consultation</p>

      <form
        action={async () => {
          'use server';
          await signIn('github', { redirectTo: '/dashboard' });
        }}
        className='w-full max-w-sm'
      >
        <Button className='w-full' type='submit'>
          Sign in with GitHub
        </Button>
      </form>

      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/dashboard' });
        }}
        className='w-full max-w-sm'
      >
        <Button className='w-full' variant='outline' type='submit'>
          Sign in with Google
        </Button>
      </form>
    </div>
  );
}
