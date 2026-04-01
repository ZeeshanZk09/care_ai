import {
  notifyGrowthAlert,
  notifyRevenueAlert,
  notifySecurityAlert,
} from "@/lib/alerts";
import { withApiRequestAudit } from "@/lib/api/request-audit";
import { writeAuditLog } from "@/lib/audit";
import { requireCronEnv } from "@/env";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const MRR_THRESHOLD_CENTS = 20_000;
const MRR_ZERO_ESCALATION_HOURS = 72;
const FAILED_LOGIN_SPIKE_THRESHOLD = 10;
const FAILED_LOGIN_CRITICAL_THRESHOLD = 20;
const FAILED_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const FAILED_LOGIN_RETENTION_DAYS = 30;
const WEEKLY_CONSULTATION_MIN_THRESHOLD = 5;
const WEEKLY_CONSULTATION_DROP_RATIO = 0.5;
const ACTIVE_BILLING_STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE"] as const;
const AGENT_ID = "GPT-5.3-Codex";

const getCurrentMonthStartUtc = (date = new Date()) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
};

const getWeekStartUtc = (date = new Date(), weeksAgo = 0) => {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diffToMonday - weeksAgo * 7);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
};

const isAuthorizedCronRequest = (request: Request) => {
  const configuredSecret = requireCronEnv().CRON_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  return bearerToken === configuredSecret;
};

