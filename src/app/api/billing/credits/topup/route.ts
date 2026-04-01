import { auth } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { CREDIT_PACKAGE_IDS, getCreditPackage, type CreditPackageId } from '@/lib/billing/plans';
import prisma from '@/lib/prisma';
import { enforceCsrfProtection } from '@/lib/security/csrf';
import { getStripeClient } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const topUpPayloadSchema = z.object({
  packageId: z.enum(CREDIT_PACKAGE_IDS),
});

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

    const parsed = topUpPayloadSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid credit top-up payload.',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const packageId = parsed.data.packageId as CreditPackageId;
    const creditPackage = getCreditPackage(packageId);

    const stripe = getStripeClient();

    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    });

    if (!userRecord) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
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
        data: {
          stripeCustomerId,
        },
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.amountCents,
      currency: 'usd',
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        type: 'credit_topup',
        userId,
        packageId: creditPackage.id,
        creditsGranted: String(creditPackage.totalCredits),
      },
    });

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        package: creditPackage,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize credit top-up.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
