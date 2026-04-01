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
  planTier: string,
): EmailTemplate => {
  return {
    subject: "Payment confirmed for your CareAI subscription",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>Your payment was successful and your <strong>${planTier}</strong> plan is now active.</p>
      <p>Premium model activation may take 1 to 2 working days. We will notify you when it is complete.</p>
    `),
  };
};

export const premiumActivatedTemplate = (
  name: string | null,
): EmailTemplate => {
  return {
    subject: "Your premium AI models are now active",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>Your premium AI models have been activated. You now have full access to advanced consultation capabilities.</p>
      <p>Thank you for upgrading with CareAI.</p>
    `),
  };
};

export const paymentFailedTemplate = (name: string | null): EmailTemplate => {
  return {
    subject: "Payment failed for your CareAI subscription",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>We were unable to process your latest subscription payment.</p>
      <p>Please update your billing details in the billing portal to avoid service interruption.</p>
    `),
  };
};

export const accountRestrictedTemplate = (
  name: string | null,
  reason: string,
  expiresAt?: string | null,
): EmailTemplate => {
  return {
    subject: "Your CareAI account has been restricted",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>Your account access is currently restricted.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Restriction ends:</strong> ${expiresAt ?? "Not specified"}</p>
      <p>Please contact support if you believe this is incorrect.</p>
    `),
  };
};

export const accountBlockedTemplate = (
  name: string | null,
  reason: string,
): EmailTemplate => {
  return {
    subject: "Your CareAI account has been blocked",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>Your account has been blocked and sign-in is disabled.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Contact support to discuss restoration options.</p>
    `),
  };
};

export const subscriptionCancelledTemplate = (
  name: string | null,
): EmailTemplate => {
  return {
    subject: "Your CareAI subscription was cancelled",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>Your subscription has been cancelled and your account has been moved to the Free plan.</p>
      <p>You can reactivate paid features anytime from the pricing page.</p>
    `),
  };
};

export const monthlyUsageSummaryTemplate = (
  name: string | null,
  used: number,
  limit: number,
): EmailTemplate => {
  return {
    subject: "Your monthly CareAI usage summary",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>This month you used <strong>${used}</strong> out of <strong>${limit}</strong> consultations.</p>
      <p>Visit your dashboard to review your activity and plan details.</p>
    `),
  };
};

export const freeToPaidCampaignTemplate = (
  name: string | null,
  topic: string,
  offerEndsOn: string,
  upgradeUrl: string,
): EmailTemplate => {
  return {
    subject: `CareAI weekly update: ${topic} + 30% off Pro for 7 days`,
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>This week we are highlighting: <strong>${topic}</strong>.</p>
      <p>Upgrade to Pro with code <strong>CARE30</strong> and get 30% off for 7 days.</p>
      <p><strong>Offer ends:</strong> ${offerEndsOn}</p>
      <p><a href="${upgradeUrl}">Upgrade your plan</a></p>
    `),
  };
};

export const freeUserOnboardingTemplate = (
  name: string | null,
  day: 0 | 2 | 4 | 6 | 7,
  dashboardUrl: string,
): EmailTemplate => {
  const pricingUrl = dashboardUrl.replace(/\/dashboard(?:\/)?$/, '/pricing');

  const dayCopy: Record<
    0 | 2 | 4 | 6 | 7,
    {
      subject: string;
      body: string;
      ctaLabel: string;
      ctaUrl: string;
    }
  > = {
    0: {
      subject: 'CareAI Day 0: Welcome and quick feature tour',
      body: 'Welcome to CareAI. Take a 2-minute product tour and see how to start your first symptom-focused consultation today.',
      ctaLabel: 'Open Feature Tour',
      ctaUrl: dashboardUrl,
    },
    2: {
      subject: 'CareAI Day 2: Start your first consultation',
      body: 'Your first consultation takes only a few minutes and helps unlock better specialist routing on your next sessions.',
      ctaLabel: 'Start Consultation',
      ctaUrl: dashboardUrl,
    },
    4: {
      subject: 'CareAI Day 4: See how users improve outcomes',
      body: 'Users who add clear symptom notes and complete follow-up prompts consistently receive stronger recommendations and faster next steps.',
      ctaLabel: 'Continue Consultation',
      ctaUrl: dashboardUrl,
    },
    6: {
      subject: 'CareAI Day 6: Time-bound CARE30 offer expires soon',
      body: 'Upgrade now with code CARE30 to unlock better report quality and avoid free-tier interruptions. This offer is time-bound.',
      ctaLabel: 'Claim CARE30 Offer',
      ctaUrl: pricingUrl,
    },
    7: {
      subject: 'CareAI Day 7: Final CTA with plan comparison',
      body: 'Final reminder: compare plans and pick the best fit for your monthly consultation volume and report quality needs.',
      ctaLabel: 'Compare Plans',
      ctaUrl: pricingUrl,
    },
  };

  const selected = dayCopy[day];
  const includeComparisonTable = day === 7;
  const comparisonTable = includeComparisonTable
    ? `
      <table style="border-collapse: collapse; width: 100%; margin-top: 12px;">
        <thead>
          <tr>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Plan</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Consultations</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Report Quality</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Free</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">10 one-time</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Standard</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Basic</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">50 / month</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Advanced</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Pro</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Unlimited</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px;">Comprehensive</td>
          </tr>
        </tbody>
      </table>
    `
    : '';

  return {
    subject: selected.subject,
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>${selected.body}</p>
      ${comparisonTable}
      <p><a href="${selected.ctaUrl}">${selected.ctaLabel}</a></p>
    `),
  };
};

export const abandonedConsultationReminderTemplate = (
  name: string | null,
  dashboardUrl: string,
): EmailTemplate => {
  return {
    subject: "Complete your CareAI consultation",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>It looks like you started a consultation but did not finish it.</p>
      <p>Resume now to receive your consultation report and next-step guidance.</p>
      <p><a href="${dashboardUrl}">Resume consultation</a></p>
    `),
  };
};

export const disengagementSurveyTemplate = (
  name: string | null,
  surveyQuestions: string[],
  dashboardUrl: string,
): EmailTemplate => {
  const questionMarkup = surveyQuestions
    .map((question, index) => `<li>${index + 1}. ${question}</li>`)
    .join("");

  return {
    subject: "Quick 2-minute CareAI feedback request",
    html: wrapTemplate(`
      <p>Hi ${name ?? "there"},</p>
      <p>You were active last month and we would value your feedback to improve consultations.</p>
      <ol>${questionMarkup}</ol>
      <p>You can reply directly to this email or continue in dashboard:</p>
      <p><a href="${dashboardUrl}">Open dashboard</a></p>
    `),
  };
};
