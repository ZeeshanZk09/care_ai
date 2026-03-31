import type React from 'react';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Authentication',
  description: 'Sign in or create your MediVoice AI account.',
  path: '/sign-in',
  noIndex: true,
});

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className='my-10'>{children}</div>;
}
