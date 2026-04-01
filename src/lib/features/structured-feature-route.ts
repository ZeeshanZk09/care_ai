import { auth } from '@/auth';
import { saveFeatureResult } from '@/lib/credits/feature-results';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callClaudeJson } from './llm-json';

type ExecuteStructuredFeatureParams<TInput, TOutput> = {
  request: Request;
  featureKey: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  systemPrompt: string;
  buildUserPrompt: (input: TInput) => string;
  postProcess?: (output: TOutput, input: TInput) => TOutput;
  llmOptions?: {
    temperature?: number;
    maxTokens?: number;
  };
};

export const executeStructuredFeature = async <TInput, TOutput>(
  params: ExecuteStructuredFeatureParams<TInput, TOutput>
) => {
  const csrfErrorResponse = enforceCsrfProtection(params.request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    const parsedPayload = params.inputSchema.safeParse(
      await params.request.json().catch(() => ({}) as unknown)
    );

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: 'Invalid feature request payload.',
          issues: parsedPayload.error.issues,
        },
        { status: 400 }
      );
    }

    const output = await callClaudeJson({
      systemPrompt: params.systemPrompt,
      userPrompt: params.buildUserPrompt(parsedPayload.data),
      schema: params.outputSchema,
      temperature: params.llmOptions?.temperature,
      maxTokens: params.llmOptions?.maxTokens,
    });

    const finalOutput = params.postProcess
      ? params.postProcess(output, parsedPayload.data)
      : output;

    await saveFeatureResult({
      userId,
      featureKey: params.featureKey,
      input: parsedPayload.data,
      result: finalOutput,
    });

    return NextResponse.json(finalOutput, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Feature processing failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
