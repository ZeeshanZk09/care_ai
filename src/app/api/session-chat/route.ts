import { auth } from "@/auth";
import {
  EntitlementError,
  checkConsultationAccess,
  consumeConsultationCredit,
  getEntitlementSnapshot,
} from "@/lib/billing/entitlements";
import { getUpgradePromptForHighValueAction } from "@/lib/billing/upgrade-prompts";
import { withApiRequestAudit } from "@/lib/api/request-audit";
import { getClientIp, getUserAgent, writeAuditLog } from "@/lib/audit";
import { AIDoctorAgents } from "@/lib/data/list";
import type { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { NextResponse } from "next/server";
import { z } from "zod";

const AGENT_ID = "GPT-5.3-Codex";

const toInputJsonValue = <T>(value: T): Prisma.InputJsonValue => {
  return value as unknown as Prisma.InputJsonValue;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

type JsonRecord = Record<string, unknown>;

type ConversationMessage = {
  role: string;
  content: string;
};

const putPayloadSchema = z.object({
  sessionId: z.string().min(1),
  conversation: z.unknown().optional(),
});

const postPayloadSchema = z.object({
  notes: z.string().max(1200).optional().default(""),
  selectedDoctor: z.unknown(),
  output: z.unknown().optional(),
});

const normalizeConversationMessages = (
  conversation: unknown,
): ConversationMessage[] => {
  if (!Array.isArray(conversation)) {
    return [];
  }

  return conversation
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as JsonRecord;
      const role = typeof row.role === "string" ? row.role : "";
      const content = typeof row.content === "string" ? row.content.trim() : "";

      if (!role || !content) {
        return null;
      }

      return { role, content };
    })
    .filter((message): message is ConversationMessage => Boolean(message));
};

const buildBasicReport = (messageCount: number): string => {
  return `Consultation completed with ${messageCount} transcript messages recorded.`;
};

const buildProReport = (
  conversation: ConversationMessage[],
  notes: string | null,
): string => {
  const userMessages = conversation.filter(
    (message) => message.role === "user",
  );
  const assistantMessages = conversation.filter(
    (message) => message.role === "assistant",
  );

  const symptoms = userMessages
    .slice(0, 3)
    .map((message) => `- ${message.content}`);
  const guidance = assistantMessages
    .slice(-3)
    .map((message) => `- ${message.content}`);

  return [
    "Comprehensive Consultation Report",
    "",
    "Primary Notes",
    notes?.trim() ? `- ${notes.trim()}` : "- No initial notes provided.",
    "",
    "Symptoms Discussed",
    ...(symptoms.length > 0
      ? symptoms
      : ["- No user symptom transcript captured."]),
    "",
    "Clinical Guidance Shared",
    ...(guidance.length > 0
      ? guidance
      : ["- No assistant guidance transcript captured."]),
    "",
    "Follow-up Recommendation",
    "- Continue with in-person clinical review if symptoms worsen or persist.",
  ].join("\n");
};

const resolveSelectedDoctor = (selectedDoctor: unknown) => {
  if (!selectedDoctor || typeof selectedDoctor !== "object") {
    return null;
  }

  const input = selectedDoctor as JsonRecord as unknown as {
    id?: number;
    specialist?:
      | {
          name?: unknown;
        }
      | string;
  };

  if (typeof input.id === "number") {
    const byId = AIDoctorAgents.find((doctor) => doctor.id === input.id);
    if (byId) {
      return byId;
    }
  }

  if (typeof input.specialist === "string") {
    const specialistKey = input.specialist.toLowerCase();
    return (
      AIDoctorAgents.find(
        (doctor) => doctor.specialist.toLowerCase() === specialistKey,
      ) ?? null
    );
  }

  return null;
};

