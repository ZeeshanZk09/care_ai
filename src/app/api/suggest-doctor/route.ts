import { NextRequest, NextResponse } from 'next/server';
import { openai } from '../../../../config/ai';
import { AIDoctorAgents, type AIDoctorAgent } from '@/lib/data/list';
import { auth } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { getEntitlementSnapshot } from '@/lib/billing/entitlements';
import { type PlanTier } from '@/lib/billing/plans';
import { z } from 'zod';

const suggestionCache = new Map<string, { expires: number; data: AIDoctorAgent[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_SUGGESTIONS = 4;

const STANDARD_MODELS = [
  'nvidia/nemotron-nano-9b-v2:free',
  'arcee-ai/trinity-mini:free',
  'qwen/qwen3-coder:free',
];

const ADVANCED_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'stepfun/step-3.5-flash:free',
  'z-ai/glm-4.5-air:free',
  'arcee-ai/trinity-large-preview:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'minimax/minimax-m2.5:free',
];

const PREMIUM_MODELS = [
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'stepfun/step-3.5-flash:free',
  'arcee-ai/trinity-large-preview:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
];

const getModelsForPlan = (plan: PlanTier) => {
  if (plan === 'PRO') {
    return PREMIUM_MODELS;
  }

  if (plan === 'BASIC') {
    return ADVANCED_MODELS;
  }

  return STANDARD_MODELS;
};

const getPromptProfile = (plan: PlanTier) => {
  if (plan === 'PRO') {
    return {
      analysisLevel: 'comprehensive',
      routingPriority:
        'Prioritize direct specialist routing first. Include General Physician only when confidence is low.',
    };
  }

  if (plan === 'BASIC') {
    return {
      analysisLevel: 'advanced',
      routingPriority: 'Use specialist routing whenever symptoms clearly map to a specialist.',
    };
  }

  return {
    analysisLevel: 'basic',
    routingPriority:
      'Keep routing conservative. Prefer broad safe options and avoid specialist-only entries not present in catalog.',
  };
};

const buildRoutingPrompt = (
  doctors: Pick<AIDoctorAgent, 'id' | 'specialist' | 'description'>[],
  plan: PlanTier
) => {
  const profile = getPromptProfile(plan);

  return `You are a medical triage router.
Task: choose the best matching doctors from the provided catalog for the user's symptoms.

Plan context: ${plan}
Analysis depth: ${profile.analysisLevel}
Routing priority: ${profile.routingPriority}

Doctor catalog (allowed options only):
${JSON.stringify(doctors, null, 2)}

Output contract (strict):
- Return ONLY a raw JSON array.
- Each item must be a doctor id (integer) from the catalog.
- Return 1 to 4 ids, sorted best match to least.
- Do not return text, markdown, code fences, keys, or comments.
- Do not invent ids.

Routing guidance:
- Neurological symptoms (severe headache, focal weakness, seizure, numbness, speech issues) -> Neurologist (11)
- Sexual/reproductive symptoms -> Sexologist (21), Urologist (16), Gynecologist (9)
- Mood/anxiety/addiction or severe psychiatric risk -> Psychiatrist (22) and/or Psychologist (4)
- Chest pain/palpitations/exertional dyspnea -> Cardiologist (6)
- Cough/wheeze/breathing issues -> Pulmonologist (13)
- Skin rash/lesions -> Dermatologist (3)
- Joint/injury/bone pain -> Orthopedic (8), Rheumatologist (18) when inflammatory pattern suggests
- GI symptoms (abdominal pain, reflux, bowel changes) -> Gastroenterologist (12)
- Hormonal/metabolic/thyroid/diabetes symptoms -> Endocrinologist (15)
- Eye symptoms -> Ophthalmologist (14)
- Ear/nose/throat symptoms -> ENT Specialist (7)
- If symptoms are vague, multisystem, or low-confidence, include General Physician (1) as first or second choice.
- If no meaningful symptoms are provided, return [1].

Examples (valid JSON arrays):
- Symptoms: "severe one-sided headache with numbness in right arm" -> [11,1]
- Symptoms: "missed period, pelvic pain, irregular bleeding" -> [9,1]
- Symptoms: "low mood, panic attacks, insomnia for weeks" -> [22,4]
- Symptoms: "burning urination and blood in urine" -> [16,1]`;
};

const parseDoctorIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'number' && Number.isInteger(item)) {
        return item;
      }

      if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as { id?: unknown }).id;
        if (typeof id === 'number' && Number.isInteger(id)) {
          return id;
        }
      }

      return null;
    })
    .filter((id): id is number => id !== null);
};

