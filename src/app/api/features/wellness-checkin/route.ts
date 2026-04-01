import { auth } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { saveFeatureResult } from '@/lib/credits/feature-results';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import { callClaudeJson } from '@/lib/features/llm-json';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const FEATURE_KEY = 'wellness-checkin';
const FEATURE_COST_CENTS = 149;

const inputSchema = z.object({
  phq9Responses: z.array(z.number().int().min(0).max(3)).length(9),
  gad7Responses: z.array(z.number().int().min(0).max(3)).length(7),
  freeText: z.string().trim().max(2000).optional(),
});

const llmOutputSchema = z.object({
  personalizedGuidance: z.array(z.string().trim().min(1)).min(3).max(12),
  suggestedResources: z.array(z.string().trim().min(1)).min(3).max(12),
});

const outputSchema = z.object({
  phq9Score: z.number().int().min(0),
  gad7Score: z.number().int().min(0),
  phq9Severity: z.string().trim().min(1),
  gad7Severity: z.string().trim().min(1),
  personalizedGuidance: z.array(z.string().trim().min(1)).min(1),
  suggestedResources: z.array(z.string().trim().min(1)).min(1),
  escalationFlag: z.boolean(),
});

const classifyPhq9Severity = (score: number) => {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  if (score <= 19) return 'moderately severe';
  return 'severe';
};

const classifyGad7Severity = (score: number) => {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
};

const CRISIS_LINES = [
  'If you are in immediate danger, call local emergency services right now.',
  'US/Canada: Call or text 988 (Suicide & Crisis Lifeline).',
  'UK & ROI: Samaritans 116 123 (24/7).',
  'Pakistan: Umang mental health helpline +92-316-8276789.',
];

const hasCrisisLanguage = (freeText: string | undefined) => {
  if (!freeText) {
    return false;
  }

  return /(suicide|self-harm|kill myself|hurt myself|end my life)/i.test(freeText);
};

const postHandler = async (request: Request) => {
  const csrfErrorResponse = enforceCsrfProtection(request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid wellness check-in payload.',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const phq9Score = input.phq9Responses.reduce((sum, value) => sum + value, 0);
    const gad7Score = input.gad7Responses.reduce((sum, value) => sum + value, 0);

    const phq9Severity = classifyPhq9Severity(phq9Score);
    const gad7Severity = classifyGad7Severity(gad7Score);

    const llmOutput = await callClaudeJson({
      systemPrompt:
        'You are a mental wellness support assistant. Return strict JSON only with personalizedGuidance and suggestedResources. Keep advice supportive and non-diagnostic.',
      userPrompt: `Scores and context:\n${JSON.stringify(
        {
          phq9Score,
          gad7Score,
          phq9Severity,
          gad7Severity,
          freeText: input.freeText ?? null,
        },
        null,
        2
      )}`,
      schema: llmOutputSchema,
      temperature: 0.2,
      maxTokens: 1200,
    });

    const escalationFlag =
      phq9Score >= 20 ||
      gad7Score >= 15 ||
      input.phq9Responses[8] >= 1 ||
      hasCrisisLanguage(input.freeText);

    const suggestedResources = escalationFlag
      ? [...llmOutput.suggestedResources, ...CRISIS_LINES]
      : llmOutput.suggestedResources;

    const personalizedGuidance = escalationFlag
      ? [
          ...llmOutput.personalizedGuidance,
          'You reported high-risk mental health signals. Please seek immediate support from a trusted person or crisis service.',
        ]
      : llmOutput.personalizedGuidance;

    const payload = outputSchema.parse({
      phq9Score,
      gad7Score,
      phq9Severity,
      gad7Severity,
      personalizedGuidance,
      suggestedResources,
      escalationFlag,
    });

    await saveFeatureResult({
      userId,
      featureKey: FEATURE_KEY,
      input,
      result: payload,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Wellness check-in failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
