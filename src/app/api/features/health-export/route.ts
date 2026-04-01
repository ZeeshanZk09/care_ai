import { auth } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { saveFeatureResult } from '@/lib/credits/feature-results';
import { createSignedHealthExportUrl } from '@/lib/credits/signed-export-url';
import { withPaygGate } from '@/lib/credits/with-payg-gate';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const FEATURE_KEY = 'health-export';
const FEATURE_COST_CENTS = 399;

const inputSchema = z.object({}).passthrough();

const postHandler = async (request: Request) => {
  const csrfErrorResponse = enforceCsrfProtection(request);
  if (csrfErrorResponse) {
    return csrfErrorResponse;
  }

  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    const parsedPayload = inputSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: 'Invalid health export payload.',
          issues: parsedPayload.error.issues,
        },
        { status: 400 }
      );
    }

    const featureResultCount = await prisma.featureResult.count({
      where: {
        userId,
        featureKey: {
          not: FEATURE_KEY,
        },
      },
    });

    if (featureResultCount === 0) {
      return NextResponse.json(
        {
          error: 'No feature results available yet for export.',
        },
        { status: 400 }
      );
    }

    const signed = createSignedHealthExportUrl(userId, 60 * 60);

    await saveFeatureResult({
      userId,
      featureKey: FEATURE_KEY,
      input: parsedPayload.data,
      result: {
        signedUrlIssued: true,
        expiresInSeconds: signed.expiresInSeconds,
        featureResultCount,
      },
    });

    return NextResponse.json(
      {
        url: signed.url,
        expiresInSeconds: signed.expiresInSeconds,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health export initialization failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const POST = withApiRequestAudit(
  withPaygGate(FEATURE_KEY, FEATURE_COST_CENTS)(async (request) => postHandler(request))
);
