'use client';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { toast } from 'sonner';
import { forgotPassword } from '@/lib/actions/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success('If an account with that email exists, we sent a password reset link.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4 mt-8'>
      <h1 className='text-2xl font-bold'>Forgot Password</h1>
      <p className='text-gray-600 mb-4'>Enter your email to receive a reset link</p>

      <form
        onSubmit={handleSubmit}
        className='w-full max-w-sm flex flex-col gap-4 bg-white p-6 rounded-lg shadow-sm border'
      >
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
        <Button className='w-full' type='submit' disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>
        <div className='text-center text-sm text-gray-600 mt-2'>
          Remember your password?{' '}
          <Link href='/sign-in' className='text-blue-600 hover:underline'>
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
