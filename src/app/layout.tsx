import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { MobileNav, Navbar } from '@/components/hero-section-demo-1';
import { auth } from '@/auth';
import { SessionProvider } from 'next-auth/react';
import { Footer } from '@/components/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CareAI - Your Personal Health Assistant',
  description:
    'CareAI is an AI-powered health assistant that provides personalized medical advice, symptom analysis, and doctor recommendations. Get quick insights and support for your health concerns anytime, anywhere.',
  icons: {
    icon: '/care_ai_logo.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang='en' className={cn('font-sans', inter.variable)}>
      <body className='[&::-webkit-scrollbar]:w-1  [&::-webkit-scrollbar-track]:bg-gray-100  [&::-webkit-scrollbar-thumb]:bg-gray-300 antialiased relative flex flex-col min-h-screen'>
        <SessionProvider session={session}>
          <Navbar />
          <main className='flex-1'>
            <Toaster
              position='top-right'
              toastOptions={{
                className: 'bg-white text-black',
              }}
            />
            {children}
          </main>
          <Footer />
          <MobileNav />
        </SessionProvider>
      </body>
    </html>
  );
}
