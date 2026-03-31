import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  /* config options here */
  reactCompiler: true,
  // Pin Turbopack root to this project to avoid accidental parent lockfile detection.
  turbopack: {
    root: process.cwd(),
  },
  // Prevent framework-level trailing slash redirects that can be cached as 308.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/plans',
        destination: '/pricing',
        permanent: true,
      },
    ];
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isProduction = process.env.NODE_ENV === 'production';
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
      'https://js.stripe.com',
      'https://*.daily.co',
    ].join(' ');
    const connectSrc = [
      "'self'",
      'https://api.stripe.com',
      'https://openrouter.ai',
      'https://api.vapi.ai',
      'wss://api.vapi.ai',
      'https://*.vapi.ai',
      'wss://*.vapi.ai',
      'https://c.daily.co',
      'https://*.daily.co',
      'wss://*.daily.co',
      'https://*.ingest.sentry.io',
      ...(isDevelopment
        ? ['ws://127.0.0.1:*', 'ws://localhost:*', 'http://127.0.0.1:*', 'http://localhost:*']
        : []),
    ].join(' ');

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "font-src 'self' https: data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https: mediastream:",
      "object-src 'none'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.daily.co",
      `connect-src ${connectSrc}`,
      "worker-src 'self' blob:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          ...(isProduction
            ? [
                {
                  key: 'Content-Security-Policy',
                  value: contentSecurityPolicy,
                },
              ]
            : []),
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=*, geolocation=()',
          },
        ],
      },
      {
        source: '/',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/about',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/blog/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/contact',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/cookie-policy',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/faq',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/features',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/pricing',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/privacy',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/terms',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
      {
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/account/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/auth/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/sign-in',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/sign-up',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/forgot-password',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/reset-password',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/verify-email',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
