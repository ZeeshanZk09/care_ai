import { requireCronEnv } from '@/env';

/**
 * Validates whether a cron request includes the expected bearer secret.
 */
export const isAuthorizedCronRequest = (request: Request): boolean => {
  const configuredSecret = requireCronEnv().CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  return bearerToken === configuredSecret;
};
