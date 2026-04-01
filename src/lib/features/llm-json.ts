import { openai } from '../../../config/ai';
import { z } from 'zod';

const CLAUDE_MODEL = 'anthropic/claude-3.5-sonnet';

const stripJsonFences = (raw: string) => {
  return raw
    .replaceAll(/```json\s*/gi, '')
    .replaceAll(/```\s*/g, '')
    .trim();
};

const parseJsonObjectSafely = (raw: string) => {
  const cleaned = stripJsonFences(raw);

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
};

export const callClaudeJson = async <T>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
}) => {
  const completion = await openai.chat.completions.create({
    model: CLAUDE_MODEL,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 1800,
    messages: [
      {
        role: 'system',
        content: `${params.systemPrompt}\n\nReturn valid JSON only. No markdown fences.`,
      },
      {
        role: 'user',
        content: params.userPrompt,
      },
    ],
  });

  const rawContent = completion.choices?.[0]?.message?.content ?? '';
  const parsed = parseJsonObjectSafely(rawContent);

  if (!parsed) {
    throw new Error('LLM response could not be parsed as JSON.');
  }

  const validated = params.schema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`LLM response failed schema validation: ${validated.error.message}`);
  }

  return validated.data;
};
