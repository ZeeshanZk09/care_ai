import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { withApiRequestAudit } from '@/lib/api/request-audit';
import { syncUserPlanFromBilling } from '@/lib/billing/entitlements';
import { topUp } from '@/lib/credits/credit-service';
import { getPlanForStripePriceId, getStripeWebhookSecret } from '@/lib/billing/stripe-config';
import {
  paymentConfirmationTemplate,
  paymentFailedTemplate,
  subscriptionCancelledTemplate,
} from '@/lib/email-templates';
import type { Prisma } from '@/lib/generated/prisma/client';
import { sendEmail } from '@/lib/mail';
import prisma from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';

const fromUnixTime = (value?: number | null): Date | null => {
  if (!value) {
    return null;
  }

  return new Date(value * 1000);
};

const getCurrentCycleStart = (date = new Date()) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
};

const mapSubscriptionStatus = (status: Stripe.Subscription.Status) => {
  switch (status) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'unpaid':
      return 'UNPAID';
    case 'incomplete':
      return 'INCOMPLETE';
    case 'incomplete_expired':
      return 'INCOMPLETE_EXPIRED';
    case 'paused':
      return 'PAUSED';
    default:
      return 'INCOMPLETE';
  }
};

const toUpperStatus = (status: string | null | undefined) => {
  if (!status) {
    return 'INCOMPLETE';
  }

  return status.toUpperCase().replaceAll('-', '_');
};

const getCustomerId = (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null => {
  if (!customer) {
    return null;
  }

  return typeof customer === 'string' ? customer : customer.id;
};

const findUserId = async (
  customerId: string | null,
  metadataUserId?: string | null,
  fallbackUserId?: string | null
) => {
  const candidateUserId = metadataUserId || fallbackUserId;
  if (candidateUserId) {
    return candidateUserId;
  }

  if (!customerId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });

  return user?.id ?? null;
};

const writeAuditLog = async (
  action: string,
  userId: string | null,
  metadata: Record<string, unknown>
) => {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      metadata: metadata as unknown as Prisma.InputJsonValue,
    },
  });
};

const upsertSubscription = async (
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null
) => {
  const firstSubscriptionItem = subscription.items.data[0];
  const stripeCustomerId = getCustomerId(subscription.customer);
  const stripePriceId = subscription.items.data[0]?.price?.id;
  const planTier = getPlanForStripePriceId(stripePriceId);

  if (!planTier) {
    console.warn('[stripe/webhook] Unknown price id for subscription:', stripePriceId);
    return null;
  }

  const userId = await findUserId(
    stripeCustomerId,
    subscription.metadata?.userId,
    fallbackUserId ?? null
  );

  if (!userId) {
    console.warn('[stripe/webhook] Could not resolve user id for subscription:', subscription.id);
    return null;
  }

  const subscriptionStatus = mapSubscriptionStatus(subscription.status);

  if (stripeCustomerId) {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  await prisma.subscription.upsert({
    where: { subscriptionId: subscription.id },
    create: {
      userId,
      planTier,
      status: subscriptionStatus,
      subscriptionId: subscription.id,
      customerId: stripeCustomerId ?? '',
      priceId: stripePriceId ?? '',
      currentPeriodStart: fromUnixTime(firstSubscriptionItem?.current_period_start),
      currentPeriodEnd: fromUnixTime(firstSubscriptionItem?.current_period_end),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      canceledAt: fromUnixTime(subscription.canceled_at),
      metadata: subscription.metadata as unknown as Prisma.InputJsonValue,
    },
    update: {
      userId,
      planTier,
      status: subscriptionStatus,
      customerId: stripeCustomerId ?? '',
      priceId: stripePriceId ?? '',
      currentPeriodStart: fromUnixTime(firstSubscriptionItem?.current_period_start),
      currentPeriodEnd: fromUnixTime(firstSubscriptionItem?.current_period_end),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      canceledAt: fromUnixTime(subscription.canceled_at),
      metadata: subscription.metadata as unknown as Prisma.InputJsonValue,
    },
  });

  await syncUserPlanFromBilling(userId);

  return {
    userId,
    planTier,
    subscriptionId: subscription.id,
  };
};

const persistPaymentLedgerEntry = async (
  eventId: string,
  userId: string,
  payload: {
    subscriptionId?: string | null;
    stripeInvoiceId?: string | null;
    amount: number;
    currency: string;
    status: string;
    metadata?: Record<string, unknown>;
  }
) => {
  await prisma.payment.create({
    data: {
      userId,
      subscriptionId: payload.subscriptionId ?? null,
      stripeInvoiceId: payload.stripeInvoiceId ?? null,
      stripeEventId: eventId,
      amount: payload.amount,
      currency: payload.currency,
      status: payload.status,
      metadata: payload.metadata as unknown as Prisma.InputJsonValue,
    },
  });
};

const persistInvoice = async (invoice: Stripe.Invoice, eventId: string, eventType: string) => {
  const stripeCustomerId = getCustomerId(invoice.customer);
  const userId = await findUserId(stripeCustomerId, invoice.metadata?.userId, null);

  if (!userId) {
    return null;
  }

  const subscriptionFromParent = invoice.parent?.subscription_details?.subscription;
  const stripeSubscriptionId =
    typeof subscriptionFromParent === 'string'
      ? subscriptionFromParent
      : subscriptionFromParent?.id;

  await prisma.billingInvoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      userId,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status ?? 'unknown',
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      periodStart: fromUnixTime(invoice.period_start),
      periodEnd: fromUnixTime(invoice.period_end),
    },
    update: {
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status ?? 'unknown',
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      periodStart: fromUnixTime(invoice.period_start),
      periodEnd: fromUnixTime(invoice.period_end),
    },
  });

  await persistPaymentLedgerEntry(eventId, userId, {
    subscriptionId: stripeSubscriptionId,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: toUpperStatus(eventType),
    metadata: {
      invoiceStatus: invoice.status,
      billingReason: invoice.billing_reason,
    },
  });

  return {
    userId,
    stripeSubscriptionId,
    stripeInvoiceId: invoice.id,
  };
};

