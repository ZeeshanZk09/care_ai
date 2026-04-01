import { writeAuditLog } from '@/lib/audit';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import prisma from '@/lib/prisma';
import { isAuthorizedCronRequest } from '@/lib/security/cron';
import { NextResponse } from 'next/server';

const getCurrentCycleStart = (date = new Date()) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
};

const postHandler = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
  }

  try {
    const cycleStart = getCurrentCycleStart();

    const usersToReset = await prisma.user.findMany({
      where: {
        planTier: 'BASIC',
        OR: [{ consultationsResetAt: null }, { consultationsResetAt: { lt: cycleStart } }],
      },
      select: {
        id: true,
      },
    });

    for (const user of usersToReset) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          consultationsUsed: 0,
          consultationsResetAt: cycleStart,
        },
      });

      await writeAuditLog({
        userId: user.id,
        action: 'cron.basic_usage_reset',
        metadata: {
          cycleStart: cycleStart.toISOString(),
        },
      });
    }

    await writeAuditLog({
      action: 'system.cron.reset_consultations.completed',
      metadata: {
        cycleStart: cycleStart.toISOString(),
        usersReset: usersToReset.length,
      },
    });

    return NextResponse.json({
      success: true,
      usersReset: usersToReset.length,
      cycleStart: cycleStart.toISOString(),
    });
  } catch (error) {
    await writeAuditLog({
      action: 'system.cron.reset_consultations.failed',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown cron failure',
      },
    });

    console.error('[cron/reset-consultations] Failed:', error);
    return NextResponse.json({ error: 'Failed to reset consultations.' }, { status: 500 });
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
