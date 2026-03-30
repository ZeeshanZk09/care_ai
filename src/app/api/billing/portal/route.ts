import { auth } from '@/auth';
import { getAppBaseUrl } from '@/lib/billing/stripe-config';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { getStripeClient } from '@/lib/stripe';
import { NextResponse } from 'next/server';

const postHandler = async (request: Request) => {
  try {
    const csrfErrorResponse = enforceCsrfProtection(request);
    if (csrfErrorResponse) {
      return csrfErrorResponse;
    }

    const stripe = getStripeClient();
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!userRecord?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing profile found for this user.', code: 'NO_BILLING_PROFILE' },
        { status: 404 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userRecord.stripeCustomerId,
      return_url: `${getAppBaseUrl()}/pricing`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (error) {
    console.error('[billing/portal] Failed to create Stripe Billing Portal session:', error);
    return NextResponse.json({ error: 'Unable to open billing portal.' }, { status: 500 });
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
