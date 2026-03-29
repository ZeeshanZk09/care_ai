import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const sessionIdUser = session?.user?.id;

    if (!sessionIdUser) {
      console.warn('[session-chat] unauthenticated request');
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: sessionIdUser },
      select: { id: true, credit: true, plan: true }
    });

    if (!userRecord) {
      return NextResponse.json({ error: 'User record not found.' }, { status: 404 });
    }

    if (userRecord.plan === 'free' && userRecord.credit <= 0) {
      return NextResponse.json({ error: 'You have exhausted your free trials. Please purchase a plan to continue.' }, { status: 403 });
    }

    const { notes, selectedDoctor, output } = await request.json();
    console.debug('[session-chat] incoming body', {
      notesPreview: notes?.slice?.(0, 200),
      selectedDoctor,
      hasOutput: !!output,
    });
    
    let result: any;
    try {
      result = await prisma.$transaction(async (tx) => {
        // Decrease credit if on free plan
        if (userRecord.plan !== 'pro' && userRecord.plan !== 'premium' && userRecord.plan !== 'basic') {
           await tx.user.update({
             where: { id: sessionIdUser },
             data: { credit: { decrement: 1 } }
           });
        }
        
        return await tx.chatSession.create({
          data: {
            userId: sessionIdUser,
            sessionId: crypto.randomUUID(),
            notes,
            selectedDoctor,
            conversation: {
              input: notes,
              output,
            },
            report: null,
          },
        });
      });
    } catch (dbErr) {
      console.error('[session-chat] transaction failed:', dbErr);
      return NextResponse.json({ error: 'Database write failed.' }, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[session-chat] Failed to create chat session:', error);
    return NextResponse.json({ error: error.message || 'Failed to create chat session.' }, { status: 500 });
  }
}
