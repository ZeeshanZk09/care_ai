import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { getClientIp, getUserAgent, writeAuditLog } from '@/lib/audit';
import { enforceCsrfProtection } from '@/lib/security/csrf';

const AGENT_ID = 'GPT-5.3-Codex';

const leadCaptureSchema = z.object({
  email: z.email(),
  context: z.enum(['pricing', 'consultation']),
  sourcePath: z.string().trim().max(240).optional(),
});

const getResourceLink = (context: 'pricing' | 'consultation') => {
  if (context === 'pricing') {
    return '/faq/billing-and-plans';
  }

  return '/symptoms';
};

const postHandler = async (request: Request) => {
  const csrfErrorResponse = enforceCsrfProtection(request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  const parsedPayload = leadCaptureSchema.safeParse(await request.json());
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: 'Invalid lead capture payload.',
        issues: parsedPayload.error.issues,
      },
      { status: 400 }
    );
  }

  const resourceLink = getResourceLink(parsedPayload.data.context);

  await writeAuditLog({
    action: 'marketing.lead_capture.submitted',
    ipAddress: getClientIp(request.headers),
    userAgent: getUserAgent(request.headers),
    metadata: {
      email: parsedPayload.data.email,
      context: parsedPayload.data.context,
      sourcePath: parsedPayload.data.sourcePath ?? null,
      resourceLink,
      occurredAt: new Date().toISOString(),
      agentId: AGENT_ID,
    },
  });

  return NextResponse.json(
    {
      success: true,
      resourceLink,
      message: 'Thanks. Your free resource is ready.',
    },
    { status: 200 }
  );
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
