import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
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
  async headers() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
      'https://js.stripe.com',
    ].join(' ');
    const connectSrc = [
      "'self'",
      'https://api.stripe.com',
      'https://openrouter.ai',
      ...(isDevelopment
        ? ['ws://127.0.0.1:*', 'ws://localhost:*', 'http://127.0.0.1:*', 'http://localhost:*']
        : []),
    ].join(' ');

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "font-src 'self' https: data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      `connect-src ${connectSrc}`,
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
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
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
