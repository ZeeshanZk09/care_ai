import { notifyGrowthAlert } from "@/lib/alerts";
import { withApiRequestAudit } from "@/lib/api/request-audit";
import { writeAuditLog } from "@/lib/audit";
import { requireCronEnv } from "@/env";
import {
  abandonedConsultationReminderTemplate,
  disengagementSurveyTemplate,
  freeToPaidCampaignTemplate,
  freeUserOnboardingTemplate,
} from "@/lib/email-templates";
import { sendEmail } from "@/lib/mail";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const AGENT_ID = "GPT-5.3-Codex";
const ABANDONED_SESSION_MINUTES = 90;
const MAX_WEEKLY_CAMPAIGN_EMAILS = 100;
const MAX_ONBOARDING_EMAILS = 60;
const MAX_RETARGET_EMAILS = 40;
const MAX_SURVEY_EMAILS = 40;

const WEEKLY_TOPIC_POOL = [
  "Seasonal allergy symptom check-ins",
  "Heat and hydration early warning habits",
  "Monsoon flu and respiratory caution",
  "Healthy sleep and stress screening routines",
  "Family preventive care planning",
  "Heart-health symptom literacy for adults",
];

const SURVEY_QUESTIONS = [
  "What was the main reason you did not start a consultation this month?",
  "Did anything in the app make consultations harder to begin or complete?",
  "How satisfied were you with consultation quality last month (1-5)?",
  "What single feature would most increase your likelihood to return?",
  "Would a limited-time Pro discount motivate you to resume consultations?",
];

const ONBOARDING_DAYS = [1, 3, 7] as const;

type OnboardingDay = (typeof ONBOARDING_DAYS)[number];
type DispatchMode = "DRY_RUN" | "CONFIRMED_SEND";

type DispatchResult = {
  attempted: number;
  sent: number;
  failed: number;
  mode: DispatchMode;
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

const getAppBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
};

const getCurrentMonthStartUtc = (date = new Date()) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
};

const getPreviousMonthStartUtc = (date = new Date()) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1, 0, 0, 0, 0),
  );
};

const getWeekStartUtc = (date = new Date()) => {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diffToMonday);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
};

const getIsoWeek = (date = new Date()) => {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
};

const getWeeklyTopic = (date = new Date()) => {
  const weekNumber = getIsoWeek(date);
  return (
    WEEKLY_TOPIC_POOL[(weekNumber - 1) % WEEKLY_TOPIC_POOL.length] ??
    WEEKLY_TOPIC_POOL[0]
  );
};

const getOfferExpiryDateLabel = (date = new Date()) => {
  const expiry = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    expiry,
  );
};

const getDaysSince = (from: Date, to = new Date()) => {
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
};

const normalizeName = (name: string | null | undefined) => {
  if (!name?.trim()) {
    return null;
  }

  return name.trim();
};

const parseDispatchMode = (request: Request): DispatchMode => {
  const searchParams = new URL(request.url).searchParams;
  const confirmSendRaw = searchParams.get("confirmSend")?.toLowerCase();
  const confirmSend =
    confirmSendRaw === "true" ||
    confirmSendRaw === "1" ||
    confirmSendRaw === "yes";
  return confirmSend ? "CONFIRMED_SEND" : "DRY_RUN";
};

const dispatchEmail = async (
  mode: DispatchMode,
  to: string,
  subject: string,
  html: string,
  templateName: string,
  metadata: Record<string, unknown>,
) => {
  if (mode === "DRY_RUN") {
    return {
      sent: false,
      failed: false,
      errorMessage: null,
    };
  }

  try {
    await sendEmail(to, subject, html, {
      templateName,
      metadata,
    });

    return {
      sent: true,
      failed: false,
      errorMessage: null,
    };
  } catch (error) {
    return {
      sent: false,
      failed: true,
      errorMessage:
        error instanceof Error ? error.message : "Unknown dispatch error",
    };
  }
};

