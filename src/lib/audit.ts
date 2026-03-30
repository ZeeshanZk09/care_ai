import prisma from '@/lib/prisma';

type HeaderBag = Headers | Record<string, string | undefined> | null | undefined;

type AuditLogInput = {
  userId?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

const readHeaderValue = (headers: HeaderBag, name: string) => {
  if (!headers) {
    return null;
  }

  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const direct = headers[name];
  if (typeof direct === 'string') {
    return direct;
  }

  const lower = headers[name.toLowerCase()];
  return typeof lower === 'string' ? lower : null;
};

export const getClientIp = (headers: HeaderBag): string | null => {
  const forwardedFor = readHeaderValue(headers, 'x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = readHeaderValue(headers, 'x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return null;
};

export const getUserAgent = (headers: HeaderBag): string | null => {
  const userAgent = readHeaderValue(headers, 'user-agent');
  return userAgent?.trim() || null;
};

export const writeAuditLog = async ({
  userId,
  action,
  ipAddress,
  userAgent,
  metadata,
}: AuditLogInput) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        metadata: (metadata ?? undefined) as any,
      },
    });
  } catch (error) {
    console.error('[audit] Failed to write audit log:', error);
  }
};
