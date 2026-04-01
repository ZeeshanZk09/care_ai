import { withApiRequestAudit } from '@/lib/api/request-audit';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import { executeStructuredFeature } from '@/lib/features/structured-feature-route';
import { z } from 'zod';

const FEATURE_KEY = 'second-opinion';
const FEATURE_COST_CENTS = 249;

const inputSchema = z.object({
  primaryDiagnosis: z.string().trim().min(1).max(300),
  symptoms: z.array(z.string().trim().min(1)).min(1).max(12),
  currentTreatment: z.string().trim().min(1).max(2000),
  concerns: z.string().trim().min(1).max(2000),
});

const outputSchema = z.object({
  alternativeAngles: z.array(z.string().trim().min(1)).min(1).max(8),
  questionsToAsk: z.array(z.string().trim().min(1)).min(3).max(12),
  potentialGaps: z.array(z.string().trim().min(1)).min(1).max(8),
  disclaimer: z.string().trim().min(1),
});

const postHandler = async (request: Request) => {
  return executeStructuredFeature({
    request,
    featureKey: FEATURE_KEY,
    inputSchema,
    outputSchema,
    systemPrompt:
      'You are a clinical communication assistant. Provide a balanced second-opinion brief. Return strict JSON only. Never claim certainty or replace doctor judgment.',
    buildUserPrompt: (input) => `Case details:\n${JSON.stringify(input, null, 2)}`,
    postProcess: (output) => {
      const defaultDisclaimer =
        'This brief is informational and must be reviewed with a licensed clinician before treatment changes.';
      return {
        ...output,
        disclaimer: output.disclaimer || defaultDisclaimer,
      };
    },
  });
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
