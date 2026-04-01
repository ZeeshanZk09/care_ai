import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/admin';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { getClientIp, getUserAgent, writeAuditLog } from '@/lib/audit';
import type { Prisma } from '@/lib/generated/prisma/client';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { openai } from '../../../../../../config/ai';

const ONE_HOUR_MS = 60 * 60 * 1000;
const MRR_THRESHOLD_CENTS = 20_000;
const generateRiskPayloadSchema = z.looseObject({});

type GrowthRecommendations = {
  seoOptimization: string[];
  marketing: string[];
  salesStrategies: string[];
};

type TrendPoint = {
  month: string;
  count: number;
};

type RiskDetail = {
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detail: string;
};

type ParsedRiskResult = {
  riskScore: number;
  risks: RiskDetail[];
  suggestions: string[];
  growthRecommendations: GrowthRecommendations;
};

type BaseSnapshot = {
  totalUsers: number;
  planDistribution: {
    FREE: number;
    BASIC: number;
    PRO: number;
  };
  mrrCents: number;
  mrrThresholdCents: number;
  mrrThresholdMet: boolean;
  churnRate: number;
  failedPaymentCount30d: number;
  blockedUsers: number;
  errorRate24h: number;
  failedLogins24h: number;
  consultationVolumeTrend: TrendPoint[];
  anomalies: {
    failedLoginSpike: boolean;
    webhookErrorCount24h: number;
  };
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

const toInputJsonValue = <T>(value: T): Prisma.InputJsonValue => {
  return value as unknown as Prisma.InputJsonValue;
};

const parseJsonObjectSafely = (raw: string) => {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      return null;
    }

    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
};

const buildFallbackGrowthRecommendations = (): GrowthRecommendations => {
  return {
    seoOptimization: [
      'Publish symptom-focused long-tail landing pages weekly with schema markup and clear CTAs.',
      'Improve technical SEO for pricing/features pages through Core Web Vitals and internal linking.',
      'Build FAQ topic clusters and route users from content pages into consultation entry points.',
    ],
    marketing: [
      'Launch a 7-day onboarding lifecycle for FREE users with feature education and activation nudges.',
      'Retarget users who start but do not finish consultations with personalized reminders.',
      'Run weekly campaign themes tied to seasonal healthcare topics and lead-magnet content.',
    ],
    salesStrategies: [
      'Trigger time-bound upgrade offers at 3rd, 6th, and 9th consultation milestones.',
      'Introduce a mid-tier BASIC offer for budget-sensitive users needing predictable monthly volume.',
      'Use in-app plan comparison nudges that highlight report quality and conversion savings.',
    ],
  };
};

const calculateFallbackRiskScore = (risks: RiskDetail[]) => {
  const severityWeight: Record<RiskDetail['severity'], number> = {
    LOW: 8,
    MEDIUM: 15,
    HIGH: 22,
    CRITICAL: 30,
  };

  const score = risks.reduce((total, risk) => total + severityWeight[risk.severity], 10);
  return Math.max(0, Math.min(100, score));
};

const buildFallbackRiskResult = (snapshot: BaseSnapshot): ParsedRiskResult => {
  const risks: RiskDetail[] = [];
  const totalPlanUsers =
    snapshot.planDistribution.FREE +
    snapshot.planDistribution.BASIC +
    snapshot.planDistribution.PRO;
  const freeRatio =
    totalPlanUsers > 0 ? (snapshot.planDistribution.FREE / totalPlanUsers) * 100 : 0;
  const previousMonth = snapshot.consultationVolumeTrend.at(-2)?.count ?? 0;
  const currentMonth = snapshot.consultationVolumeTrend.at(-1)?.count ?? 0;
  const growthRecommendations = buildFallbackGrowthRecommendations();

  if (snapshot.mrrCents <= 0) {
    risks.push({
      title: 'Zero Monthly Recurring Revenue',
      severity: 'CRITICAL',
      detail:
        'MRR is currently $0. Revenue recovery actions should be prioritized before scaling acquisition spend.',
    });
  }

  if (freeRatio >= 80) {
    risks.push({
      title: 'Over-reliance on Free Tier Users',
      severity: 'HIGH',
      detail:
        'A high FREE-plan concentration increases monetization risk and sensitivity to activation drop-offs.',
    });
  }

  if (previousMonth > 0 && currentMonth < previousMonth * 0.5) {
    risks.push({
      title: 'Consultation Volume Decline',
      severity: 'MEDIUM',
      detail:
        'Consultation volume has dropped materially month-over-month, indicating engagement friction or demand decay.',
    });
  }

  if (snapshot.failedLogins24h > 3) {
    risks.push({
      title: 'Elevated Failed Login Activity',
      severity: 'LOW',
      detail:
        'Failed sign-ins are above baseline; continue monitoring and enforce challenge-based controls.',
    });
  }

  const suggestions = [
    'Track MRR daily against the $200 threshold and escalate if recovery is not achieved within 72 hours.',
    'Run free-to-paid conversion campaigns tied to high-intent actions and expiry-based incentives.',
    'Analyze consultation funnel drop-offs and publish a corrective plan within 48 hours.',
    ...growthRecommendations.seoOptimization,
    ...growthRecommendations.marketing,
    ...growthRecommendations.salesStrategies,
  ].slice(0, 10);

  return {
    riskScore: calculateFallbackRiskScore(risks),
    risks,
    suggestions,
    growthRecommendations,
  };
};

