import { withApiRequestAudit } from '@/lib/api/request-audit';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import { executeStructuredFeature } from '@/lib/features/structured-feature-route';
import { z } from 'zod';

const FEATURE_KEY = 'referral-letter';
const FEATURE_COST_CENTS = 499;

const inputSchema = z.object({
  patientAge: z.number().int().min(0).max(120),
  sex: z.string().trim().min(1).max(24),
  symptoms: z.array(z.string().trim().min(1)).min(1).max(15),
  duration: z.string().trim().min(1).max(120),
  relevantHistory: z.string().trim().min(1).max(3000),
  requestedSpecialist: z.string().trim().min(1).max(120),
  urgency: z.enum(['routine', 'urgent']),
});

const outputSchema = z.object({
  letterText: z.string().trim().min(1),
});

const DISCLAIMER =
  '**DISCLAIMER:** This is an AI-generated referral draft for clinician review and must not be submitted without GP approval.';

const postHandler = async (request: Request) => {
  return executeStructuredFeature({
    request,
    featureKey: FEATURE_KEY,
    inputSchema,
    outputSchema,
    systemPrompt:
      'You are a GP letter drafting assistant. Return strict JSON only with a formal referral letter in plain text. Keep professional tone and clear structure.',
    buildUserPrompt: (input) => `Referral details:\n${JSON.stringify(input, null, 2)}`,
    postProcess: (output) => {
      const text = output.letterText.startsWith('**DISCLAIMER:**')
        ? output.letterText
        : `${DISCLAIMER}\n\n${output.letterText}`;
      return {
        letterText: text,
      };
    },
    llmOptions: {
      temperature: 0.2,
      maxTokens: 1400,
    },
  });
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
