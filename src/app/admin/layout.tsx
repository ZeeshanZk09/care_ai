import { auth } from '@/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const navItems = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/billing', label: 'Billing' },
  { href: '/admin/logs', label: 'Logs' },
  { href: '/admin/risk', label: 'Risk' },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <section className='mx-auto my-8 w-full max-w-7xl px-4'>
      <header className='mb-6 rounded-xl border bg-card p-4 shadow-sm'>
        <h1 className='text-2xl font-semibold'>Admin Panel</h1>
        <nav className='mt-4 flex flex-wrap gap-2'>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='rounded-md border px-3 py-2 text-sm hover:bg-muted'
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </section>
  );
}
