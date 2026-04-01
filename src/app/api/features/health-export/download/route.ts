import { auth } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { verifySignedHealthExportToken } from '@/lib/credits/signed-export-url';
import { generateHealthTimelinePdf } from '@/lib/features/health-export-pdf';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const getHandler = async (request: Request) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    const token = new URL(request.url).searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing export token.' }, { status: 400 });
    }

    const verified = verifySignedHealthExportToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid or expired export token.' }, { status: 401 });
    }

    if (verified.userId !== userId) {
      return NextResponse.json(
        { error: 'Export token does not match user session.' },
        { status: 403 }
      );
    }

    const [user, rows] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
        },
      }),
      prisma.featureResult.findMany({
        where: {
          userId,
          featureKey: {
            not: 'health-export',
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          featureKey: true,
          createdAt: true,
          result: true,
        },
      }),
    ]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No feature results available for export.' },
        { status: 400 }
      );
    }

    const userLabel = user?.name?.trim() || user?.email || 'CareAI User';
    const bytes = await generateHealthTimelinePdf({
      userLabel,
      rows,
    });

    const pdfData = new Uint8Array(bytes.length);
    pdfData.set(bytes);

    return new Response(pdfData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="careai-health-timeline.pdf"',
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate export PDF.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const GET = withApiRequestAudit(async (request) => getHandler(request));
