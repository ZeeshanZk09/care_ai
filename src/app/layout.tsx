import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import { auth } from '@/auth';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import GoogleTagManager from '@/components/analytics/GoogleTagManager';
import { Footer } from '@/components/Footer';
import { MobileNav, Navbar } from '@/components/hero-section-demo-1';
import CookieBanner from '@/components/marketing/CookieBanner';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { SessionProvider } from 'next-auth/react';
import { buildMetadata, seoTitleTemplate } from '@/lib/seo';
import {
  AUTHOR_NAME,
  DEFAULT_OG_IMAGE,
  KEYWORDS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
} from '@/lib/seo.config';
import { buildOrganizationSchema } from '@/lib/structured-data';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  ...buildMetadata(),
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: seoTitleTemplate,
  },
  description: SITE_DESCRIPTION,
  keywords: [...KEYWORDS],
  authors: [{ name: AUTHOR_NAME }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} Open Graph Image`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION,
  },
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
  const organizationSchema = buildOrganizationSchema();

  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn('font-sans', inter.variable, geistSans.variable, geistMono.variable)}
    >
      <head>
        <script type='application/ld+json' suppressHydrationWarning>
          {JSON.stringify(organizationSchema)}
        </script>
      </head>
      <body className='[&::-webkit-scrollbar]:w-1  [&::-webkit-scrollbar-track]:bg-gray-100  [&::-webkit-scrollbar-thumb]:bg-gray-300 antialiased relative flex flex-col min-h-screen'>
        <ThemeProvider
          attribute='data-theme'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider session={session}>
            <GoogleTagManager />
            <GoogleAnalytics />
            <Navbar />
            <main className='flex-1'>
              <Toaster position='top-right' />
              {children}
            </main>
            <Footer />
            <MobileNav />
            <CookieBanner />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
