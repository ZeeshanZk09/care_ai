import Link from 'next/link';

const getMessage = (reason: string | undefined) => {
  if (reason === 'blocked') {
    return 'Your account has been blocked. Please contact support for further assistance.';
  }

  if (reason === 'restricted') {
    return 'Your account has restricted access. Please review your account notice and try again later.';
  }

  return 'Authentication failed. Please try again or contact support if the problem continues.';
};

export default async function AuthErrorPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ reason?: string }>;
}>) {
  const params = await searchParams;
  const reason = params.reason;

  return (
    <section className='mx-auto my-16 max-w-2xl rounded-xl border bg-background p-8 shadow-sm'>
      <h1 className='text-2xl font-semibold'>Unable to sign in</h1>
      <p className='mt-3 text-muted-foreground'>{getMessage(reason)}</p>
      <div className='mt-6 flex gap-3'>
        <Link
          href='/sign-in'
          className='rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90'
        >
          Back to Sign In
        </Link>
        <Link href='/contact' className='rounded-md border px-4 py-2 hover:bg-muted'>
          Contact Support
        </Link>
      </div>
    </section>
  );
}
