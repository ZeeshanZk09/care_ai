'use client';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const CAPTCHA_ERROR_PREFIX = 'CAPTCHA_REQUIRED|';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaPrompt, setCaptchaPrompt] = useState<string | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        captchaAnswer,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.startsWith(CAPTCHA_ERROR_PREFIX)) {
          const [, prompt] = res.error.split('|');
          setCaptchaPrompt(prompt ?? 'Please solve the CAPTCHA challenge.');
          setCaptchaAnswer('');
          toast.error('Too many failed attempts. Complete the CAPTCHA challenge to continue.');
          return;
        }

        toast.error(
          res.error === 'CredentialsSignin'
            ? 'Invalid credentials. Please verify email if not done.'
            : res.error
        );
      } else if (res?.ok) {
        setCaptchaPrompt(null);
        setCaptchaAnswer('');
        router.push('/dashboard');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4 mt-8'>
      <h1 className='text-2xl font-bold'>Welcome to CareAI</h1>
      <p className='text-gray-600 mb-4'>Sign in to start your consultation</p>

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
        <div>
          <Label htmlFor='password'>Password</Label>
          <Input
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {captchaPrompt ? (
          <div>
            <Label htmlFor='captchaAnswer'>{captchaPrompt}</Label>
            <Input
              id='captchaAnswer'
              type='text'
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              placeholder='Enter your answer'
              required
            />
          </div>
        ) : null}
        <div className='flex justify-between items-center text-sm'>
          <Link href='/forgot-password' className='text-blue-600 hover:underline'>
            Forgot password?
          </Link>
          <Link href='/sign-up' className='text-blue-600 hover:underline'>
            Create account
          </Link>
        </div>
        <Button className='w-full' type='submit' disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
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
          Sign in with GitHub
        </Button>
        <Button
          className='w-full'
          variant='outline'
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
