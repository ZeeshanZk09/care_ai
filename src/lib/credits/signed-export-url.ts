import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/env';

type ExportTokenPayload = {
  userId: string;
  type: 'health_export';
  exp: number;
};

const base64UrlEncode = (value: string) => {
  return Buffer.from(value, 'utf-8').toString('base64url');
};

const base64UrlDecode = (value: string) => {
  return Buffer.from(value, 'base64url').toString('utf-8');
};

const sign = (value: string) => {
  return createHmac('sha256', env.NEXTAUTH_SECRET).update(value).digest('base64url');
};

export const createSignedHealthExportUrl = (userId: string, ttlSeconds = 60 * 60) => {
  const payload: ExportTokenPayload = {
    userId,
    type: 'health_export',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  const token = `${encodedPayload}.${signature}`;

  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/features/health-export/download?token=${encodeURIComponent(token)}`;

  return {
    url,
    expiresInSeconds: ttlSeconds,
  };
};

export const verifySignedHealthExportToken = (token: string): ExportTokenPayload | null => {
  const [encodedPayload, providedSignature] = token.split('.');

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as ExportTokenPayload;
    if (!parsed || parsed.type !== 'health_export' || !parsed.userId || !parsed.exp) {
      return null;
    }

    if (Math.floor(Date.now() / 1000) > parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
