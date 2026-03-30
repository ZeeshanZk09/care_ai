type EmailTemplate = {
  subject: string;
  html: string;
};

const wrapTemplate = (content: string) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <div style="max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <h2 style="margin-top: 0; color: #111827;">CareAI</h2>
        ${content}
        <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
          If you did not request this update, please contact support immediately.
        </p>
      </div>
    </div>
  `;
};

export const paymentConfirmationTemplate = (
  name: string | null,
  planTier: string
): EmailTemplate => {
  return {
    subject: 'Payment confirmed for your CareAI subscription',
    html: wrapTemplate(`
      <p>Hi ${name ?? 'there'},</p>
      <p>Your payment was successful and your <strong>${planTier}</strong> plan is now active.</p>
      <p>Premium model activation may take 1 to 2 working days. We will notify you when it is complete.</p>
    `),
  };
};

export const premiumActivatedTemplate = (name: string | null): EmailTemplate => {
  return {
    subject: 'Your premium AI models are now active',
    html: wrapTemplate(`
      <p>Hi ${name ?? 'there'},</p>
      <p>Your premium AI models have been activated. You now have full access to advanced consultation capabilities.</p>
      <p>Thank you for upgrading with CareAI.</p>
    `),
  };
};

export const paymentFailedTemplate = (name: string | null): EmailTemplate => {
  return {
    subject: 'Payment failed for your CareAI subscription',
    html: wrapTemplate(`
      <p>Hi ${name ?? 'there'},</p>
      <p>We were unable to process your latest subscription payment.</p>
      <p>Please update your billing details in the billing portal to avoid service interruption.</p>
    `),
  };
};

export const accountRestrictedTemplate = (
  name: string | null,
  reason: string,
  expiresAt?: string | null
): EmailTemplate => {
  return {
    subject: 'Your CareAI account has been restricted',
    html: wrapTemplate(`
      <p>Hi ${name ?? 'there'},</p>
      <p>Your account access is currently restricted.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Restriction ends:</strong> ${expiresAt ?? 'Not specified'}</p>
      <p>Please contact support if you believe this is incorrect.</p>
    `),
  };
};

export const accountBlockedTemplate = (name: string | null, reason: string): EmailTemplate => {
  return {
    subject: 'Your CareAI account has been blocked',
    html: wrapTemplate(`
      <p>Hi ${name ?? 'there'},</p>
      <p>Your account has been blocked and sign-in is disabled.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Contact support to discuss restoration options.</p>
    `),
  };
};

export const subscriptionCancelledTemplate = (name: string | null): EmailTemplate => {
  return {
    subject: 'Your CareAI subscription was cancelled',
    html: wrapTemplate(`
      <p>Hi ${name ?? 'there'},</p>
      <p>Your subscription has been cancelled and your account has been moved to the Free plan.</p>
      <p>You can reactivate paid features anytime from the pricing page.</p>
    `),
  };
};

export const monthlyUsageSummaryTemplate = (
  name: string | null,
  used: number,
  limit: number
): EmailTemplate => {
  return {
    subject: 'Your monthly CareAI usage summary',
    html: wrapTemplate(`
      <p>Hi ${name ?? 'there'},</p>
      <p>This month you used <strong>${used}</strong> out of <strong>${limit}</strong> consultations.</p>
      <p>Visit your dashboard to review your activity and plan details.</p>
    `),
  };
};
