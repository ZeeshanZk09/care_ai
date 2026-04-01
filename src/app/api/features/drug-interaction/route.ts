import { withApiRequestAudit } from '@/lib/api/request-audit';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import { executeStructuredFeature } from '@/lib/features/structured-feature-route';
import { z } from 'zod';

const FEATURE_KEY = 'drug-interaction';
const FEATURE_COST_CENTS = 99;

const inputSchema = z.object({
  drugs: z.array(z.string().trim().min(1)).min(2).max(10),
});

const outputSchema = z.object({
  interactions: z.array(
    z.object({
      drugs: z.array(z.string().trim().min(1)).min(2).max(5),
      severity: z.enum(['minor', 'moderate', 'major']),
      description: z.string().trim().min(1),
      recommendation: z.string().trim().min(1),
    })
  ),
  overallRisk: z.string().trim().min(1),
});

const postHandler = async (request: Request) => {
  return executeStructuredFeature({
    request,
    featureKey: FEATURE_KEY,
    inputSchema,
    outputSchema,
    systemPrompt:
      'You are a medication safety assistant. Return strict JSON only. Identify plausible interactions, classify severity, and provide practical recommendation language suitable for patients.',
    buildUserPrompt: (input) => `Medication list:\n${JSON.stringify(input.drugs, null, 2)}`,
    postProcess: (output) => {
      const disclaimer = 'This check supplements, and does not replace, pharmacist advice.';
      return {
        ...output,
        overallRisk: output.overallRisk.includes('pharmacist')
          ? output.overallRisk
          : `${output.overallRisk} ${disclaimer}`,
      };
    },
  });
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
