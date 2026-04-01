import { auth } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { getClientIp, getUserAgent, writeAuditLog } from '@/lib/audit';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const AGENT_ID = 'GPT-5.3-Codex';

const funnelPayloadSchema = z.object({
  funnelId: z.uuid().optional(),
  step: z.enum([
    'notes_viewed',
    'notes_submitted',
    'doctor_suggestions_viewed',
    'doctor_selected',
    'consultation_started',
    'consultation_completed',
    'consultation_abandoned',
  ]),
  status: z.enum(['viewed', 'completed', 'abandoned']),
  sessionId: z.string().min(1).optional(),
  deepLink: z.string().trim().min(1).max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const resolveAction = (status: 'viewed' | 'completed' | 'abandoned') => {
  if (status === 'abandoned') {
    return 'consultation.abandoned';
  }

  if (status === 'viewed') {
    return 'consultation.step_viewed';
  }

  return 'consultation.step_completed';
};

const postHandler = async (request: Request) => {
  const csrfErrorResponse = enforceCsrfProtection(request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
  }

  const parsedPayload = funnelPayloadSchema.safeParse(await request.json());
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: 'Invalid funnel tracking payload.',
        issues: parsedPayload.error.issues,
      },
      { status: 400 }
    );
  }

  const action = resolveAction(parsedPayload.data.status);
  const funnelId = parsedPayload.data.funnelId ?? crypto.randomUUID();
  const metadata: Record<string, unknown> = {
    funnelId,
    step: parsedPayload.data.step,
    status: parsedPayload.data.status,
    sessionId: parsedPayload.data.sessionId ?? null,
    deepLink: parsedPayload.data.deepLink ?? null,
    occurredAt: new Date().toISOString(),
    agentId: AGENT_ID,
  };

  if (parsedPayload.data.metadata) {
    Object.assign(metadata, parsedPayload.data.metadata);
  }

  await writeAuditLog({
    userId,
    action,
    ipAddress: getClientIp(request.headers),
    userAgent: getUserAgent(request.headers),
    metadata,
  });

  return NextResponse.json(
    {
      success: true,
      action,
      funnelId,
    },
    { status: 200 }
  );
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));