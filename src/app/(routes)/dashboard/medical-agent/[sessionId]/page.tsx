import { getMedicalVoiceAgentBySessionId } from '@/lib/actions/medical-voice-agent';
import MedicalCallInterface from './MedicalCallInterface';
import { notFound } from 'next/navigation';
import { vapi } from '../../../../../../config/vapi';

export default async function MedicalVoiceAgent({
  params,
}: Readonly<{
  params: Promise<{ sessionId: string }>;
}>) {
  const { sessionId } = await params;

  const agent = await getMedicalVoiceAgentBySessionId(sessionId);

  console.log(agent);
  if (!agent) {
    return notFound();
  }

  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!;
  const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!;

  if (!assistantId || !apiKey) {
    return (
      <div className='p-4 bg-red-100 text-red-700 rounded'>
        VAPI configuration is missing. Please set the environment variables.
      </div>
    );
  }

  return (
    <div className='w-full mb-10'>
      <MedicalCallInterface agent={agent} assistantId={assistantId} apiKey={apiKey} />
    </div>
  );
}
