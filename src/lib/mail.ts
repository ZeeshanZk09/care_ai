import nodemailer from "nodemailer";
import { requireEmailEnv } from "@/env";
import { writeAuditLog } from "@/lib/audit";

type SendEmailOptions = {
  userId?: string | null;
  templateName?: string;
  metadata?: Record<string, unknown>;
};

let mailTransporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!mailTransporter) {
    const { EMAIL_USER: user, EMAIL_PASS: pass } = requireEmailEnv();

    mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  return mailTransporter;
};

const getFromAddress = () => {
  const { EMAIL_USER: user, EMAIL_FROM_NAME: fromName } = requireEmailEnv();

  if (fromName) {
    return `${fromName} <${user}>`;
  }

  return user;
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  options?: SendEmailOptions,
) => {
  try {
    const client = getTransporter();
    const result = await client.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html,
    });

    const dispatchMetadata: Record<string, unknown> = {
      recipient: to,
      subject,
      templateName: options?.templateName ?? "custom",
      provider: "nodemailer",
      providerMessageId: result.messageId ?? null,
    };

    if (options?.metadata) {
      Object.assign(dispatchMetadata, options.metadata);
    }

    await writeAuditLog({
      userId: options?.userId,
      action: "email.dispatched",
      metadata: dispatchMetadata,
    });

    return result;
  } catch (error) {
    await writeAuditLog({
      userId: options?.userId,
      action: "email.dispatch_failed",
      metadata: {
        recipient: to,
        subject,
        templateName: options?.templateName ?? "custom",
        provider: "nodemailer",
        error: error instanceof Error ? error.message : "Unknown email error",
      },
    });

    throw error;
  }
};
