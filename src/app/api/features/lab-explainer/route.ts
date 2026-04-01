import { withApiRequestAudit } from '@/lib/api/request-audit';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import { executeStructuredFeature } from '@/lib/features/structured-feature-route';
import { z } from 'zod';

const FEATURE_KEY = 'lab-explainer';
const FEATURE_COST_CENTS = 149;

const inputSchema = z.object({
  reportText: z.string().trim().min(20).max(12000),
});

const outputSchema = z.object({
  markers: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        value: z.string().trim().min(1),
        unit: z.string().trim().min(1),
        referenceRange: z.string().trim().min(1),
        status: z.enum(['normal', 'low', 'high']),
        plainExplanation: z.string().trim().min(1),
      })
    )
    .min(1)
    .max(40),
  summary: z.string().trim().min(1),
  followUpQuestions: z.array(z.string().trim().min(1)).min(1).max(10),
});

const postHandler = async (request: Request) => {
  return executeStructuredFeature({
    request,
    featureKey: FEATURE_KEY,
    inputSchema,
    outputSchema,
    systemPrompt:
      'You are a lab report explainer for patients. Return strict JSON only. Do not make final diagnoses. Explain each marker clearly and safely.',
    buildUserPrompt: (input) => `Lab report text:\n${input.reportText}`,
    llmOptions: {
      temperature: 0.15,
      maxTokens: 1800,
    },
  });
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
