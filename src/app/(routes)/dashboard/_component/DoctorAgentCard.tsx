'use client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function DoctorAgentCard({
  id,
  description,
  image,
  specialist,
  subscriptionRequired,
  voiceId,
  currentPlan,
}: Readonly<{
  agentPrompt: string;
  description: string;
  id: number;
  image: string;
  specialist: string;
  subscriptionRequired: boolean;
  voiceId: string;
  currentPlan: 'FREE' | 'BASIC' | 'PRO';
}>) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isLockedForFreePlan = subscriptionRequired && currentPlan === 'FREE';

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (tooltipVisible === true) {
      timer = setTimeout(() => {
        setTooltipVisible(false);
      }, 5000);
    }

    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [tooltipVisible]);

  const onStartConsultation = async () => {
    try {
      if (isLockedForFreePlan) {
        toast.error('This specialist requires Basic or Pro plan. Please upgrade.');
        router.push('/pricing');
        return;
      }

      setLoading(true);
      const response = await fetch('/api/session-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: '',
          selectedDoctor: {
            id,
            description,
            image,
            specialist,
            subscriptionRequired,
            voiceId,
          },
          output: null,
        }),
      });
      if (!response.ok) {
        setLoading(false);
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error || 'Failed to start consultation. Please try again.';
        console.error('Error starting consultation:', message);
        toast.error(message);
        return;
      }
      const result = await response.json();
      console.log('Consultation session created:', result);
      toast.success('Consultation started successfully!');
      router.push(`/dashboard/medical-agent/${result.sessionId}`);
    } catch (error) {
      console.error('Failed to start consultation:', error);
      toast.error('Failed to start consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id='agent-card'
      title={`${voiceId}: ${description}`}
      className='cursor-pointer relative shadow-lg p-3 rounded-lg min-h-25 bg-white flex flex-col gap-4 items-start'
    >
      <input
        type='button'
        onClick={() => setTooltipVisible(!tooltipVisible)}
        className='lg:hidden absolute  w-6 h-6 top-6 right-6 bg-blue-500 text-white rounded-full '
        value='i'
      />

      {tooltipVisible && (
        <div className='absolute top-12 right-2 bg-white border border-gray-300 p-2 rounded-lg shadow-lg z-10 max-w-[16rem] sm:top-4 sm:right-4'>
          <h4 className='font-bold mb-1'>{voiceId}</h4>
          <p className='text-left text-sm text-gray-700'>{description}</p>
        </div>
      )}

      <div className='w-full shrink-0'>
        <Image
          src={image}
          alt={specialist}
          width={1000}
          height={1000}
          className='w-full h-82 sm:min-h-70 object-cover rounded-lg'
        />
      </div>

      <div className='flex-1'>
        <h3 className='font-bold mt-1 sm:mt-0 text-lg'>{specialist}</h3>
        <p className='line-clamp-2 mt-2 text-sm text-gray-600 max-h-20 overflow-hidden'>
          {description}
        </p>
      </div>

      <div className='w-full sm:w-auto shrink-0'>
        <Button
          onClick={onStartConsultation}
          className='w-full sm:w-auto'
          disabled={loading}
          variant={isLockedForFreePlan ? 'outline' : 'default'}
        >
          {loading && <Loader />}
          {isLockedForFreePlan ? 'Upgrade to Access' : 'Start Consultation'} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
