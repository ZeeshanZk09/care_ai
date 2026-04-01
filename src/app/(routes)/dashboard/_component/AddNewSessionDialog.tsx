'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AIDoctorAgents } from '@/lib/data/list';
import { findGibrishInNotes, keywordMatchStrict } from '@/lib/utils/note';
import { ArrowRight, Loader, Plus, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type UpgradePromptPayload = {
  step: 1 | 2 | 3;
  variant: 'DISCOUNT' | 'FEATURE_UNLOCK';
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  discountCode: string;
  validDays: number;
};

const parseUpgradePrompt = (value: unknown): UpgradePromptPayload | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const prompt = value as Partial<UpgradePromptPayload>;
  if (
    (prompt.step !== 1 && prompt.step !== 2 && prompt.step !== 3) ||
    (prompt.variant !== 'DISCOUNT' && prompt.variant !== 'FEATURE_UNLOCK') ||
    typeof prompt.title !== 'string' ||
    typeof prompt.message !== 'string' ||
    typeof prompt.ctaLabel !== 'string' ||
    typeof prompt.ctaHref !== 'string' ||
    typeof prompt.discountCode !== 'string' ||
    typeof prompt.validDays !== 'number'
  ) {
    return null;
  }

  return {
    step: prompt.step,
    variant: prompt.variant,
    title: prompt.title,
    message: prompt.message,
    ctaLabel: prompt.ctaLabel,
    ctaHref: prompt.ctaHref,
    discountCode: prompt.discountCode,
    validDays: prompt.validDays,
  };
};

const showUpgradePromptToast = (
  router: ReturnType<typeof useRouter>,
  prompt: UpgradePromptPayload,
) => {
  const variantCopy =
    prompt.variant === 'DISCOUNT'
      ? `Use code ${prompt.discountCode} within ${prompt.validDays} days.`
      : 'Upgrade to unlock premium model quality and comprehensive reports.';

  toast(prompt.title, {
    description: `${prompt.message} ${variantCopy}`,
    action: {
      label: prompt.ctaLabel,
      onClick: () => {
        router.push(prompt.ctaHref);
      },
    },
  });
};

