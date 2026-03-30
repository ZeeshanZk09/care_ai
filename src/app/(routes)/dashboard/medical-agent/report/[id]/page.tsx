import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

type ChatMessage = {
  role: string;
  content: string;
};

type JsonRecord = Record<string, unknown>;

const isJsonRecord = (value: unknown): value is JsonRecord => {
  return value !== null && typeof value === 'object';
};

const appendMessage = (messages: ChatMessage[], role: string, content: unknown) => {
  if (typeof content !== 'string') {
    return;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return;
  }

  messages.push({ role, content: trimmed });
};

const parseTranscriptArray = (rows: unknown[]): ChatMessage[] => {
  const messages: ChatMessage[] = [];
  for (const item of rows) {
    if (!isJsonRecord(item)) {
      continue;
    }

    const role = typeof item.role === 'string' ? item.role : 'assistant';
    appendMessage(messages, role, item.content);
  }

  return messages;
};

const parseConversationObject = (conversation: unknown): ChatMessage[] => {
  if (!isJsonRecord(conversation)) {
    return [];
  }

  const messages: ChatMessage[] = [];
  appendMessage(messages, 'user', conversation.input);

  if (Array.isArray(conversation.output)) {
    messages.push(...parseTranscriptArray(conversation.output));
    return messages;
  }

  appendMessage(messages, 'assistant', conversation.output);
  return messages;
};

const normalizeConversation = (conversation: unknown, notes?: string | null): ChatMessage[] => {
  const messages = Array.isArray(conversation)
    ? parseTranscriptArray(conversation)
    : parseConversationObject(conversation);

  if (messages.length === 0) {
    appendMessage(messages, 'user', notes);
  }

  return messages;
};

export default async function ReportPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const { id } = await params;

  const reportSession = await prisma.chatSession.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ id }, { sessionId: id }],
    },
  });

  if (!reportSession) {
    notFound();
  }

  const doctor = (reportSession.selectedDoctor ?? {}) as JsonRecord;
  const doctorName = typeof doctor.voiceId === 'string' ? doctor.voiceId : 'Dr. Assistant';
  const doctorSpecialist =
    typeof doctor.specialist === 'string' ? doctor.specialist : 'General Physician';
  const doctorImage = typeof doctor.image === 'string' ? doctor.image : '/doctors/default.png';

  const chatMessages = normalizeConversation(reportSession.conversation, reportSession.notes);

  return (
    <section className='mx-auto my-8 w-full max-w-4xl px-4'>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold'>Consultation Report</h1>
          <p className='text-sm text-muted-foreground'>
            Session ID: {reportSession.sessionId} •{' '}
            {new Date(reportSession.createdAt).toLocaleString()}
          </p>
        </div>

        <Link
          href='/dashboard'
          className='rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted'
        >
          Back to Dashboard
        </Link>
      </div>

      <div className='mb-6 rounded-xl border border-border bg-card p-4'>
        <div className='flex items-center gap-3'>
          <Image
            src={doctorImage}
            alt={doctorName}
            width={48}
            height={48}
            className='h-12 w-12 rounded-full object-cover'
          />
          <div>
            <p className='font-semibold leading-none'>{doctorName}</p>
            <p className='text-sm text-muted-foreground'>{doctorSpecialist}</p>
          </div>
        </div>

        {reportSession.notes ? (
          <div className='mt-4 rounded-lg bg-muted p-3'>
            <p className='mb-1 text-xs font-semibold uppercase text-muted-foreground'>
              Initial Notes
            </p>
            <p className='text-sm'>{reportSession.notes}</p>
          </div>
        ) : null}

        {reportSession.report ? (
          <div className='mt-3 rounded-lg bg-muted p-3'>
            <p className='mb-1 text-xs font-semibold uppercase text-muted-foreground'>
              Report Summary
            </p>
            <p className='text-sm'>{reportSession.report}</p>
          </div>
        ) : null}
      </div>

      <div className='rounded-xl border border-border bg-card p-4'>
        <h2 className='mb-4 text-lg font-semibold'>Complete Chat</h2>

        {chatMessages.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No chat messages found for this consultation.
          </p>
        ) : (
          <div className='flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1'>
            {chatMessages.map((message, index) => {
              const isAssistant = message.role === 'assistant';
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-lg p-3 text-sm ${isAssistant ? 'bg-primary/10' : 'bg-secondary/10'}`}
                >
                  <p className='mb-1 text-xs font-semibold uppercase text-muted-foreground'>
                    {isAssistant ? doctorName : 'You'}
                  </p>
                  <p className='whitespace-pre-wrap leading-relaxed text-foreground'>
                    {message.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
