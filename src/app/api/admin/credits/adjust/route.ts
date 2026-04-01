import { getClientIp, getUserAgent } from '@/lib/audit';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { logAdminAction, requireAdminSession } from '@/lib/admin';
import {
  adminAdjustBalance,
  getBalance,
  InsufficientCreditsError,
} from '@/lib/credits/credit-service';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const adjustCreditsPayloadSchema = z
  .object({
    targetUserId: z.string().trim().min(1).optional(),
    targetUserEmail: z.email().optional(),
    deltaCents: z
      .number()
      .int()
      .min(-100_000)
      .max(100_000)
      .refine((value) => value !== 0, 'Adjustment delta cannot be zero.'),
    note: z.string().trim().max(500).optional(),
  })
  .refine((payload) => Boolean(payload.targetUserId || payload.targetUserEmail), {
    path: ['targetUserId'],
    message: 'Provide either targetUserId or targetUserEmail.',
  });

const postHandler = async (request: Request) => {
  const csrfErrorResponse = enforceCsrfProtection(request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  try {
    const session = await requireAdminSession();
    const parsedPayload = adjustCreditsPayloadSchema.safeParse(
      await request.json().catch(() => ({}))
    );

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: 'Invalid credit adjustment payload.',
          issues: parsedPayload.error.issues,
        },
        { status: 400 }
      );
    }

    const payload = parsedPayload.data;

    let targetUser: {
      id: string;
      email: string;
      name: string | null;
    } | null = null;

    if (payload.targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: payload.targetUserId },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } else if (payload.targetUserEmail) {
      targetUser = await prisma.user.findUnique({
        where: { email: payload.targetUserEmail },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    await adminAdjustBalance(targetUser.id, payload.deltaCents, {
      adjustedByAdminUserId: session.user.id,
      adjustedByAdminEmail: session.user.email ?? null,
      note: payload.note ?? null,
      source: 'admin_manual_adjustment',
    });

    const updatedBalance = await getBalance(targetUser.id);

    await logAdminAction({
      adminUserId: session.user.id,
      targetUserId: targetUser.id,
      actionType: 'ADJUST_CREDITS',
      reason: payload.note ?? null,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        deltaCents: payload.deltaCents,
        updatedBalance,
        targetUserEmail: targetUser.email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        targetUser,
        deltaCents: payload.deltaCents,
        updatedBalance,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to adjust credits.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