const markEventAsProcessed = async (eventId: string, eventType: string) => {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        id: eventId,
        type: eventType,
      },
    });
    return true;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2002') {
      return false;
    }

    throw error;
  }
};

type WebhookEventHandler = (event: Stripe.Event, stripe: Stripe) => Promise<void>;

const handleCheckoutSessionCompleted: WebhookEventHandler = async (event, stripe) => {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  if (checkoutSession.mode !== 'subscription' || !checkoutSession.subscription) {
    return;
  }

  const subscriptionId =
    typeof checkoutSession.subscription === 'string'
      ? checkoutSession.subscription
      : checkoutSession.subscription.id;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const synced = await upsertSubscription(subscription, checkoutSession.client_reference_id);

  if (!synced) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: synced.userId },
    select: { email: true, name: true },
  });

  await persistPaymentLedgerEntry(event.id, synced.userId, {
    subscriptionId,
    stripeInvoiceId: null,
    amount: checkoutSession.amount_total ?? 0,
    currency: checkoutSession.currency ?? 'usd',
    status: 'CHECKOUT_SESSION_COMPLETED',
    metadata: {
      checkoutSessionId: checkoutSession.id,
      planTier: synced.planTier,
    },
  });

  if (user?.email) {
    const template = paymentConfirmationTemplate(user.name, synced.planTier);
    await sendEmail(user.email, template.subject, template.html, {
      userId: synced.userId,
      templateName: 'payment_confirmation',
    });
  }

  await writeAuditLog('stripe.checkout.session.completed', synced.userId, {
    eventId: event.id,
    subscriptionId,
    planTier: synced.planTier,
  });
};

const handleSubscriptionEvent: WebhookEventHandler = async (event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const synced = await upsertSubscription(subscription, subscription.metadata?.userId ?? null);

  if (!synced) {
    return;
  }

  if (event.type === 'customer.subscription.deleted') {
    await prisma.user.update({
      where: { id: synced.userId },
      data: {
        planTier: 'FREE',
        consultationsUsed: 0,
        consultationsResetAt: getCurrentCycleStart(),
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: synced.userId },
      select: { email: true, name: true },
    });

    if (user?.email) {
      const template = subscriptionCancelledTemplate(user.name);
      await sendEmail(user.email, template.subject, template.html, {
        userId: synced.userId,
        templateName: 'subscription_cancelled',
      });
    }
  }

  await writeAuditLog(`stripe.${event.type}`, synced.userId, {
    eventId: event.id,
    subscriptionId: synced.subscriptionId,
    planTier: synced.planTier,
    status: subscription.status,
  });
};

