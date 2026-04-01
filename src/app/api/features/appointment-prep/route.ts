import { withApiRequestAudit } from '@/lib/api/request-audit';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import { executeStructuredFeature } from '@/lib/features/structured-feature-route';
import { z } from 'zod';

const FEATURE_KEY = 'appointment-prep';
const FEATURE_COST_CENTS = 199;

const inputSchema = z.object({
  specialistType: z.string().trim().min(1).max(120),
  reasonForVisit: z.string().trim().min(1).max(600),
  currentSymptoms: z.array(z.string().trim().min(1)).min(1).max(15),
  currentMedications: z.array(z.string().trim().min(1)).max(20),
  concerns: z.string().trim().min(1).max(2000),
});

const outputSchema = z.object({
  questionsToAsk: z.array(z.string().trim().min(1)).min(5).max(15),
  informationToBring: z.array(z.string().trim().min(1)).min(4).max(15),
  symptomJournalPrompts: z.array(z.string().trim().min(1)).min(4).max(15),
  redFlagsToMention: z.array(z.string().trim().min(1)).min(2).max(12),
});

const postHandler = async (request: Request) => {
  return executeStructuredFeature({
    request,
    featureKey: FEATURE_KEY,
    inputSchema,
    outputSchema,
    systemPrompt:
      'You are an appointment preparation assistant for patients. Return strict JSON only. Focus on actionable prep guidance before specialist visits.',
    buildUserPrompt: (input) => `Appointment prep details:\n${JSON.stringify(input, null, 2)}`,
    llmOptions: {
      temperature: 0.2,
      maxTokens: 1600,
    },
  });
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
