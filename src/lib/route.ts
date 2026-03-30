/**
 * @type {string[]} publicRoutes
 */
export const publicRoutes: string[] = [
  '/',
  '/contact',
  '/about',
  '/pricing',
  '/privacy',
  '/cookie-policy',
  '/account/suspended',
];
/**
 * @type {string[]} privateRoutes
 */
export const privateRoutes = ['/dashboard'];
export const adminRoutes = ['/admin'];
/**
 * @type {string[]} authRoutes
 */
export const authRoutes = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/error',
];

/**
 * @type {string} apiPrefixAuth
 */
export const apiPrefixAuth = '/api/auth';

/**
 * @type {string} DEFAULT_REDIRECT
 */
export const DEFAULT_REDIRECT = '/dashboard';
