import HeroSectionOne from '@/components/hero-section-demo-1';
import { FeatureBentoGrid } from './_components/FeatureBentoGrid';
import { UserPlus, Mic, Stethoscope, ShieldCheck, Clock, Activity } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function FeaturesWrapper() {
  return (
    <section className='section-container py-16 md:py-24 bg-neutral-50 dark:bg-neutral-900/50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4'>
            Next-Generation Healthcare AI
          </h2>
          <p className='text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto'>
            Experience the future of medical and therapeutic support with our highly advanced
            voice-enabled AI agents.
          </p>
        </div>
        <FeatureBentoGrid />
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      title: 'Sign Up for Free',
      description:
        'Create an account in less than a minute and instantly unlock 10 free consultations to test our platform.',
      icon: <UserPlus className='w-8 h-8 text-blue-600 dark:text-blue-400' />,
    },
    {
      title: 'Choose a Specialist',
      description:
        'Browse our list of AI doctors and therapists. Select the one that matches your current health concerns.',
      icon: <Stethoscope className='w-8 h-8 text-blue-600 dark:text-blue-400' />,
    },
    {
      title: 'Start Voice Consultation',
      description:
        'Have a natural, real-time voice conversation. The AI will listen, analyze symptoms, and offer guidance.',
      icon: <Mic className='w-8 h-8 text-blue-600 dark:text-blue-400' />,
    },
  ];

  return (
    <section className='section-container py-16 md:py-24'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4'>
            How It Works
          </h2>
          <p className='text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto'>
            Get personalized health guidance in three simple steps. No waiting rooms, no complex
            forms.
          </p>
        </div>
        <div className='grid md:grid-cols-3 gap-8 relative'>
          {/* Connecting line for desktop */}
          <div className='hidden md:block absolute top-[45px] left-[15%] w-[70%] h-0.5 bg-neutral-200 dark:bg-neutral-800' />

          {steps.map((step, idx) => (
            <div key={idx} className='relative z-10 flex flex-col items-center text-center'>
              <div className='w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 border-4 border-white dark:border-background flex items-center justify-center mb-6 shadow-sm'>
                {step.icon}
              </div>
              <h3 className='text-xl font-bold mb-3'>{step.title}</h3>
              <p className='text-neutral-600 dark:text-neutral-400'>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      icon: <Clock className='w-6 h-6 text-blue-500' />,
      title: '24/7 Availability',
      description:
        "Health concerns don't wait for business hours. CareAI is always ready to assist you.",
    },
    {
      icon: <ShieldCheck className='w-6 h-6 text-emerald-500' />,
      title: 'Private & Secure',
      description:
        'Your voice sessions are fully encrypted. We take your medical data privacy seriously.',
    },
    {
      icon: <Activity className='w-6 h-6 text-rose-500' />,
      title: 'Evidence-Based',
      description:
        'Our agents are trained on extensive medical literature to provide accurate, helpful guidance.',
    },
  ];

  return (
    <section className='section-container py-16 md:py-24 bg-blue-900 text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 my-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid lg:grid-cols-2 gap-12 items-center'>
          <div>
            <h2 className='text-3xl md:text-5xl font-bold tracking-tight mb-6'>
              Why choose CareAI?
            </h2>
            <p className='text-blue-100 text-lg mb-8 max-w-lg'>
              We are revolutionizing telehealth by minimizing wait times and maximizing
              accessibility, providing you with preliminary care and peace of mind when you need it
              most.
            </p>
            <div className='space-y-6'>
              {benefits.map((benefit, idx) => (
                <div key={idx} className='flex gap-4'>
                  <div className='flex-shrink-0 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center'>
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className='text-xl font-semibold mb-1'>{benefit.title}</h4>
                    <p className='text-blue-200'>{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className='relative'>
            <div className='aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 bg-white/5 flex items-center justify-center p-8'>
              {/* Fallback visual if no graphic available */}
              <div className='relative w-full h-full border border-white/20 rounded-full flex items-center justify-center'>
                <div className='absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse' />
                <Mic className='w-32 h-32 text-blue-300 opacity-80' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        'The response time is incredible. I woke up feeling terrible at 3 AM and the AI doctor helped me figure out my next steps immediately.',
      name: 'Sarah Jenkins',
      title: 'Patient',
    },
    {
      quote:
        " CareAI's empathetic listening model makes you feel heard. It accurately assessed my symptoms and advised me to see a specialist.",
      name: 'Michael Chen',
      title: 'Beta Tester',
    },
    {
      quote:
        'Having 10 free trials allowed my family to test it out. Now we use our premium plan whenever we have minor health concerns.',
      name: 'Emma Rodriguez',
      title: 'Premium Subscriber',
    },
  ];

  return (
    <section className='section-container py-16 md:py-24'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-4'>
            Trusted by Users
          </h2>
          <p className='text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto'>
            See how CareAI is making a difference in people's health journeys.
          </p>
        </div>
        <div className='grid md:grid-cols-3 gap-8'>
          {testimonials.map((test, idx) => (
            <Card
              key={idx}
              className='bg-neutral-50 dark:bg-neutral-900 border-none shadow-sm h-full flex flex-col justify-between'
            >
              <CardContent className='pt-8 pb-6 px-6'>
                <div className='flex gap-1 text-yellow-400 mb-6'>
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className='w-5 h-5 fill-current' viewBox='0 0 20 20'>
                      <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                    </svg>
                  ))}
                </div>
                <p className='text-lg italic text-neutral-700 dark:text-neutral-300 mb-6'>
                  &quot;{test.quote}&quot;
                </p>
                <div className='flex items-center gap-4 mt-auto'>
                  <Avatar>
                    <AvatarFallback>
                      {test.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className='font-semibold text-sm'>{test.name}</h4>
                    <p className='text-xs text-neutral-500'>{test.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className='border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-background'>
      <div className='max-w-5xl mx-auto px-4 py-20 text-center'>
        <h2 className='text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6'>
          Ready to take control of your health?
        </h2>
        <p className='text-lg text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto'>
          Join CareAI today and get 10 free consultations to experience the immediate availability
          and empathy of our AI medical voice agents.
        </p>
        <div className='flex flex-col sm:flex-row gap-4 justify-center'>
          <Button size='lg' className='w-full sm:w-auto text-lg h-14 px-8' asChild>
            <Link href='/sign-up'>Start Free Trial</Link>
          </Button>
          <Button
            size='lg'
            variant='outline'
            className='w-full sm:w-auto text-lg h-14 px-8'
            asChild
          >
            <Link href='/agents'>Browse Agents</Link>
          </Button>
        </div>
        <p className='mt-6 text-sm text-neutral-500'>
          No credit card required for the trial. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className='flex flex-col w-full overflow-hidden'>
      <HeroSectionOne />
      <FeaturesWrapper />
      <HowItWorksSection />
      <BenefitsSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
}