const parseRiskResponse = (raw: string, snapshot: BaseSnapshot): ParsedRiskResult => {
  const cleaned = raw
    .replaceAll(/```json\s*/gi, '')
    .replaceAll(/```\s*/g, '')
    .trim();

  const parsed = parseJsonObjectSafely(cleaned) as {
    riskScore?: number;
    risks?: Array<{ title?: string; severity?: string; detail?: string }>;
    suggestions?: unknown;
    growthRecommendations?: {
      seoOptimization?: unknown;
      marketing?: unknown;
      salesStrategies?: unknown;
    };
  } | null;

  const fallback = buildFallbackRiskResult(snapshot);
  if (!parsed) {
    return fallback;
  }

  const riskScore = Math.max(0, Math.min(100, Number(parsed.riskScore ?? 50) || 50));

  const parsedRisks = Array.isArray(parsed.risks)
    ? parsed.risks.map((risk) => ({
        title: typeof risk.title === 'string' ? risk.title : 'Unspecified risk',
        severity:
          typeof risk.severity === 'string' &&
          ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(risk.severity.toUpperCase())
            ? (risk.severity.toUpperCase() as RiskDetail['severity'])
            : 'MEDIUM',
        detail: typeof risk.detail === 'string' ? risk.detail : '',
      }))
    : [];

  const parsedGrowthRecommendations: GrowthRecommendations = {
    seoOptimization: parseStringArray(parsed.growthRecommendations?.seoOptimization),
    marketing: parseStringArray(parsed.growthRecommendations?.marketing),
    salesStrategies: parseStringArray(parsed.growthRecommendations?.salesStrategies),
  };

  const hasModelGrowthRecommendations =
    parsedGrowthRecommendations.seoOptimization.length > 0 ||
    parsedGrowthRecommendations.marketing.length > 0 ||
    parsedGrowthRecommendations.salesStrategies.length > 0;

  const growthRecommendations = hasModelGrowthRecommendations
    ? parsedGrowthRecommendations
    : fallback.growthRecommendations;

  const parsedSuggestions = parseStringArray(parsed.suggestions);
  const fallbackSuggestionsFromGrowth = [
    ...growthRecommendations.seoOptimization,
    ...growthRecommendations.marketing,
    ...growthRecommendations.salesStrategies,
  ].slice(0, 8);

  let suggestions = fallback.suggestions;
  if (fallbackSuggestionsFromGrowth.length > 0) {
    suggestions = fallbackSuggestionsFromGrowth;
  }
  if (parsedSuggestions.length > 0) {
    suggestions = parsedSuggestions;
  }

  return {
    riskScore,
    risks: parsedRisks.length > 0 ? parsedRisks : fallback.risks,
    suggestions,
    growthRecommendations,
  };
};

type GenerateRiskAnalysisParams = {
  baseSnapshot: BaseSnapshot;
  userId: string;
  headers: Headers;
};

const generateRiskAnalysis = async ({
  baseSnapshot,
  userId,
  headers,
}: GenerateRiskAnalysisParams): Promise<ParsedRiskResult> => {
  try {
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
    return parseRiskResponse(rawContent, baseSnapshot);
  } catch (aiError) {
    await writeAuditLog({
      userId,
      action: 'admin.risk_report.ai_fallback_used',
      ipAddress: getClientIp(headers),
      userAgent: getUserAgent(headers),
      metadata: {
        reason: aiError instanceof Error ? aiError.message : 'Unknown AI generation error',
      },
    });

    return buildFallbackRiskResult(baseSnapshot);
  }
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
        {
          error: 'Invalid request payload.',
          issues: parsedPayload.error.issues,
        },
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
        {
          error: 'Risk report cooldown active. You can regenerate once every hour.',
        },
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

    const baseSnapshot: BaseSnapshot = {
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

    const parsed = await generateRiskAnalysis({
      baseSnapshot,
      userId: session.user.id,
      headers: request.headers,
    });

    const snapshot = {
      ...baseSnapshot,
      growthRecommendations: parsed.growthRecommendations,
    };

    const saved = await prisma.riskSnapshot.create({
      data: {
        generatedById: session.user.id,
        riskScore: parsed.riskScore,
        risks: toInputJsonValue(parsed.risks),
        suggestions: toInputJsonValue(parsed.suggestions),
        snapshot: toInputJsonValue(snapshot),
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
