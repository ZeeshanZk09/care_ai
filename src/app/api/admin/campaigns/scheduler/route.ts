import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/admin';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { getClientIp, getUserAgent } from '@/lib/audit';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { openai } from '../../../../../../config/ai';

const AGENT_ID = 'GPT-5.3-Codex';

const schedulerPayloadSchema = z.object({
  theme: z.string().trim().min(3).max(120),
  audience: z.string().trim().min(3).max(120).optional(),
});

type CampaignDraft = {
  theme: string;
  leadMagnetTitle: string;
  landingPageDraft: {
    h1: string;
    subtitle: string;
    sections: string[];
    primaryCta: string;
  };
  emailSequenceOutline: Array<{
    day: number;
    subject: string;
    objective: string;
    cta: string;
  }>;
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

const buildFallbackDraft = (theme: string): CampaignDraft => {
  return {
    theme,
    leadMagnetTitle: `${theme}: Free Symptom Preparation Checklist`,
    landingPageDraft: {
      h1: `${theme}: Start with a free symptom checklist`,
      subtitle:
        'Capture high-intent users with a focused lead magnet and route them into consultation-ready flows.',
      sections: [
        'Why this health topic matters right now',
        'Top symptom checklist users can download',
        'How to continue into a CareAI consultation',
      ],
      primaryCta: 'Download free checklist and start consultation',
    },
    emailSequenceOutline: [
      {
        day: 0,
        subject: `${theme}: your free checklist is ready`,
        objective: 'Deliver lead magnet and establish immediate trust.',
        cta: 'Download checklist',
      },
      {
        day: 2,
        subject: `How to use the ${theme} checklist in 5 minutes`,
        objective: 'Drive first consultation activation.',
        cta: 'Start consultation',
      },
      {
        day: 4,
        subject: `Real outcomes: using ${theme} guidance effectively`,
        objective: 'Provide social proof and reduce activation friction.',
        cta: 'Continue consultation',
      },
      {
        day: 6,
        subject: `Final reminder: ${theme} campaign offer ending soon`,
        objective: 'Convert active free users with urgency.',
        cta: 'Compare plans and upgrade',
      },
    ],
  };
};

const parseCampaignDraft = (raw: string, theme: string): CampaignDraft => {
  const cleaned = raw
    .replaceAll(/```json\s*/gi, '')
    .replaceAll(/```\s*/g, '')
    .trim();
  const parsed = parseJsonObjectSafely(cleaned);
  if (!parsed) {
    return buildFallbackDraft(theme);
  }

  const landingPageDraftInput =
    parsed.landingPageDraft && typeof parsed.landingPageDraft === 'object'
      ? (parsed.landingPageDraft as Record<string, unknown>)
      : null;

  const emailSequenceInput = Array.isArray(parsed.emailSequenceOutline)
    ? parsed.emailSequenceOutline
    : [];

  const safeSections = Array.isArray(landingPageDraftInput?.sections)
    ? landingPageDraftInput?.sections
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const safeEmailSequence = emailSequenceInput
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as Record<string, unknown>;
      const day = Number(row.day);
      const subject = typeof row.subject === 'string' ? row.subject.trim() : '';
      const objective = typeof row.objective === 'string' ? row.objective.trim() : '';
      const cta = typeof row.cta === 'string' ? row.cta.trim() : '';

      if (!Number.isFinite(day) || !subject || !objective || !cta) {
        return null;
      }

      return {
        day,
        subject,
        objective,
        cta,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const fallback = buildFallbackDraft(theme);

  return {
    theme,
    leadMagnetTitle:
      typeof parsed.leadMagnetTitle === 'string' && parsed.leadMagnetTitle.trim()
        ? parsed.leadMagnetTitle.trim()
        : fallback.leadMagnetTitle,
    landingPageDraft: {
      h1:
        typeof landingPageDraftInput?.h1 === 'string' && landingPageDraftInput.h1.trim()
          ? landingPageDraftInput.h1.trim()
          : fallback.landingPageDraft.h1,
      subtitle:
        typeof landingPageDraftInput?.subtitle === 'string' && landingPageDraftInput.subtitle.trim()
          ? landingPageDraftInput.subtitle.trim()
          : fallback.landingPageDraft.subtitle,
      sections: safeSections.length > 0 ? safeSections : fallback.landingPageDraft.sections,
      primaryCta:
        typeof landingPageDraftInput?.primaryCta === 'string' &&
        landingPageDraftInput.primaryCta.trim()
          ? landingPageDraftInput.primaryCta.trim()
          : fallback.landingPageDraft.primaryCta,
    },
    emailSequenceOutline:
      safeEmailSequence.length > 0 ? safeEmailSequence : fallback.emailSequenceOutline,
  };
};

const generateCampaignDraft = async (theme: string, audience?: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            'You are a growth strategist. Return strict JSON with keys: leadMagnetTitle (string), landingPageDraft ({h1,subtitle,sections:string[],primaryCta}), emailSequenceOutline (array of {day:number,subject,objective,cta}). Keep the sequence focused on conversion and consultation activation.',
        },
        {
          role: 'user',
          content: `Create a weekly campaign draft for theme "${theme}" and audience "${audience ?? 'general free-tier users'}".`,
        },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content ?? '{}';
    return parseCampaignDraft(rawContent, theme);
  } catch {
    return buildFallbackDraft(theme);
  }
};

const postHandler = async (request: Request) => {
  const csrfErrorResponse = enforceCsrfProtection(request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  try {
    const session = await requireAdminSession();

    const parsedPayload = schedulerPayloadSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: 'Invalid campaign scheduler payload.',
          issues: parsedPayload.error.issues,
        },
        { status: 400 }
      );
    }

    const draft = await generateCampaignDraft(
      parsedPayload.data.theme,
      parsedPayload.data.audience
    );

    const queued = await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'growth.campaign.scheduler.queued',
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: {
          theme: parsedPayload.data.theme,
          audience: parsedPayload.data.audience ?? null,
          draft,
          reviewStatus: 'PENDING_REVIEW',
          occurredAt: new Date().toISOString(),
          agentId: AGENT_ID,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        queueId: queued.id,
        reviewStatus: 'PENDING_REVIEW',
        draft,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Campaign scheduler failed.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