const postHandler = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  const now = new Date();
  const monthStart = getCurrentMonthStartUtc(now);
  const weekStart = getWeekStartUtc(now);
  const previousWeekStart = getWeekStartUtc(now, 1);
  const occurredAt = now.toISOString();

  try {
    const [
      mrrAggregate,
      failedLoginBursts,
      consultationCurrentWeek,
      consultationPreviousWeek,
      paidUsers,
      activeBillingUsers,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
          },
          amount: {
            gt: 0,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.auditLog.groupBy({
        by: ["ipAddress"],
        where: {
          action: "auth.signin.failed",
          createdAt: {
            gte: new Date(Date.now() - FAILED_LOGIN_WINDOW_MS),
          },
          ipAddress: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.consultation.count({
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: weekStart,
          },
        },
      }),
      prisma.consultation.count({
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: previousWeekStart,
            lt: weekStart,
          },
        },
      }),
      prisma.user.findMany({
        where: {
          planTier: {
            in: ["BASIC", "PRO"],
          },
        },
        select: {
          id: true,
          email: true,
          planTier: true,
        },
      }),
      prisma.subscription.findMany({
        where: {
          status: {
            in: [...ACTIVE_BILLING_STATUSES],
          },
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      }),
    ]);

    const mrrCents = mrrAggregate._sum.amount ?? 0;
    const mrrThresholdMet = mrrCents >= MRR_THRESHOLD_CENTS;

    await writeAuditLog({
      action: "system.mrr.metric.daily_checked",
      metadata: {
        mrrCents,
        mrrThresholdCents: MRR_THRESHOLD_CENTS,
        mrrThresholdMet,
        occurredAt,
        agentId: AGENT_ID,
      },
    });

    let mrrEscalationRequired = false;
    if (mrrCents === 0) {
      await writeAuditLog({
        action: "system.alert.mrr_zero.triggered",
        metadata: {
          mrrCents,
          mrrThresholdCents: MRR_THRESHOLD_CENTS,
          occurredAt,
          agentId: AGENT_ID,
        },
      });

      await notifyRevenueAlert({
        subject: "CareAI alert: MRR remains $0",
        summary:
          "Daily MRR check found $0 monthly recurring revenue. Immediate revenue recovery action required.",
        metadata: {
          mrrCents,
          mrrThresholdCents: MRR_THRESHOLD_CENTS,
          occurredAt,
          agentId: AGENT_ID,
        },
      });

      const mrrAlertsInWindow = await prisma.auditLog.count({
        where: {
          action: "system.alert.mrr_zero.triggered",
          createdAt: {
            gte: new Date(
              Date.now() - MRR_ZERO_ESCALATION_HOURS * 60 * 60 * 1000,
            ),
          },
        },
      });

      if (mrrAlertsInWindow >= 3) {
        mrrEscalationRequired = true;

        await writeAuditLog({
          action: "revenue.escalation.required",
          metadata: {
            reason: "MRR_NOT_RECOVERED_72H",
            mrrAlertsInWindow,
            occurredAt,
            agentId: AGENT_ID,
          },
        });

        await notifyRevenueAlert({
          subject: "CareAI escalation required: MRR not recovered in 72 hours",
          summary:
            "MRR has remained at $0 for at least 72 hours. Human operator escalation is required.",
          metadata: {
            mrrAlertsInWindow,
            mrrCents,
            occurredAt,
            agentId: AGENT_ID,
          },
        });
      }
    }

    const activeBillingUserIds = new Set(
      activeBillingUsers.map((row) => row.userId),
    );
    const paidUsersWithoutBilling = paidUsers.filter(
      (user) => !activeBillingUserIds.has(user.id),
    );

    if (paidUsersWithoutBilling.length > 0) {
      await writeAuditLog({
        action: "revenue.billing_integrity.issue_detected",
        metadata: {
          count: paidUsersWithoutBilling.length,
          affectedUserIds: paidUsersWithoutBilling
            .slice(0, 10)
            .map((user) => user.id),
          occurredAt,
          agentId: AGENT_ID,
        },
      });

      await notifyRevenueAlert({
        subject: "CareAI alert: paid-tier users missing active billing records",
        summary:
          "At least one BASIC or PRO account does not have an active billing subscription record. Human billing audit is required.",
        metadata: {
          count: paidUsersWithoutBilling.length,
          affectedUserIds: paidUsersWithoutBilling
            .slice(0, 10)
            .map((user) => user.id),
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    }

    const failedLoginSpikes = failedLoginBursts.reduce<
      { ipAddress: string; failedAttempts: number }[]
    >((acc, row) => {
      if (row.ipAddress && row._count._all > FAILED_LOGIN_SPIKE_THRESHOLD) {
        acc.push({
          ipAddress: row.ipAddress,
          failedAttempts: row._count._all,
        });
      }

      return acc;
    }, []);

    const criticalFailedLoginSpikes = failedLoginSpikes.filter(
      (row) => row.failedAttempts > FAILED_LOGIN_CRITICAL_THRESHOLD,
    );

    if (failedLoginSpikes.length > 0) {
      await writeAuditLog({
        action: "security.escalation.required",
        metadata: {
          reason: "FAILED_LOGIN_SPIKE",
          failedLoginSpikes,
          windowSeconds: Math.floor(FAILED_LOGIN_WINDOW_MS / 1000),
          threshold: FAILED_LOGIN_SPIKE_THRESHOLD,
          occurredAt,
          agentId: AGENT_ID,
        },
      });

      await notifySecurityAlert({
        subject: "CareAI escalation required: failed login spike detected",
        summary: "At least one IP exceeded 10 failed logins within 10 minutes.",
        metadata: {
          failedLoginSpikes,
          windowSeconds: Math.floor(FAILED_LOGIN_WINDOW_MS / 1000),
          threshold: FAILED_LOGIN_SPIKE_THRESHOLD,
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    }

    if (criticalFailedLoginSpikes.length > 0) {
      await writeAuditLog({
        action: "security.escalation.critical",
        metadata: {
          reason: "FAILED_LOGIN_SPIKE_CRITICAL",
          failedLoginSpikes: criticalFailedLoginSpikes,
          windowSeconds: Math.floor(FAILED_LOGIN_WINDOW_MS / 1000),
          threshold: FAILED_LOGIN_CRITICAL_THRESHOLD,
          occurredAt,
          agentId: AGENT_ID,
        },
      });

      await notifySecurityAlert({
        subject:
          "CareAI critical escalation: failed logins exceeded 20 in 10 minutes",
        summary:
          "Critical failed login threshold exceeded. Immediate human incident response is required.",
        metadata: {
          failedLoginSpikes: criticalFailedLoginSpikes,
          windowSeconds: Math.floor(FAILED_LOGIN_WINDOW_MS / 1000),
          threshold: FAILED_LOGIN_CRITICAL_THRESHOLD,
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    }

    let consultationDropRatio = 0;
    if (consultationPreviousWeek > 0) {
      consultationDropRatio =
        consultationCurrentWeek / consultationPreviousWeek;
    } else if (consultationCurrentWeek > 0) {
      consultationDropRatio = 1;
    }

    const consultationVolumeAlertTriggered =
      consultationCurrentWeek < WEEKLY_CONSULTATION_MIN_THRESHOLD ||
      (consultationPreviousWeek > 0 &&
        consultationDropRatio < WEEKLY_CONSULTATION_DROP_RATIO);

    if (consultationVolumeAlertTriggered) {
      await writeAuditLog({
        action: "system.alert.consultation_volume_low.triggered",
        metadata: {
          consultationCurrentWeek,
          consultationPreviousWeek,
          consultationDropRatio,
          weeklyThreshold: WEEKLY_CONSULTATION_MIN_THRESHOLD,
          dropRatioThreshold: WEEKLY_CONSULTATION_DROP_RATIO,
          weekStart: weekStart.toISOString(),
          previousWeekStart: previousWeekStart.toISOString(),
          occurredAt,
          agentId: AGENT_ID,
        },
      });

      await notifyGrowthAlert({
        subject: "CareAI alert: weekly consultation volume drop",
        summary:
          "Consultation volume is below weekly threshold or dropped sharply versus the prior week.",
        metadata: {
          consultationCurrentWeek,
          consultationPreviousWeek,
          consultationDropRatio,
          weeklyThreshold: WEEKLY_CONSULTATION_MIN_THRESHOLD,
          dropRatioThreshold: WEEKLY_CONSULTATION_DROP_RATIO,
          weekStart: weekStart.toISOString(),
          previousWeekStart: previousWeekStart.toISOString(),
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    }

    const retentionCutoff = new Date(
      Date.now() - FAILED_LOGIN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const retentionCleanup = await prisma.auditLog.deleteMany({
      where: {
        action: {
          in: [
            "auth.signin.failed",
            "auth.signin.captcha_required",
            "auth.signin.captcha_issued",
            "auth.signin.captcha_passed",
          ],
        },
        createdAt: {
          lt: retentionCutoff,
        },
      },
    });

    await writeAuditLog({
      action: "system.cron.failed_login_retention.completed",
      metadata: {
        cutoff: retentionCutoff.toISOString(),
        deletedRows: retentionCleanup.count,
        occurredAt,
        agentId: AGENT_ID,
      },
    });

    return NextResponse.json({
      success: true,
      mrr: {
        mrrCents,
        mrrThresholdCents: MRR_THRESHOLD_CENTS,
        thresholdMet: mrrThresholdMet,
        escalationRequired: mrrEscalationRequired,
      },
      security: {
        failedLoginSpikes,
        criticalFailedLoginSpikes,
      },
      billingIntegrity: {
        paidUsersWithoutBilling: paidUsersWithoutBilling.length,
        affectedUserIds: paidUsersWithoutBilling
          .slice(0, 10)
          .map((user) => user.id),
      },
      consultationMonitoring: {
        consultationCurrentWeek,
        consultationPreviousWeek,
        consultationDropRatio,
        weeklyThreshold: WEEKLY_CONSULTATION_MIN_THRESHOLD,
        dropRatioThreshold: WEEKLY_CONSULTATION_DROP_RATIO,
        alertTriggered: consultationVolumeAlertTriggered,
      },
      retention: {
        deletedRows: retentionCleanup.count,
        cutoff: retentionCutoff.toISOString(),
      },
      occurredAt,
      agentId: AGENT_ID,
    });
  } catch (error) {
    await writeAuditLog({
      action: "system.cron.risk_monitoring.failed",
      metadata: {
        error:
          error instanceof Error
            ? error.message
            : "Unknown risk monitoring failure",
        occurredAt,
        agentId: AGENT_ID,
      },
    });

    return NextResponse.json(
      { error: "Failed to run risk monitoring cron." },
      { status: 500 },
    );
  }
};

export const POST = withApiRequestAudit(async (request) =>
  postHandler(request),
);
