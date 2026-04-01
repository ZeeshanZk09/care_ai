import { writeAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/mail';

type AlertInput = {
  subject: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type ChannelDispatchResult = {
  sentEmailCount: number;
  slackDelivered: boolean;
};

const AGENT_ID = 'GPT-5.3-Codex';

const parseRecipients = (value: string | undefined) => {
  if (!value) {
    return [] as string[];
  }

  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
};

const canSendEmail = () => {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

const buildEmailHtml = (subject: string, summary: string, metadata: Record<string, unknown>) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">${subject}</h2>
      <p style="margin-top: 0;">${summary}</p>
      <pre style="white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">${JSON.stringify(metadata, null, 2)}</pre>
    </div>
  `;
};

const sendSlackAlert = async (
  webhookUrl: string | undefined,
  subject: string,
  summary: string,
  metadata: Record<string, unknown>
) => {
  if (!webhookUrl) {
    return false;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: `${subject}\n${summary}\n${JSON.stringify(metadata, null, 2)}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed with status ${response.status}.`);
  }

  return true;
};

const dispatchAlert = async (
  action: string,
  recipients: string[],
  slackWebhook: string | undefined,
  input: AlertInput
): Promise<ChannelDispatchResult> => {
  const occurredAt = new Date().toISOString();
  const metadata: Record<string, unknown> = {
    occurredAt,
    agentId: AGENT_ID,
  };

  if (input.metadata) {
    Object.assign(metadata, input.metadata);
  }

  let sentEmailCount = 0;
  if (recipients.length > 0 && canSendEmail()) {
    for (const recipient of recipients) {
      try {
        await sendEmail(
          recipient,
          input.subject,
          buildEmailHtml(input.subject, input.summary, metadata),
          {
            templateName: action,
            metadata,
          }
        );
        sentEmailCount += 1;
      } catch (error) {
        await writeAuditLog({
          action: `${action}.email_failed`,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: {
            ...metadata,
            recipient,
            error: error instanceof Error ? error.message : 'Unknown email dispatch error',
          },
        });
      }
    }
  }

  let slackDelivered = false;
  try {
    slackDelivered = await sendSlackAlert(slackWebhook, input.subject, input.summary, metadata);
  } catch (error) {
    await writeAuditLog({
      action: `${action}.slack_failed`,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        ...metadata,
        error: error instanceof Error ? error.message : 'Unknown slack dispatch error',
      },
    });
  }

  await writeAuditLog({
    action: `${action}.dispatched`,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      ...metadata,
      recipients,
      sentEmailCount,
      slackDelivered,
    },
  });

  return {
    sentEmailCount,
    slackDelivered,
  };
};

export const notifySecurityAlert = async (input: AlertInput) => {
  const recipients = parseRecipients(process.env.SECURITY_ALERT_EMAILS);
  return dispatchAlert(
    'security.alert',
    recipients,
    process.env.SECURITY_ALERT_SLACK_WEBHOOK_URL,
    input
  );
};

export const notifyRevenueAlert = async (input: AlertInput) => {
  const recipients = parseRecipients(process.env.RISK_ALERT_EMAILS);
  return dispatchAlert(
    'revenue.alert',
    recipients,
    process.env.RISK_ALERT_SLACK_WEBHOOK_URL,
    input
  );
};
