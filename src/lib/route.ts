/**
 * @type {string[]} publicRoutes
 */
export const publicRoutes: string[] = [
  '/',
  '/api/search',
  '/api/recent-purchases',
  '/api/products/bulk',
  '/api/cart/count',
  '/shop',
  '/auth/sign-in',
  '/auth/sign-up',
];
/**
 * @type {string[]} privateRoutes
 */
export const privateRoutes = ['/dashboard'];
/**
 * @type {string[]} authRoutes
 */
export const authRoutes = [
  '/auth/sign-in',
  '/auth/sign-in/factor-one',
  '/auth/sign-in/reset-password',
  '/auth/sign-up',
  '/auth/sign-up/verify-email',
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
