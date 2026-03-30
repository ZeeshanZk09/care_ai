import { auth } from '@/auth';
import { getEntitlementSnapshot } from '@/lib/billing/entitlements';
import { getAppBaseUrl, getStripePriceIdForPlan } from '@/lib/billing/stripe-config';
import { parsePaidPlanInput } from '@/lib/billing/plans';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { getStripeClient } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { z } from 'zod';

type CheckoutBody = {
  plan?: string;
};

const checkoutBodySchema = z.object({
  plan: z.enum(['BASIC', 'PRO']),
});

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

    const rawBody = (await request.json()) as CheckoutBody;
    const parsedBody = checkoutBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Invalid checkout payload.',
          issues: parsedBody.error.issues,
        },
        { status: 400 }
      );
    }

    const requestedPlan = parsePaidPlanInput(parsedBody.data.plan);

    if (!requestedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan. Please choose either BASIC or PRO.' },
        { status: 400 }
      );
    }

    const [userRecord, entitlement] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          stripeCustomerId: true,
        },
      }),
      getEntitlementSnapshot(userId),
    ]);

    if (!userRecord) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    if (entitlement.plan === requestedPlan) {
      return NextResponse.json(
        {
          error: `You are already subscribed to the ${requestedPlan} plan.`,
          code: 'PLAN_ALREADY_ACTIVE',
        },
        { status: 409 }
      );
    }

    if (entitlement.plan === 'PRO' && requestedPlan === 'BASIC') {
      return NextResponse.json(
        {
          error:
            'You are currently on Pro. Please use billing portal to manage downgrade at period end.',
          code: 'USE_BILLING_PORTAL',
        },
        { status: 400 }
      );
    }

    let stripeCustomerId = userRecord.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userRecord.email,
        name: userRecord.name ?? undefined,
        metadata: {
          userId: userRecord.id,
        },
      });

      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    const appBaseUrl = getAppBaseUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: getStripePriceIdForPlan(requestedPlan),
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${appBaseUrl}/dashboard?welcome=true`,
      cancel_url: `${appBaseUrl}/pricing?checkout=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId,
        requestedPlan,
      },
      subscription_data: {
        metadata: {
          userId,
          requestedPlan,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (error) {
    console.error('[billing/checkout] Failed to create Stripe Checkout session:', error);
    return NextResponse.json(
      { error: 'Unable to create checkout session at this time.' },
      { status: 500 }
    );
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
