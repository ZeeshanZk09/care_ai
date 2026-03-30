import Link from 'next/link';

const getSuspendedMessage = (reason: string | undefined) => {
  if (reason === 'blocked') {
    return 'Your account is blocked. Access has been permanently disabled until support manually restores your account.';
  }

  if (reason === 'restricted') {
    return 'Your account is temporarily restricted. Please follow the instructions sent to your email to restore access.';
  }

  return 'Your account is currently suspended. Please contact support for next steps.';
};

export default async function AccountSuspendedPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ reason?: string }>;
}>) {
  const params = await searchParams;
  const reason = params.reason;

  return (
    <section className='mx-auto my-16 max-w-2xl rounded-xl border bg-background p-8 shadow-sm'>
      <h1 className='text-2xl font-semibold'>Account Suspended</h1>
      <p className='mt-3 text-muted-foreground'>{getSuspendedMessage(reason)}</p>
      <div className='mt-6 flex gap-3'>
        <Link href='/contact' className='rounded-md bg-primary px-4 py-2 text-primary-foreground'>
          Contact Support
        </Link>
        <Link href='/' className='rounded-md border px-4 py-2 hover:bg-muted'>
          Back to Home
        </Link>
      </div>
    </section>
  );
}