const handleInvoiceEvent: WebhookEventHandler = async (event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const persisted = await persistInvoice(invoice, event.id, event.type);

  if (!persisted?.stripeSubscriptionId) {
    return;
  }

  if (event.type === 'invoice.payment_failed') {
    await prisma.subscription.updateMany({
      where: { subscriptionId: persisted.stripeSubscriptionId },
      data: {
        status: 'PAST_DUE',
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: persisted.userId },
      select: { email: true, name: true },
    });

    if (user?.email) {
      const template = paymentFailedTemplate(user.name);
      await sendEmail(user.email, template.subject, template.html, {
        userId: persisted.userId,
        templateName: 'payment_failed',
      });
    }
  }

  await writeAuditLog(`stripe.${event.type}`, persisted.userId, {
    eventId: event.id,
    stripeInvoiceId: persisted.stripeInvoiceId,
    subscriptionId: persisted.stripeSubscriptionId,
  });
};

const parsePositiveInt = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const handlePaymentIntentSucceeded: WebhookEventHandler = async (event) => {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  if (paymentIntent.metadata?.type !== 'credit_topup') {
    return;
  }

  const userId = await findUserId(
    getCustomerId(paymentIntent.customer),
    paymentIntent.metadata?.userId ?? null,
    null
  );

  if (!userId) {
    console.warn(
      '[stripe/webhook] Could not resolve user id for credit top-up payment intent:',
      paymentIntent.id
    );
    return;
  }

  const creditsGranted = parsePositiveInt(paymentIntent.metadata?.creditsGranted);
  if (!creditsGranted) {
    console.warn(
      '[stripe/webhook] Missing creditsGranted metadata for credit top-up payment intent:',
      paymentIntent.id
    );
    return;
  }

  await topUp(userId, creditsGranted, paymentIntent.id);

  await persistPaymentLedgerEntry(event.id, userId, {
    subscriptionId: null,
    stripeInvoiceId: null,
    amount: paymentIntent.amount_received || paymentIntent.amount,
    currency: paymentIntent.currency || 'usd',
    status: 'PAYMENT_INTENT_SUCCEEDED',
    metadata: {
      type: 'credit_topup',
      packageId: paymentIntent.metadata?.packageId ?? null,
      paymentIntentId: paymentIntent.id,
      creditsGranted,
    },
  });

  await writeAuditLog('stripe.payment_intent.succeeded.credit_topup', userId, {
    eventId: event.id,
    paymentIntentId: paymentIntent.id,
    creditsGranted,
    amountReceived: paymentIntent.amount_received || paymentIntent.amount,
    packageId: paymentIntent.metadata?.packageId ?? null,
  });
};

const webhookEventHandlers: Partial<Record<Stripe.Event.Type, WebhookEventHandler>> = {
  'checkout.session.completed': handleCheckoutSessionCompleted,
  'customer.subscription.updated': handleSubscriptionEvent,
  'customer.subscription.deleted': handleSubscriptionEvent,
  'invoice.payment_succeeded': handleInvoiceEvent,
  'invoice.payment_failed': handleInvoiceEvent,
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
};

const postHandler = async (request: Request) => {
  const stripe = getStripeClient();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error('[stripe/webhook] Signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  try {
    const shouldProcess = await markEventAsProcessed(event.id, event.type);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    const eventHandler = webhookEventHandlers[event.type];
    if (eventHandler) {
      await eventHandler(event, stripe);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[stripe/webhook] Handler failed:', error);
    await writeAuditLog('stripe.webhook.handler_failed', null, {
      error: error instanceof Error ? error.message : 'Unknown webhook handler error',
    });
    return NextResponse.json({ error: 'Webhook handling failed.' }, { status: 500 });
  }
};

export const POST = withApiRequestAudit(async (request) => postHandler(request));
