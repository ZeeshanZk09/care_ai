import { auth } from '@/auth';
import { writeAuditLog } from '@/lib/audit';
import prisma from '@/lib/prisma';

type LogAdminActionInput = {
  adminUserId: string;
  targetUserId: string;
  actionType: string;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export const requireAdminSession = async () => {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return session;
};

export const logAdminAction = async ({
  adminUserId,
  targetUserId,
  actionType,
  reason,
  ipAddress,
  userAgent,
  metadata,
}: LogAdminActionInput) => {
  const auditMetadata: Record<string, unknown> = {
    targetUserId,
    reason: reason ?? null,
  };

  if (metadata) {
    Object.assign(auditMetadata, metadata);
  }

  await prisma.adminAction.create({
    data: {
      adminUserId,
      targetUserId,
      actionType,
      reason: reason ?? null,
      ipAddress: ipAddress ?? null,
      metadata: (metadata ?? undefined) as any,
    },
  });

  await writeAuditLog({
    userId: adminUserId,
    action: `admin.${actionType.toLowerCase()}`,
    ipAddress,
    userAgent,
    metadata: auditMetadata,
  });
};
