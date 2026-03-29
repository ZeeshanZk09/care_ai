'use client';
import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { JsonValue } from '@/lib/generated/prisma/internal/prismaNamespace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff } from 'lucide-react';

interface VapiWidgetProps {
  apiKey: string;
  assistantId: string;
  config?: Record<string, unknown>;
  agent: {
    sessionId: string;
    id: string;
    userId: string;
    notes: string | null;
    selectedDoctor: JsonValue;
    conversation: JsonValue;
    report: string | null;
    createdAt: Date;
  };
}

export default function MedicalCallInterface({
  apiKey,
  assistantId,
  agent,
}: Readonly<VapiWidgetProps>) {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentRole, setCurrentRole] = useState<'user' | 'assistant' | null>('user');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [messages, setMessages] = useState<
    {
      role: string;
      content: string;
    }[]
  >([]);
  const [mounted, setMounted] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const doctorObj = agent.selectedDoctor as any;

  // Retrieve the original voiceId from the selectedDoctor object (like 'Abeo', 'Valentina', etc.)
  const doctorVoiceId = doctorObj?.voiceId;

  // Let's map your doctor list `voiceId` names directly to actual valid Vapi-supported voices
  // Here we use realistic Cartesia or 11labs voices that map closely to your doctors:
  const getVoiceFromDoctorId = (voiceName: string, gender: string) => {
    // If you already set realistic IDs in your dashboard assistant, we just override with these valid ones:
    const voiceMapping: Record<string, any> = {
      // Male List
      Abeo: { provider: '11labs', voiceId: 'TxGEqnHWrfWFTfGW9XjX' }, // Josh
      Arjun: { provider: '11labs', voiceId: 'pNInz6obpgDQGcFmaJgB' }, // Adam
      Rehaan: { provider: '11labs', voiceId: 'ErXwobaYiN019PkySvjV' }, // Antoni
      Priyom: { provider: '11labs', voiceId: 'VR6AewLTigWG4xSOukaG' }, // Arnold
      Aled: { provider: '11labs', voiceId: 'N2lVS1wCG1ATwxgiokNj' }, // Callum
      Claude: { provider: '11labs', voiceId: 'bVMeCyTHy58xNoL34h3p' }, // Jeremy
      Namminh: { provider: '11labs', voiceId: 'yoZ06aBxZCG2GDBsNNEL' }, // Sam
      Jason: { provider: '11labs', voiceId: 'Yko7PKHZNXotIFB8qWAe' }, // Matthew
      Marcelo: { provider: '11labs', voiceId: 'cjVigY5qzO86HvfPbOS6' }, // Michael

      // Female List
      Aashi: { provider: '11labs', voiceId: '21m00Tcm4TlvDq8ikWAM' }, // Rachel
      Aarti: { provider: '11labs', voiceId: 'EXAVITQu4vr4xnSDxMaL' }, // Bella
      Valentina: { provider: '11labs', voiceId: 'AZnzlk1XvdvUeBnXmlld' }, // Domi
      Poala: { provider: '11labs', voiceId: 'MF3mGyEYCl7XYWbV9V6O' }, // Elli
      Hemkala: { provider: '11labs', voiceId: 'ThT5KcBeYPX3keUQqHPh' }, // Dorothy
      Kavya: { provider: '11labs', voiceId: 'LcfcDJNUP1GQjkzn1xUU' }, // Emily
      Sara: { provider: '11labs', voiceId: 'Xb7hH8MSALEjdBALMd1s' }, // Charlotte
      Isabella: { provider: '11labs', voiceId: 'pFZP5JQG7iQjI1NC20sA' }, // Lily
      Bella: { provider: '11labs', voiceId: 'EXAVITQu4vr4xnSDxMaL' }, // Bella
      Hiugaai: { provider: '11labs', voiceId: 'jBpfuIE2acCO8z3wKNLl' }, // Gigi
      Sofia: { provider: '11labs', voiceId: 'XB0fDUnXU5pwyYlzE395' }, // Freya
      Francisca: { provider: '11labs', voiceId: 'pMsXgVXv3Bld0AEl6hE3' }, // Grace
      Petra: { provider: '11labs', voiceId: 't0jbNlBVZ17f02VDIeMI' }, // Jessie
    };

    if (voiceMapping[voiceName]) {
      return voiceMapping[voiceName];
    }

    // Fallbacks if voiceId doesn't match predefined mapped ones
    if (gender === 'male') {
      return { provider: '11labs' as const, voiceId: 'TxGEqnHWrfWFTfGW9XjX' };
    }
    return { provider: '11labs' as const, voiceId: '21m00Tcm4TlvDq8ikWAM' };
  };

  const selectedVoice = getVoiceFromDoctorId(doctorVoiceId, doctorObj?.gender);

  const overrides = {
    firstMessage: `Hello, I am ${doctorObj?.voiceId || 'your AI medical assistant'}. How can I help you today?`,
    voice: selectedVoice,
    // name: 'AI Medical Doctor Voice Agent',
    // firstMessage: `Hello, I am ${doctorObj?.voiceId || 'your AI medical assistant'}. How can I help you today?`,
    // transcriber: {
    //   provider: 'assembly-ai',
    //   language: 'en',
    // },
    // voice: {
    //   provider: 'playht',
    //   voiceId: (agent.selectedDoctor as any)?.voiceId || 'Joanna',
    // },
    // model: {
    //   provider: 'openai',
    //   model: 'gpt-4',
    //   message: [
    //     {
    //       role: 'system',
    //       content: (agent.selectedDoctor as any).agentPrompt,
    //     },
    //   ],
    // },
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const vapiInstance = new Vapi(apiKey);
    setVapi(vapiInstance);

    // Event listeners
    vapiInstance.on('call-start', () => {
      console.log('Call started');
      setIsConnected(true);
    });

    vapiInstance.on('call-end', () => {
      console.log('Call ended');
      setIsConnected(false);
      setIsSpeaking(false);
    });

    vapiInstance.on('speech-start', () => {
      console.log('Assistant started speaking');
      setIsSpeaking(true);
      setCurrentRole('assistant');
    });

    vapiInstance.on('speech-end', () => {
      console.log('Assistant stopped speaking');
      setIsSpeaking(false);
      setCurrentRole('user');
    });

    vapiInstance.on('message', (message) => {
      if (message.type === 'transcript') {
        const { role, transcript, transcriptType } = message;

        if (transcriptType == 'partial') {
          setLiveTranscript(transcript);
          setCurrentRole(role);
        } else if (transcriptType === 'final') {
          // Final transcript
          setMessages((prev) => [
            ...prev,
            {
              role,
              content: transcript,
            },
          ]);
          setLiveTranscript('');
          setCurrentRole(null);
        }
      }
    });

    vapiInstance.on('error', (error) => {
      try {
        if (error instanceof Error) {
          console.error('Vapi error:', error.stack ?? error.message);
        } else if (error && typeof error === 'object') {
          const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
          console.error('Vapi error (object):', serialized);
        } else {
          console.error('Vapi error:', String(error));
        }
      } catch (e) {
        console.error('Vapi error (could not serialize):', error);
      }
    });

    return () => {
      vapiInstance?.stop();
    };
  }, [apiKey]);

  // Keep the messages view scrolled to the latest message
  useEffect(() => {
    if (!endRef.current) return;
    try {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      // ignore
    }
  }, [messages, liveTranscript, isSpeaking]);

  if (!mounted) return null;

  const startCall = () => {
    if (!vapi) return;

    // Ensure the browser supports audio input and request microphone permission
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    ) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Close the initial stream so Daily can acquire it smoothly without conflict
          stream.getTracks().forEach((track) => track.stop());
          vapi.start(assistantId, overrides as any);
        })
        .catch((err) => {
          console.error('Microphone access denied or unavailable:', err);
          // Do not auto-fallback to starting without audio. Let the user choose.
          setMicPermissionDenied(true);
        });
    } else {
      console.warn(
        'Browser does not support microphone input (navigator.mediaDevices.getUserMedia).'
      );
      // Let the user decide to continue without audio
      setMicPermissionDenied(true);
    }
  };

  const startCallWithoutMic = () => {
    if (!vapi) return;

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      })
      .catch((e) => {
        console.warn('Mic access warned or denied, proceeding anyway', e);
      });

    try {
      // small delay to allow Vapi to be ready
      setTimeout(() => {
        vapi.start(assistantId, overrides as any);
      }, 100);
      setMicPermissionDenied(false);
    } catch (e) {
      console.error('Failed to start Vapi without audio:', e);
    }
  };

  const endCall = () => {
    if (vapi) {
      vapi.stop();
    }
  };

  const initials = (agent.selectedDoctor as any)?.voiceId
    ? (agent.selectedDoctor as any).voiceId
        .split(' ')
        .map((word: string) => word[0])
        .join('')
    : 'DA';

  const formattedTime = agent.createdAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className='min-h-[80vh] w-full min-w-xs sm:min-w-lg xl:min-w-5xl mx-auto shadow-lg flex flex-col justify-between '>
      <div className='space-y-4'>
        <CardContent className='space-y-4'>
          {/* Call status indicator */}
          <div className='flex justify-between items-center border-b pb-4'>
            <div className='flex items-center gap-2'>
              <div
                className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}
              />
              <span className='text-sm font-medium'>{isConnected ? 'In Call' : 'Not in Call'}</span>
            </div>
            {isConnected && (
              <span className='font-mono text-sm tabular-nums text-muted-foreground'>
                {formattedTime}
              </span>
            )}
          </div>
        </CardContent>

        <CardHeader className='pb-2'>
          <div className='flex flex-col text-center items-center justify-center gap-4'>
            <Avatar className='size-20 border-2 border-primary/10'>
              <AvatarImage src={(agent?.selectedDoctor as any)?.image || '/doctors/default.png'} />
              <AvatarFallback className='bg-primary/10 text-primary'>{initials}</AvatarFallback>
            </Avatar>
            <div className='space-y-1'>
              <h2 className='text-xl font-semibold tracking-tight'>
                {(agent?.selectedDoctor as any)?.voiceId || 'Dr. Assistant'}
              </h2>
              <Badge variant={'outline'} className='text-xs'>
                {(agent?.selectedDoctor as any)?.specialist || 'General Physician'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </div>

      {/* Live Conversation */}

      <div className='space-y-4'>
        <CardContent className='space-y-4'>
          <div className='max-h-76 overflow-y-auto px-2 py-4 border rounded-lg bg-muted flex flex-col gap-3 text-center'>
            {messages.length === 0 && (
              <p className='text-center text-sm text-muted-foreground'>No conversation yet...</p>
            )}
            {messages?.slice(-4).map((entry, index) => (
              <div key={index} className='text-sm italic text-muted-foreground'>
                <p className='text-sm'>
                  <span
                    className={`font-mono text-xs tabular-nums ${entry.role === 'assistant' ? 'text-primary' : 'text-secondary'}`}
                  >
                    {entry.role}
                  </span>
                  : {entry.content}
                </p>
              </div>
            ))}
            {isSpeaking && liveTranscript && (
              <div className={`p-3 rounded-lg w-full bg-primary/10 self-start animate-pulse`}>
                {liveTranscript?.length > 0 && (
                  <p
                    className={`p-3 rounded-lg w-full ${currentRole === 'assistant' ? 'bg-primary/10 self-start' : 'bg-secondary/10 self-end'}`}
                  >
                    {currentRole} : {liveTranscript}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </div>

      <CardFooter className='flex flex-col gap-3 pt-2'>
        {micPermissionDenied ? (
          <div className='space-y-2'>
            <p className='text-sm text-yellow-700'>
              Microphone access was denied or is unavailable. You can retry granting access or
              continue without a microphone.
            </p>
            <div className='flex gap-2'>
              <Button
                onClick={() => {
                  // Retry requesting mic permission
                  setMicPermissionDenied(false);
                  startCall();
                }}
                className='flex-1'
                variant='default'
              >
                Retry Microphone
              </Button>
              <Button
                onClick={() => {
                  startCallWithoutMic();
                }}
                className='flex-1'
                variant='destructive'
              >
                Continue Without Microphone
              </Button>
            </div>
          </div>
        ) : (
          <div className='flex justify-between gap-3'>
            <Button
              onClick={() => {
                startCall();
              }}
              disabled={isConnected}
              className='flex-1'
              variant='default'
            >
              <Phone className='mr-2 h-4 w-4' />
              Start Call
            </Button>

            <Button
              onClick={() => {
                setIsConnected(false);
                endCall();
              }}
              disabled={!isConnected}
              className='flex-1'
              variant='destructive'
            >
              <PhoneOff className='mr-2 h-4 w-4' />
              End Call
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
