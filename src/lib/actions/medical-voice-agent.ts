'use server';
import prisma from '../prisma';

async function getMedicalVoiceAgentBySessionId(sessionId: string) {
  try {
    const agent = await prisma.chatSession.findUnique({
      where: { sessionId },
    });
    return agent;
  } catch (error) {
    console.error(
      `[getMedicalVoiceAgentBySessionId] Error fetching agent for sessionId ${sessionId}:`,
      error
    );
    return null;
  }
}

export { getMedicalVoiceAgentBySessionId };
