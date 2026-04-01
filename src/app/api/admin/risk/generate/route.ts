import { requireAdminSession } from '@/lib/admin';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { getClientIp, getUserAgent, writeAuditLog } from '@/lib/audit';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';
import { openai } from '../../../../../../config/ai';
import { z } from 'zod';

const ONE_HOUR_MS = 60 * 60 * 1000;
const MRR_THRESHOLD_CENTS = 20_000;
const generateRiskPayloadSchema = z.looseObject({});

type GrowthRecommendations = {
  seoOptimization: string[];
  marketing: string[];
  salesStrategies: string[];
};

const monthKey = (date: Date) => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const getMonthStartUtc = (offsetMonths = 0) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1, 0, 0, 0, 0));
};

const parseStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseRiskResponse = (raw: string) => {
  const cleaned = raw
    .replaceAll(/```json\s*/gi, '')
    .replaceAll(/```\s*/g, '')
    .trim();
  const parsed = JSON.parse(cleaned) as {
    riskScore?: number;
    risks?: Array<{ title?: string; severity?: string; detail?: string }>;
    suggestions?: string[];
    growthRecommendations?: {
      seoOptimization?: unknown;
      marketing?: unknown;
      salesStrategies?: unknown;
    };
  };

  const riskScore = Math.max(0, Math.min(100, Number(parsed.riskScore ?? 50) || 50));
  const risks = Array.isArray(parsed.risks)
    ? parsed.risks.map((risk) => ({
        title: typeof risk.title === 'string' ? risk.title : 'Unspecified risk',
        severity: typeof risk.severity === 'string' ? risk.severity.toUpperCase() : 'MEDIUM',
        detail: typeof risk.detail === 'string' ? risk.detail : '',
      }))
    : [];

  const growthRecommendations: GrowthRecommendations = {
    seoOptimization: parseStringArray(parsed.growthRecommendations?.seoOptimization),
    marketing: parseStringArray(parsed.growthRecommendations?.marketing),
    salesStrategies: parseStringArray(parsed.growthRecommendations?.salesStrategies),
  };

  const suggestions = parseStringArray(parsed.suggestions);
  const fallbackSuggestions = [
    ...growthRecommendations.seoOptimization,
    ...growthRecommendations.marketing,
    ...growthRecommendations.salesStrategies,
  ].slice(0, 8);

  return {
    riskScore,
    risks,
    suggestions: suggestions.length > 0 ? suggestions : fallbackSuggestions,
    growthRecommendations,
  };
};

const postHandler = async (request: Request) => {
  const csrfErrorResponse = enforceCsrfProtection(request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  try {
    const session = await requireAdminSession();
    const parsedPayload = generateRiskPayloadSchema.safeParse(
      await request.json().catch(() => ({}))
    );

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: 'Invalid request payload.', issues: parsedPayload.error.issues },
        { status: 400 }
      );
    }

    const latest = await prisma.riskSnapshot.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    });

    if (latest && Date.now() - latest.createdAt.getTime() < ONE_HOUR_MS) {
      return NextResponse.json(
        { error: 'Risk report cooldown active. You can regenerate once every hour.' },
        { status: 429 }
      );
    }

    const [
      totalUsers,
      planDistribution,
      mrr,
      failedPayments,
      blockedUsers,
      consultationSeries,
      failedLogins24h,
      totalAudit24h,
      recentWebhookErrors,
      canceledSubscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['planTier'],
        _count: {
          _all: true,
        },
      }),
      prisma.payment.aggregate({
        where: {
          createdAt: {
            gte: getMonthStartUtc(0),
          },
          amount: {
            gt: 0,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.payment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          status: {
            contains: 'FAILED',
            mode: 'insensitive',
          },
        },
      }),
      prisma.user.count({
        where: {
          status: 'BLOCKED',
        },
      }),
      prisma.consultation.findMany({
        where: {
          createdAt: {
            gte: getMonthStartUtc(-5),
          },
        },
        select: {
          createdAt: true,
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          action: {
            contains: 'auth.signin.failed',
            mode: 'insensitive',
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          action: {
            contains: 'webhook',
            mode: 'insensitive',
          },
          OR: [
            {
              action: {
                contains: 'error',
                mode: 'insensitive',
              },
            },
            {
              action: {
                contains: 'failed',
                mode: 'insensitive',
              },
            },
          ],
        },
      }),
      prisma.subscription.count({
        where: {
          status: 'CANCELED',
        },
      }),
    ]);

    const distribution = {
      FREE: planDistribution.find((row) => row.planTier === 'FREE')?._count._all ?? 0,
      BASIC: planDistribution.find((row) => row.planTier === 'BASIC')?._count._all ?? 0,
      PRO: planDistribution.find((row) => row.planTier === 'PRO')?._count._all ?? 0,
    };

    const trendBuckets = new Map<string, number>();
    for (let i = 5; i >= 0; i -= 1) {
      trendBuckets.set(monthKey(getMonthStartUtc(-i)), 0);
    }
    for (const row of consultationSeries) {
      const key = monthKey(row.createdAt);
      trendBuckets.set(key, (trendBuckets.get(key) ?? 0) + 1);
    }

    const churnRate = totalUsers > 0 ? (canceledSubscriptions / totalUsers) * 100 : 0;
    const errorRate = totalAudit24h > 0 ? (recentWebhookErrors / totalAudit24h) * 100 : 0;

    const baseSnapshot = {
      totalUsers,
      planDistribution: distribution,
      mrrCents: mrr._sum.amount ?? 0,
      mrrThresholdCents: MRR_THRESHOLD_CENTS,
      mrrThresholdMet: (mrr._sum.amount ?? 0) >= MRR_THRESHOLD_CENTS,
      churnRate,
      failedPaymentCount30d: failedPayments,
      blockedUsers,
      errorRate24h: errorRate,
      failedLogins24h,
      consultationVolumeTrend: [...trendBuckets.entries()].map(([month, count]) => ({
        month,
        count,
      })),
      anomalies: {
        failedLoginSpike: failedLogins24h > 10,
        webhookErrorCount24h: recentWebhookErrors,
      },
    };

    const aiResponse = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            'You are a SaaS risk assessor and growth strategist. Return strict JSON with keys riskScore (0-100), risks (array of {title,severity,detail}), suggestions (array of strings), growthRecommendations ({seoOptimization: string[], marketing: string[], salesStrategies: string[]}). Focus growthRecommendations on actionable ideas to increase traffic, activation, and paid conversions. Severity must be one of LOW, MEDIUM, HIGH, CRITICAL.',
        },
        {
          role: 'user',
          content: `Analyze this SaaS health snapshot and return a prioritized risk report:\n${JSON.stringify(baseSnapshot, null, 2)}`,
        },
      ],
    });

    const rawContent = aiResponse.choices?.[0]?.message?.content ?? '{}';
    const parsed = parseRiskResponse(rawContent);
    const snapshot = {
      ...baseSnapshot,
      growthRecommendations: parsed.growthRecommendations,
    };

    const saved = await prisma.riskSnapshot.create({
      data: {
        generatedById: session.user.id,
        riskScore: parsed.riskScore,
        risks: parsed.risks as any,
        suggestions: parsed.suggestions as any,
        snapshot: snapshot as any,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: 'admin.risk_report.generated',
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        riskSnapshotId: saved.id,
        riskScore: parsed.riskScore,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        id: saved.id,
        riskScore: parsed.riskScore,
        risks: parsed.risks,
        suggestions: parsed.suggestions,
        growthRecommendations: parsed.growthRecommendations,
        snapshot,
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Risk report generation failed.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
