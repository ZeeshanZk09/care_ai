import { withApiRequestAudit } from '@/lib/api/request-audit';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import { executeStructuredFeature } from '@/lib/features/structured-feature-route';
import { z } from 'zod';

const FEATURE_KEY = 'nutrition-plan';
const FEATURE_COST_CENTS = 299;

const inputSchema = z.object({
  condition: z.string().trim().min(1).max(200),
  dietaryRestrictions: z.array(z.string().trim().min(1)).max(20),
  goal: z.string().trim().min(1).max(300),
  daysRequested: z.union([z.literal(3), z.literal(5), z.literal(7)]),
});

const outputSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.number().int().min(1).max(7),
        breakfast: z.string().trim().min(1),
        lunch: z.string().trim().min(1),
        dinner: z.string().trim().min(1),
        snacks: z.string().trim().min(1),
        nutritionNotes: z.string().trim().min(1),
      })
    )
    .min(1)
    .max(7),
  generalGuidelines: z.array(z.string().trim().min(1)).min(3).max(12),
  foodsToAvoid: z.array(z.string().trim().min(1)).min(1).max(20),
});

const postHandler = async (request: Request) => {
  return executeStructuredFeature({
    request,
    featureKey: FEATURE_KEY,
    inputSchema,
    outputSchema,
    systemPrompt:
      'You are a clinical nutrition planning assistant. Return strict JSON only. Build practical meal plans aligned to condition, restrictions, and user goal.',
    buildUserPrompt: (input) => `Nutrition planning request:\n${JSON.stringify(input, null, 2)}`,
    postProcess: (output, input) => {
      return {
        ...output,
        days: output.days.slice(0, input.daysRequested),
      };
    },
    llmOptions: {
      temperature: 0.2,
      maxTokens: 2000,
    },
  });
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
