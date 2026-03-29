import { NextRequest, NextResponse } from 'next/server';
import { openai } from '../../../../config/ai';
import { AIDoctorAgents } from '@/lib/data/list';
import { auth } from '@/auth';
import { keywordMatch } from '@/lib/utils/note';

const suggestionCache = new Map<string, { expires: number; data: any[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    const { notes } = await req.json();

    const cacheKey = (notes ?? '').toString().trim().toLowerCase();
    if (cacheKey) {
      const cached = suggestionCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return NextResponse.json({ data: cached.data });
      }
    }

    const doctorList = AIDoctorAgents.map((doc) => ({
      id: doc.id,
      specialist: doc.specialist,
      description: doc.description,
    }));

    const fallBackModels = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen3-next-80b-a3b-instruct:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'nvidia/nemotron-nano-12b-v2-vl:free',
      'stepfun/step-3.5-flash:free',
      'arcee-ai/trinity-large-preview:free',
      'z-ai/glm-4.5-air:free',
      'nvidia/nemotron-nano-9b-v2:free',
      'qwen/qwen3-coder:free',
      'arcee-ai/trinity-mini:free',
      'nvidia/nemotron-3-nano-30b-a3b:free',
      'minimax/minimax-m2.5:free',
    ];

    let apiResponse: any = null;

    for (const model of fallBackModels) {
      try {
        console.log(`[processing]: Trying model ${model}...`);
        apiResponse = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are a precise medical routing assistant. Your ONLY job is to output a JSON array of doctors that match the user's symptoms.
## Doctor Data
${JSON.stringify(doctorList, null, 2)}

## Rules
1. Analyze the user's symptoms carefully.
2. Match symptoms to doctor specializations using the following guidelines:
   - Headache / neurological issues → Neurologist
   - Sexual/reproductive issues → Sexologist, Urologist, Gynecologist
   - Mental health/addictions → Psychiatrist, Psychologist, Addiction Specialist
   - General illness → General Practitioner, Internist
   - Specific organ/system → match to relevant specialty
3. **Your response must be a raw JSON array of matching doctor objects.**
4. If no doctor matches, return [].
5. DO NOT include any explanation, markdown formatting, or extra text.
`,
            },
            {
              role: 'user',
              content: `User symptoms: "${notes}"`,
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        });

        if (apiResponse?.choices?.[0]?.message?.content) {
          console.log(`Model ${model} succeeded.`);
          break;
        } else {
          console.warn(`Model ${model} returned empty content.`);
          apiResponse = null;
        }
      } catch (error) {
        console.warn(`Model ${model} failed:`, error);
        apiResponse = null;
      }
    }

    let parsedResponse: any[] = [];

    if (apiResponse) {
      const rawResponse = apiResponse.choices[0]?.message?.content || '';
      console.log(`Raw AI output: ${rawResponse}`);
      
      const cleanedResponse = rawResponse
        .replaceAll(/```json\s*/gi, '')
        .replaceAll(/```\s*/g, '')
        .trim();

      try {
        const parsed = JSON.parse(cleanedResponse);
        if (Array.isArray(parsed)) {
          parsedResponse = parsed;
        } else if (parsed.doctors && Array.isArray(parsed.doctors)) {
          parsedResponse = parsed.doctors;
        } else {
          parsedResponse = [];
        }
      } catch (parseError) {
        console.warn('Initial JSON.parse failed, falling back to keyword matching...');
        parsedResponse = [];
      }
    }

    const validDoctorIds = new Set(AIDoctorAgents.map((d) => d.id));
    let filteredResponse = parsedResponse.filter((doc: any) => validDoctorIds.has(doc.id));
    
    if (filteredResponse.length === 0) {
      console.log('No AI matches, falling back to keyword matching.');
      filteredResponse = keywordMatch(notes, AIDoctorAgents);
    }

    if (cacheKey) {
      suggestionCache.set(cacheKey, {
        expires: Date.now() + CACHE_TTL_MS,
        data: filteredResponse,
      });
    }

    return NextResponse.json({ data: filteredResponse });
  } catch (error) {
    console.error('Error occurred while fetching doctor suggestions:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching doctor suggestions.' },
      { status: 500 }
    );
  }
}