const extractDoctorIds = (parsed: unknown): number[] => {
  if (Array.isArray(parsed)) {
    return parseDoctorIds(parsed);
  }

  if (parsed && typeof parsed === 'object' && 'doctorIds' in parsed) {
    return parseDoctorIds((parsed as { doctorIds?: unknown }).doctorIds);
  }

  if (parsed && typeof parsed === 'object' && 'doctors' in parsed) {
    return parseDoctorIds((parsed as { doctors?: unknown }).doctors);
  }

  return [];
};

const parseDoctorIdsFromRaw = (rawResponse: string): number[] => {
  const cleanedResponse = rawResponse
    .replaceAll(/```json\s*/gi, '')
    .replaceAll(/```\s*/g, '')
    .trim();

  try {
    return extractDoctorIds(JSON.parse(cleanedResponse));
  } catch {
    return [];
  }
};

const fetchDoctorIdsFromModels = async (
  notes: string,
  plan: PlanTier,
  doctors: Pick<AIDoctorAgent, 'id' | 'specialist' | 'description'>[]
): Promise<number[]> => {
  const models = getModelsForPlan(plan);
  const prompt = buildRoutingPrompt(doctors, plan);

  for (const model of models) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `User symptoms: "${notes}"`,
          },
        ],
        temperature: plan === 'PRO' ? 0.05 : 0.1,
        max_tokens: 500,
      });

      const rawResponse = response?.choices?.[0]?.message?.content;
      if (!rawResponse) {
        continue;
      }

      const parsedDoctorIds = parseDoctorIdsFromRaw(rawResponse);
      if (parsedDoctorIds.length > 0) {
        return parsedDoctorIds;
      }
    } catch (error) {
      console.warn(`[suggest-doctor] Model ${model} failed for ${plan}:`, error);
    }
  }

  return [];
};

const suggestDoctorPayloadSchema = z.object({
  notes: z.string().trim().max(1200).optional().default(''),
});

const postHandler = async (req: NextRequest) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    const entitlement = await getEntitlementSnapshot(userId);
    const parsedPayload = suggestDoctorPayloadSchema.safeParse(await req.json());
    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: 'Invalid request payload.', issues: parsedPayload.error.issues },
        { status: 400 }
      );
    }

    const notes = parsedPayload.data.notes;

    const allowedDoctors = entitlement.canAccessSpecialists
      ? AIDoctorAgents
      : AIDoctorAgents.filter((doctor) => !doctor.subscriptionRequired);

    const doctorList = allowedDoctors.map((doc) => ({
      id: doc.id,
      specialist: doc.specialist,
      description: doc.description,
    }));

    const doctorById = new Map(allowedDoctors.map((doctor) => [doctor.id, doctor]));

    const cacheKey = `${entitlement.plan}::${notes.trim().toLowerCase()}`;
    if (cacheKey) {
      const cached = suggestionCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return NextResponse.json({ data: cached.data });
      }
    }

    const parsedDoctorIds = await fetchDoctorIdsFromModels(notes, entitlement.plan, doctorList);
    const uniqueValidIds = [...new Set(parsedDoctorIds)]
      .filter((id) => doctorById.has(id))
      .slice(0, MAX_SUGGESTIONS);

    const filteredResponse: AIDoctorAgent[] = uniqueValidIds
      .map((id) => doctorById.get(id))
      .filter((doctor): doctor is AIDoctorAgent => Boolean(doctor));

    suggestionCache.set(cacheKey, {
      expires: Date.now() + CACHE_TTL_MS,
      data: filteredResponse,
    });

    return NextResponse.json({ data: filteredResponse });
  } catch (error) {
    console.error('[suggest-doctor] Error while fetching suggestions:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching doctor suggestions.' },
      { status: 500 }
    );
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request as NextRequest));
