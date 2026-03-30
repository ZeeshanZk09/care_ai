import {
  accountBlockedTemplate,
  accountRestrictedTemplate,
  premiumActivatedTemplate,
} from '@/lib/email-templates';
import { sendEmail } from '@/lib/mail';
import { getClientIp, getUserAgent } from '@/lib/audit';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { logAdminAction, requireAdminSession } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';
import { z } from 'zod';

type ActionType = 'RESTRICT' | 'UNBLOCK' | 'BLOCK' | 'REVOKE_SESSIONS' | 'ACTIVATE_PREMIUM_MODELS';

const actionPayloadSchema = z.object({
  action: z.enum(['RESTRICT', 'UNBLOCK', 'BLOCK', 'REVOKE_SESSIONS', 'ACTIVATE_PREMIUM_MODELS']),
  reason: z.string().trim().max(500).optional(),
  expiresAt: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) {
        return true;
      }

      return !Number.isNaN(new Date(value).getTime());
    }, 'Invalid expiry date format.'),
});

const assertNotLastAdmin = async (targetUserId: string) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      role: true,
      status: true,
    },
  });

  if (targetUser?.role !== 'ADMIN') {
    return;
  }

  if (targetUser.status === 'BLOCKED') {
    return;
  }

  const activeAdmins = await prisma.user.count({
    where: {
      role: 'ADMIN',
      status: {
        not: 'BLOCKED',
      },
    },
  });

  if (activeAdmins <= 1) {
    throw new Error('Cannot block or restrict the final active admin account.');
  }
};

const postHandler = async (
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const csrfErrorResponse = enforceCsrfProtection(request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  try {
    const session = await requireAdminSession();
    const { userId } = await params;
    const parsedPayload = actionPayloadSchema.safeParse(await request.json());

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: 'Invalid action payload.', issues: parsedPayload.error.issues },
        { status: 400 }
      );
    }

    const payload = parsedPayload.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    const ipAddress = getClientIp(request.headers);
    const userAgent = getUserAgent(request.headers);

    if (payload.action === 'RESTRICT') {
      await assertNotLastAdmin(targetUser.id);

      const restrictionReason = payload.reason || 'Policy enforcement action';
      const restrictionExpiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          status: 'RESTRICTED',
          restrictionReason,
          restrictionEndsAt: restrictionExpiresAt,
        },
      });

      await prisma.session.deleteMany({
        where: { userId: targetUser.id },
      });

      const emailTemplate = accountRestrictedTemplate(
        targetUser.name,
        restrictionReason,
        restrictionExpiresAt?.toISOString() ?? null
      );
      await sendEmail(targetUser.email, emailTemplate.subject, emailTemplate.html, {
        userId: targetUser.id,
        templateName: 'account_restricted',
      });

      await logAdminAction({
        adminUserId: session.user.id,
        targetUserId: targetUser.id,
        actionType: payload.action,
        reason: restrictionReason,
        ipAddress,
        userAgent,
        metadata: {
          restrictionExpiresAt: restrictionExpiresAt?.toISOString() ?? null,
        },
      });
    }

    if (payload.action === 'UNBLOCK') {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          status: 'ACTIVE',
          restrictionReason: null,
          restrictionEndsAt: null,
        },
      });

      await logAdminAction({
        adminUserId: session.user.id,
        targetUserId: targetUser.id,
        actionType: payload.action,
        reason: payload.reason ?? null,
        ipAddress,
        userAgent,
      });
    }

    if (payload.action === 'BLOCK') {
      await assertNotLastAdmin(targetUser.id);
      const blockReason = payload.reason || 'Permanent account block by administrator';

      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          status: 'BLOCKED',
          restrictionReason: blockReason,
          restrictionEndsAt: null,
        },
      });

      await prisma.session.deleteMany({
        where: { userId: targetUser.id },
      });

      const emailTemplate = accountBlockedTemplate(targetUser.name, blockReason);
      await sendEmail(targetUser.email, emailTemplate.subject, emailTemplate.html, {
        userId: targetUser.id,
        templateName: 'account_blocked',
      });

      await logAdminAction({
        adminUserId: session.user.id,
        targetUserId: targetUser.id,
        actionType: payload.action,
        reason: blockReason,
        ipAddress,
        userAgent,
      });
    }

    if (payload.action === 'REVOKE_SESSIONS') {
      const deleted = await prisma.session.deleteMany({
        where: { userId: targetUser.id },
      });

      await logAdminAction({
        adminUserId: session.user.id,
        targetUserId: targetUser.id,
        actionType: payload.action,
        reason: payload.reason ?? null,
        ipAddress,
        userAgent,
        metadata: {
          revokedSessions: deleted.count,
        },
      });
    }

    if (payload.action === 'ACTIVATE_PREMIUM_MODELS') {
      const activationDate = new Date();
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          premiumAccessGrantedAt: activationDate,
        },
      });

      const emailTemplate = premiumActivatedTemplate(targetUser.name);
      await sendEmail(targetUser.email, emailTemplate.subject, emailTemplate.html, {
        userId: targetUser.id,
        templateName: 'premium_activated',
      });

      await logAdminAction({
        adminUserId: session.user.id,
        targetUserId: targetUser.id,
        actionType: payload.action,
        reason: payload.reason ?? null,
        ipAddress,
        userAgent,
        metadata: {
          activatedAt: activationDate.toISOString(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin action failed.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};

export const POST = withApiRequestAudit(async (request, context) =>
  postHandler(request, context as { params: Promise<{ userId: string }> })
);
