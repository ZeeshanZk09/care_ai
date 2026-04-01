import { withApiRequestAudit } from '@/lib/api/request-audit';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import { executeStructuredFeature } from '@/lib/features/structured-feature-route';
import { z } from 'zod';

const FEATURE_KEY = 'symptom-scan';
const FEATURE_COST_CENTS = 99;

const symptomScanInputSchema = z.object({
  symptoms: z.array(z.string().trim().min(1)).min(1).max(12),
  duration: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(120),
  sex: z.string().trim().min(1).max(24),
});

const symptomScanOutputSchema = z.object({
  urgencyScore: z.number().int().min(1).max(5),
  possibleConditions: z.array(z.string().trim().min(1)).min(1).max(8),
  redFlags: z.array(z.string().trim().min(1)).max(8),
  selfCareSteps: z.array(z.string().trim().min(1)).min(1).max(10),
  seekCareIf: z.string().trim().min(1),
});

const postHandler = async (request: Request) => {
  return executeStructuredFeature({
    request,
    featureKey: FEATURE_KEY,
    inputSchema: symptomScanInputSchema,
    outputSchema: symptomScanOutputSchema,
    systemPrompt:
      'You are a medical triage assistant. Return structured JSON only. Do not diagnose definitively. Map urgencyScore as: 1 monitor at home, 2 schedule routine visit, 3 same-day urgent visit, 4 urgent care now, 5 emergency room now. Keep language concise and safe.',
    buildUserPrompt: (input) => `Patient profile:\n${JSON.stringify(input, null, 2)}`,
    llmOptions: {
      temperature: 0.1,
      maxTokens: 1200,
    },
  });
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
