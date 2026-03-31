'use client';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { toast } from 'sonner';
import { register } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Registration successful. Please check your email to verify your account.');
      router.push('/sign-in');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4 mt-8'>
      <h1 className='text-2xl font-bold'>Create an Account</h1>
      <p className='text-gray-600 mb-4'>Sign up to use CareAI</p>

      <form
        onSubmit={handleSubmit}
        className='w-full max-w-sm flex flex-col gap-4 bg-white p-6 rounded-lg shadow-sm border'
      >
        <div>
          <Label htmlFor='name'>Full Name</Label>
          <Input
            id='name'
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor='password'>Password</Label>
          <Input
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button className='w-full' type='submit' disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </Button>
        <div className='text-center text-sm text-gray-600'>
          Already have an account?{' '}
          <Link href='/sign-in' className='text-blue-600 hover:underline'>
            Sign in
          </Link>
        </div>
      </form>

      <div className='flex items-center gap-2 w-full max-w-sm my-2'>
        <div className='flex-1 h-px bg-gray-200'></div>
        <span className='text-sm text-gray-500'>OR</span>
        <div className='flex-1 h-px bg-gray-200'></div>
      </div>

      <div className='w-full max-w-sm flex flex-col gap-3'>
        <Button
          className='w-full'
          variant='outline'
          onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
        >
          Sign up with GitHub
        </Button>
        <Button
          className='w-full'
          variant='outline'
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        >
          Sign up with Google
        </Button>
      </div>
    </div>
  );
}