const sendWeeklyCampaign = async (mode: DispatchMode, occurredAt: string) => {
  const weekStart = getWeekStartUtc();
  const alreadySentThisWeek =
    mode === "CONFIRMED_SEND"
      ? await prisma.auditLog.count({
          where: {
            action: "growth.campaign.weekly.sent",
            createdAt: {
              gte: weekStart,
            },
          },
        })
      : 0;

  const freeUsers = await prisma.user.findMany({
    where: {
      planTier: "FREE",
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: MAX_WEEKLY_CAMPAIGN_EMAILS,
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const topic = getWeeklyTopic();
  const offerEndsOn = getOfferExpiryDateLabel();
  const upgradeUrl = `${getAppBaseUrl()}/pricing`;

  let attempted = 0;
  let sent = 0;
  let failed = 0;

  if (alreadySentThisWeek === 0) {
    for (const user of freeUsers) {
      attempted += 1;
      const template = freeToPaidCampaignTemplate(
        normalizeName(user.name),
        topic,
        offerEndsOn,
        upgradeUrl,
      );
      const dispatchResult = await dispatchEmail(
        mode,
        user.email,
        template.subject,
        template.html,
        "growth_weekly_campaign",
        {
          userId: user.id,
          topic,
          offerEndsOn,
          occurredAt,
          agentId: AGENT_ID,
        },
      );

      if (dispatchResult.sent) {
        sent += 1;
      }

      if (dispatchResult.failed) {
        failed += 1;
      }
    }
  }

  let action = "growth.campaign.weekly.dry_run";
  if (mode === "CONFIRMED_SEND") {
    action =
      alreadySentThisWeek === 0
        ? "growth.campaign.weekly.sent"
        : "growth.campaign.weekly.skipped";
  }

  await writeAuditLog({
    action,
    metadata: {
      weekStart: weekStart.toISOString(),
      topic,
      offerEndsOn,
      recipientsConsidered: freeUsers.length,
      alreadySentThisWeek,
      attempted,
      sent,
      failed,
      occurredAt,
      agentId: AGENT_ID,
    },
  });

  return {
    topic,
    recipientsConsidered: freeUsers.length,
    alreadySentThisWeek,
    attempted,
    sent,
    failed,
  };
};

const sendOnboardingLifecycle = async (
  mode: DispatchMode,
  occurredAt: string,
): Promise<DispatchResult> => {
  const users = await prisma.user.findMany({
    where: {
      planTier: "FREE",
      status: "ACTIVE",
      createdAt: {
        gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    take: MAX_ONBOARDING_EMAILS,
  });

  let attempted = 0;
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const day = getDaysSince(user.createdAt);
    if (!ONBOARDING_DAYS.includes(day as OnboardingDay)) {
      continue;
    }

    const onboardingDay = day as OnboardingDay;

    const alreadySent = await prisma.auditLog.count({
      where: {
        userId: user.id,
        action: `growth.onboarding.day_${onboardingDay}.sent`,
      },
    });

    if (alreadySent > 0) {
      continue;
    }

    attempted += 1;
    const template = freeUserOnboardingTemplate(
      normalizeName(user.name),
      onboardingDay,
      `${getAppBaseUrl()}/dashboard`,
    );

    const dispatchResult = await dispatchEmail(
      mode,
      user.email,
      template.subject,
      template.html,
      "growth_onboarding_lifecycle",
      {
        userId: user.id,
        onboardingDay,
        occurredAt,
        agentId: AGENT_ID,
      },
    );

    if (dispatchResult.sent) {
      sent += 1;
      await writeAuditLog({
        userId: user.id,
        action: `growth.onboarding.day_${onboardingDay}.sent`,
        metadata: {
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    } else if (dispatchResult.failed) {
      failed += 1;
      await writeAuditLog({
        userId: user.id,
        action: `growth.onboarding.day_${onboardingDay}.failed`,
        metadata: {
          occurredAt,
          error: dispatchResult.errorMessage,
          agentId: AGENT_ID,
        },
      });
    }
  }

  if (mode === "DRY_RUN") {
    await writeAuditLog({
      action: "growth.onboarding.lifecycle.dry_run",
      metadata: {
        attempted,
        sent,
        failed,
        occurredAt,
        agentId: AGENT_ID,
      },
    });
  }

  return {
    attempted,
    sent,
    failed,
    mode,
  };
};

const sendAbandonedConsultationReminders = async (
  mode: DispatchMode,
  occurredAt: string,
): Promise<DispatchResult> => {
  const staleThreshold = new Date(
    Date.now() - ABANDONED_SESSION_MINUTES * 60 * 1000,
  );

  const staleSessions = await prisma.chatSession.findMany({
    where: {
      createdAt: {
        lte: staleThreshold,
      },
      report: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: MAX_RETARGET_EMAILS * 2,
    select: {
      sessionId: true,
      userId: true,
      createdAt: true,
      createdBy: {
        select: {
          name: true,
          email: true,
          status: true,
        },
      },
    },
  });

  const latestSessionByUser = new Map<string, (typeof staleSessions)[number]>();
  for (const session of staleSessions) {
    if (!latestSessionByUser.has(session.userId)) {
      latestSessionByUser.set(session.userId, session);
    }
  }

  const candidates = [...latestSessionByUser.values()].filter(
    (session) => session.createdBy.status === "ACTIVE",
  );

  const recentlyReminded = await prisma.auditLog.findMany({
    where: {
      action: "growth.retarget.abandoned_consultation.sent",
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      userId: {
        in: candidates.map((candidate) => candidate.userId),
      },
    },
    select: {
      userId: true,
    },
  });

  const remindedUserIds = new Set(
    recentlyReminded.map((row) => row.userId).filter(Boolean),
  );

  const targeted = candidates
    .filter((candidate) => !remindedUserIds.has(candidate.userId))
    .slice(0, MAX_RETARGET_EMAILS);

  let attempted = 0;
  let sent = 0;
  let failed = 0;

  for (const session of targeted) {
    attempted += 1;
    const template = abandonedConsultationReminderTemplate(
      normalizeName(session.createdBy.name),
      `${getAppBaseUrl()}/dashboard/medical-agent/${session.sessionId}`,
    );

    const dispatchResult = await dispatchEmail(
      mode,
      session.createdBy.email,
      template.subject,
      template.html,
      "growth_abandoned_consultation_reminder",
      {
        userId: session.userId,
        sessionId: session.sessionId,
        occurredAt,
        agentId: AGENT_ID,
      },
    );

    if (dispatchResult.sent) {
      sent += 1;
      await writeAuditLog({
        userId: session.userId,
        action: "growth.retarget.abandoned_consultation.sent",
        metadata: {
          sessionId: session.sessionId,
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    } else if (dispatchResult.failed) {
      failed += 1;
      await writeAuditLog({
        userId: session.userId,
        action: "growth.retarget.abandoned_consultation.failed",
        metadata: {
          sessionId: session.sessionId,
          occurredAt,
          error: dispatchResult.errorMessage,
          agentId: AGENT_ID,
        },
      });
    }
  }

  if (mode === "DRY_RUN") {
    await writeAuditLog({
      action: "growth.retarget.abandoned_consultation.dry_run",
      metadata: {
        targetedUsers: targeted.length,
        attempted,
        sent,
        failed,
        occurredAt,
        agentId: AGENT_ID,
      },
    });
  }

  return {
    attempted,
    sent,
    failed,
    mode,
  };
};

const sendDisengagementSurvey = async (
  mode: DispatchMode,
  occurredAt: string,
): Promise<DispatchResult> => {
  const currentMonthStart = getCurrentMonthStartUtc();
  const previousMonthStart = getPreviousMonthStartUtc();

  const [consultedPreviousMonth, consultedCurrentMonth] = await Promise.all([
    prisma.consultation.groupBy({
      by: ["userId"],
      where: {
        status: "SUCCESS",
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.consultation.groupBy({
      by: ["userId"],
      where: {
        status: "SUCCESS",
        createdAt: {
          gte: currentMonthStart,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const currentMonthUserIds = new Set(
    consultedCurrentMonth.map((row) => row.userId),
  );
  const surveyCandidateIds = consultedPreviousMonth
    .map((row) => row.userId)
    .filter((userId) => !currentMonthUserIds.has(userId))
    .slice(0, MAX_SURVEY_EMAILS);

  if (surveyCandidateIds.length === 0) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      mode,
    };
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: surveyCandidateIds,
      },
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    take: MAX_SURVEY_EMAILS,
  });

  let attempted = 0;
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const alreadySent = await prisma.auditLog.count({
      where: {
        userId: user.id,
        action: "growth.survey.disengagement.sent",
        createdAt: {
          gte: currentMonthStart,
        },
      },
    });

    if (alreadySent > 0) {
      continue;
    }

    attempted += 1;
    const template = disengagementSurveyTemplate(
      normalizeName(user.name),
      SURVEY_QUESTIONS,
      `${getAppBaseUrl()}/dashboard`,
    );

    const dispatchResult = await dispatchEmail(
      mode,
      user.email,
      template.subject,
      template.html,
      "growth_disengagement_survey",
      {
        userId: user.id,
        occurredAt,
        agentId: AGENT_ID,
      },
    );

    if (dispatchResult.sent) {
      sent += 1;
      await writeAuditLog({
        userId: user.id,
        action: "growth.survey.disengagement.sent",
        metadata: {
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    } else if (dispatchResult.failed) {
      failed += 1;
      await writeAuditLog({
        userId: user.id,
        action: "growth.survey.disengagement.failed",
        metadata: {
          occurredAt,
          error: dispatchResult.errorMessage,
          agentId: AGENT_ID,
        },
      });
    }
  }

  if (mode === "DRY_RUN") {
    await writeAuditLog({
      action: "growth.survey.disengagement.dry_run",
      metadata: {
        candidateUsers: users.length,
        attempted,
        sent,
        failed,
        occurredAt,
        agentId: AGENT_ID,
      },
    });
  }

  return {
    attempted,
    sent,
    failed,
    mode,
  };
};

const postHandler = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  const mode = parseDispatchMode(request);
  const occurredAt = new Date().toISOString();

  try {
    const [weeklyCampaign, onboarding, retargeting, disengagementSurvey] =
      await Promise.all([
        sendWeeklyCampaign(mode, occurredAt),
        sendOnboardingLifecycle(mode, occurredAt),
        sendAbandonedConsultationReminders(mode, occurredAt),
        sendDisengagementSurvey(mode, occurredAt),
      ]);

    const summary = {
      mode,
      occurredAt,
      weeklyCampaign,
      onboarding,
      retargeting,
      disengagementSurvey,
      agentId: AGENT_ID,
    };

    await writeAuditLog({
      action:
        mode === "CONFIRMED_SEND"
          ? "growth.automation.run.confirmed"
          : "growth.automation.run.dry_run",
      metadata: summary,
    });

    if (mode === "DRY_RUN") {
      await notifyGrowthAlert({
        subject: "CareAI growth automation dry run completed",
        summary:
          "Growth automation generated campaign, onboarding, retargeting, and disengagement survey batches in dry-run mode.",
        metadata: {
          ...summary,
          message:
            "No emails were sent. Re-run with confirmSend=true after human approval.",
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    await writeAuditLog({
      action: "growth.automation.run.failed",
      metadata: {
        mode,
        occurredAt,
        agentId: AGENT_ID,
        error:
          error instanceof Error
            ? error.message
            : "Unknown growth automation failure",
      },
    });

    return NextResponse.json(
      { error: "Failed to run growth automation." },
      { status: 500 },
    );
  }
};

export const POST = withApiRequestAudit(async (request) =>
  postHandler(request),
);