const putHandler = async (request: Request) => {
  try {
    const csrfErrorResponse = enforceCsrfProtection(request);
    if (csrfErrorResponse) {
      return csrfErrorResponse;
    }

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated." },
        { status: 401 },
      );
    }

    const parsedPayload = putPayloadSchema.safeParse(await request.json());
    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload.",
          issues: parsedPayload.error.issues,
        },
        { status: 400 },
      );
    }

    const { sessionId, conversation } = parsedPayload.data;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 },
      );
    }

    const chatSession = await prisma.chatSession.findFirst({
      where: {
        sessionId,
        userId,
      },
      select: {
        sessionId: true,
        notes: true,
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found." },
        { status: 404 },
      );
    }

    const entitlement = await getEntitlementSnapshot(userId);
    const normalizedConversation = normalizeConversationMessages(conversation);

    let reportText: string | null = null;
    if (normalizedConversation.length > 0) {
      if (entitlement.plan === "PRO") {
        reportText = buildProReport(normalizedConversation, chatSession.notes);
      } else if (entitlement.plan === "BASIC") {
        reportText = buildBasicReport(normalizedConversation.length);
      }
    }

    const updatedSession = await prisma.chatSession.update({
      where: { sessionId },
      data: {
        conversation: normalizedConversation,
        report: reportText,
      },
    });

    await writeAuditLog({
      userId,
      action: reportText
        ? "consultation.completed"
        : "consultation.progress_updated",
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        sessionId,
        planTier: entitlement.plan,
        messageCount: normalizedConversation.length,
        occurredAt: new Date().toISOString(),
        agentId: AGENT_ID,
      },
    });

    return NextResponse.json(updatedSession, { status: 200 });
  } catch (error) {
    console.error("[session-chat] Failed to update chat session:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update chat session.") },
      { status: 500 },
    );
  }
};

const postHandler = async (request: Request) => {
  try {
    const csrfErrorResponse = enforceCsrfProtection(request);
    if (csrfErrorResponse) {
      return csrfErrorResponse;
    }

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated." },
        { status: 401 },
      );
    }

    const parsedPayload = postPayloadSchema.safeParse(await request.json());
    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload.",
          issues: parsedPayload.error.issues,
        },
        { status: 400 },
      );
    }

    const { notes, selectedDoctor, output } = parsedPayload.data;
    const canonicalDoctor = resolveSelectedDoctor(selectedDoctor);

    if (!canonicalDoctor) {
      return NextResponse.json(
        { error: "Selected doctor is invalid. Please choose a doctor again." },
        { status: 400 },
      );
    }

    try {
      const access = await checkConsultationAccess(userId);
      if (access.status === "DENIED") {
        return NextResponse.json(
          {
            error: access.reason ?? "Consultation access denied.",
            code: "CONSULTATION_DENIED",
          },
          { status: 403 },
        );
      }

      const usageSnapshot = await consumeConsultationCredit(userId, {
        requiresPaidPlan: Boolean(canonicalDoctor.subscriptionRequired),
      });

      const upgradePrompt = getUpgradePromptForHighValueAction({
        plan: usageSnapshot.plan,
        consultationsUsed: usageSnapshot.consultationsUsed,
        action: "CONSULTATION",
      });

      const result = await prisma.chatSession.create({
        data: {
          userId,
          sessionId: crypto.randomUUID(),
          notes,
          selectedDoctor: toInputJsonValue(canonicalDoctor),
          conversation: toInputJsonValue({
            input: notes,
            output,
          }),
          report: null,
        },
      });

      await writeAuditLog({
        userId,
        action: "consultation.started",
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: {
          sessionId: result.sessionId,
          planTier: usageSnapshot.plan,
          specialist: canonicalDoctor.specialist,
          premiumAccessPending: access.status === "PREMIUM_PENDING",
          occurredAt: new Date().toISOString(),
          agentId: AGENT_ID,
        },
      });

      return NextResponse.json(
        {
          ...result,
          premiumAccessPending: access.status === "PREMIUM_PENDING",
          upgradePrompt,
        },
        { status: 200 },
      );
    } catch (error) {
      if (error instanceof EntitlementError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode },
        );
      }

      console.error("[session-chat] Failed to create chat session:", error);
      return NextResponse.json(
        { error: "Database write failed." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[session-chat] Failed to create chat session:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create chat session.") },
      { status: 500 },
    );
  }
};

export const PUT = withApiRequestAudit(async (request) => putHandler(request));
export const POST = withApiRequestAudit(async (request) =>
  postHandler(request),
);