export function AddNewSessionDialog() {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<typeof AIDoctorAgents | undefined>(undefined);
  const [open, setOpen] = useState(false);

  // Clear doctors list when dialog is closed
  useEffect(() => {
    if (!open) setDoctors(undefined);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          <Button className='mt-4'>+ Start a Consultation</Button>
        </DialogTrigger>
        <DialogBody
          loading={loading}
          note={note}
          setDoctors={setDoctors}
          setLoading={setLoading}
          setNote={setNote}
          doctors={doctors}
        />
      </form>
    </Dialog>
  );
}

export function AddNewSessionDialog2() {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<typeof AIDoctorAgents | undefined>(undefined);
  const [open, setOpen] = useState(false);

  // Clear doctors list when dialog is closed
  useEffect(() => {
    if (!open) setDoctors(undefined);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          <button className='max-sm:hidden text-sm flex items-center gap-2 rounded-md bg-blue-600 text-white w-full sm:w-auto px-4 py-2 hover:bg-blue-700 transition-colors duration-200 justify-center'>
            <Plus className='w-4 h-4' /> Consult With a Doctor
          </button>
        </DialogTrigger>
        <DialogBody
          doctors={doctors}
          loading={loading}
          setLoading={setLoading}
          setDoctors={setDoctors}
          note={note}
          setNote={setNote}
        />
      </form>
    </Dialog>
  );
}

export function AddNewSessionDialogPlusButton() {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<typeof AIDoctorAgents | undefined>(undefined);
  const [open, setOpen] = useState(false);

  // Clear doctors list when dialog is closed
  useEffect(() => {
    if (!open) setDoctors(undefined);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          <button className='fixed rounded-full text-white right-5 bottom-15 hover:bg-blue-700 bg-blue-600 p-2 z-50'>
            <Plus />
          </button>
        </DialogTrigger>
        <DialogBody
          doctors={doctors}
          loading={loading}
          setLoading={setLoading}
          setDoctors={setDoctors}
          note={note}
          setNote={setNote}
        />
      </form>
    </Dialog>
  );
}

export function DialogBody({
  note,
  setNote,
  loading,
  doctors,
  setLoading,
  setDoctors,
}: Readonly<{
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  doctors: typeof AIDoctorAgents | undefined;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setDoctors: React.Dispatch<React.SetStateAction<typeof AIDoctorAgents | undefined>>;
}>) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [historyOfNotes, setHistoryOfNotes] = useState<string[]>([]);
  const router = useRouter();
  useEffect(() => {
    const storedNotes = localStorage.getItem('consultation_notes');

    if (storedNotes) {
      setHistoryOfNotes(JSON.parse(storedNotes));
    }
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const gibberishCheck = findGibrishInNotes(note);
    if (!gibberishCheck.success) {
      toast.error(gibberishCheck.message);
      return;
    }

    // Quick keyword-only match: if explicit keywords are present, return those matches
    try {
      const quickMatches = keywordMatchStrict(note || '', AIDoctorAgents);
      if (quickMatches && quickMatches.length > 0) {
        setDoctors(quickMatches);
        return;
      }
    } catch (e) {
      console.warn('Quick keyword match failed:', e);
      toast.error('Failed to analyze notes. Please try again.');
      return;
    }

    setLoading(true);
    toast.loading('Getting doctor suggestions by AI...');
    try {
      const response = await fetch('/api/suggest-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note }),
      });
      toast.dismiss();
      toast.success('Doctor suggestions received!');
      if (!response.ok) {
        setLoading(false);
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error || 'Failed to fetch doctor suggestions.';
        console.error('Error response:', message);
        toast.error(message);
        return;
      }

      const data = await response.json();

      // data might be { data: '["..."]' } or already parsed
      const doctors = data.data;
      console.log('Doctor Suggestions:', doctors);
      setDoctors(doctors);
    } catch (err) {
      console.error('Failed to parse response:', err);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const onStartConsultation = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/session-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: note,
          selectedDoctor: doctors?.find((d) => d.id === selectedDoctorId) || null,
          output: doctors,
        }),
      });
      if (!response.ok) {
        setLoading(false);
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error || 'Failed to start consultation. Please try again.';
        const upgradePrompt = parseUpgradePrompt(errorBody?.upgradePrompt);
        if (upgradePrompt) {
          showUpgradePromptToast(router, upgradePrompt);
        }
        console.error('Error starting consultation:', message);
        toast.error(message);
        return;
      }
      const result = await response.json();
      console.log('Consultation session created:', result);
      toast.success('Consultation started successfully!');

      const upgradePrompt = parseUpgradePrompt(result?.upgradePrompt);
      if (upgradePrompt) {
        showUpgradePromptToast(router, upgradePrompt);
      }

      router.push(`/dashboard/medical-agent/${result.sessionId}`);
    } catch (error) {
      console.error('Failed to start consultation:', error);
      toast.error('Failed to start consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className='lg:max-w-4xl min-h-[90vh]'>
      <DialogHeader>
        <DialogTitle>Add Basic Details</DialogTitle>
        <DialogDescription asChild>
          <div className='overflow-y-hidden p-2'>
            {doctors === undefined ? (
              <div>
                <div className='flex max-sm:flex-col justify-between gap-4 w-full'>
                  <h2>Add Syptoms or Any other Details</h2>
                  <p className='text-xs place-self-end'>1200 characters allowed.</p>
                </div>
                <Textarea
                  placeholder='I am having headache and fever since morning...'
                  className='mt-2 h-20 max-sm:text-xs '
                  onChange={(e) => {
                    setNote(e.target.value);
                  }}
                  value={note}
                />
                {historyOfNotes.length > 0 && (
                  <div className='overflow-y-hidden mt-4'>
                    <h3 className='font-semibold mb-2'>Previous Notes:</h3>
                    <ul className='list-disc list-inside max-h-40 overflow-y-auto [&::-webkit-scrollbar]:w-1  [&::-webkit-scrollbar-track]:bg-gray-100  [&::-webkit-scrollbar-thumb]:bg-gray-300 p-2'>
                      {historyOfNotes.map((n, idx) => (
                        <li key={idx} className='cursor-pointer text-sm text-gray-600 line-clamp-2'>
                          <button
                            onClick={() => {
                              setNote(n);
                            }}
                            className='w-full text-left line-clamp-1 text-xs'
                          >
                            {idx + 1}. {n}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`grid max-lg:max-h-70 max-lg:overflow-y-scroll sm:grid-cols-2 lg:grid-cols-3 gap-4 max-lg:p-2`}
              >
                {doctors && doctors.length > 0 ? (
                  doctors.map(({ description, id, image, specialist, voiceId }) => {
                    return (
                      <Tooltip
                        key={id}
                        description={description}
                        specialist={specialist}
                        image={image}
                        id={id}
                        voiceId={voiceId}
                        setSelectedDoctorId={setSelectedDoctorId}
                        selectedDoctorId={selectedDoctorId}
                      />
                    );
                  })
                ) : (
                  <p>No doctor suggestions found. Please try again with different details.</p>
                )}
              </div>
            )}
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className='w-full place-self-end'>
        <div>
          {doctors && doctors?.length > 0 ? (
            <div className='flex sm:flex-col-reverse gap-2 sm:items-end max-sm:justify-between'>
              <Button
                variant='outline'
                onClick={() => {
                  setNote('');
                  setDoctors(undefined);
                }}
                disabled={loading}
                className='w-[30%]'
              >
                <RotateCcw />
              </Button>
              <div className='flex flex-col gap-2'>
                <Button onClick={onStartConsultation} disabled={!selectedDoctorId || loading}>
                  {loading && <Loader className='animate-spin' />}
                  Start Consultation <ArrowRight />
                </Button>
                <DialogClose asChild>
                  <Button variant='outline'>Cancel</Button>
                </DialogClose>
              </div>
            </div>
          ) : (
            <div className='flex gap-2'>
              <DialogClose asChild>
                <Button variant='outline'>Cancel</Button>
              </DialogClose>
              <Button
                onClick={(e) => {
                  setHistoryOfNotes((prev) => {
                    const updatedNotes = [...prev, note];
                    const gibberishCheck = findGibrishInNotes(note);
                    if (!gibberishCheck.success) {
                      return [...prev];
                    }
                    const existingNote = prev.find((n) => n === note);
                    if (existingNote) {
                      return prev;
                    }
                    localStorage.setItem('consultation_notes', JSON.stringify(updatedNotes));
                    return updatedNotes;
                  });
                  handleSubmit(e);
                }}
                type='submit'
                className='px-2'
                disabled={!note.trim() || loading}
              >
                {loading && <Loader className='animate-spin' />}
                Next <ArrowRight />
              </Button>
            </div>
          )}
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

export function Tooltip({
  description,
  specialist,
  image,
  id,
  voiceId,
  setSelectedDoctorId,
  selectedDoctorId,
}: Readonly<{
  description: string;
  specialist: string;
  image: string;
  id: number;
  voiceId: string;
  setSelectedDoctorId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedDoctorId: number | null;
}>) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <button
      onClick={() => {
        setSelectedDoctorId(id);
      }}
      key={id}
      title={`${specialist}: ${description}`}
      className={`flex flex-col items-center justify-center relative ${selectedDoctorId === id ? 'ring-2 ring-blue-500' : ''} shadow-lg p-2  rounded-lg`}
    >
      <input
        type='button'
        onClick={() => setTooltipVisible(!tooltipVisible)}
        className='lg:hidden absolute w-6 h-6 top-4 right-4 bg-blue-500 text-white p-1 rounded-full'
        value='i'
      />
      {tooltipVisible && (
        <div className=' absolute top-10 right-2 bg-white border border-gray-300 p-2 rounded-lg shadow-lg z-10 max-w-48'>
          <h4 className='font-bold mb-1'>{specialist}</h4>
          <p className='text-left text-sm text-gray-700'>{description}</p>
        </div>
      )}
      <Image
        src={image}
        alt={specialist}
        width={200}
        height={300}
        className='size-20 object-cover rounded-full'
      />
      <h3 className='font-bold mt-2'>{voiceId}</h3>
      <p className='text-center'>{description.slice(0, 80)}...</p>
    </button>
  );
}
