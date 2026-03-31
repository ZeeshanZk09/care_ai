import type React from 'react';
import { auth } from '@/auth';
import { buildMetadata } from '@/lib/seo';
import { redirect } from 'next/navigation';

export const metadata = buildMetadata({
  title: 'Dashboard',
  description: 'User dashboard for MediVoice AI consultations.',
  path: '/dashboard',
  noIndex: true,
});

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  return <>{children}</>;
}
