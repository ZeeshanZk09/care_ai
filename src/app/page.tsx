import { Activity, Mic, ShieldCheck, Stethoscope, Timer } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { buildSoftwareAppSchema } from '@/lib/structured-data';

const homepageDescription =
  'MediVoice AI delivers instant symptom analysis through an AI medical voice assistant for online health consultation, trusted by patients in Pakistan and worldwide.';

export const metadata = buildMetadata({
  title: 'AI Medical Voice Assistant | Instant Health Consultations',
  titleAbsolute: true,
  description: homepageDescription,
  path: '/',
  keywords: [
    'AI medical assistant',
    'voice health consultation',
    'AI symptom checker',
    'online doctor Pakistan',
    'medical AI app',
    'instant health consultation',
  ],
  type: 'website',
});

const softwareAppSchema = buildSoftwareAppSchema({
  description: homepageDescription,
  offers: [
    {
      name: 'Free Trial',
      price: 0,
      priceCurrency: 'USD',
      description: '10 consultations included to start free.',
      url: '/pricing',
    },
    {
      name: 'Basic Plan',
      price: 19,
      priceCurrency: 'USD',
      description: '50 consultations per month for regular care guidance.',
      url: '/pricing',
    },
    {
      name: 'Pro Plan',
      price: 49,
      priceCurrency: 'USD',
      description: 'Unlimited consultations with premium model access.',
      url: '/pricing',
    },
  ],
});

const features = [
  {
    icon: Activity,
    title: 'AI Symptom Analysis',
    description:
      'Describe symptoms naturally and receive clear, contextual guidance in seconds, with follow-up prompts that improve triage quality.',
  },
  {
    icon: Mic,
    title: 'Voice Health Consultations',
    description:
      'Talk instead of typing. Our AI medical voice assistant keeps consultations conversational and accessible across devices.',
  },
  {
    icon: Stethoscope,
    title: 'Specialist Routing',
    description:
      'Move from broad symptom intake to specialist-level pathways for cardio, mental health, pediatrics, and more.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    description:
      'Built for healthcare trust with encrypted transport, access controls, and a privacy-first architecture.',
  },
];

const testimonials = [
  {
    name: 'Areeba H.',
    location: 'Lahore, Pakistan',
    quote:
      'I got immediate guidance late at night and knew exactly what to monitor before visiting a clinic the next day.',
  },
  {
    name: 'David M.',
    location: 'Dubai, UAE',
    quote:
      'The voice consultation flow feels natural and much faster than filling forms while feeling unwell.',
  },
  {
    name: 'Samina R.',
    location: 'Karachi, Pakistan',
    quote:
      'The specialist routing helped me organize symptoms clearly before speaking with my physician.',
  },
];

const faqPreview = [
  'Is AI medical consultation safe?',
  'How accurate is AI symptom checking?',
  'Can I use this in Pakistan?',
  'What is the difference between Basic and Pro plans?',
];

export default function HomePage() {
  return (
    <div className='w-full'>
      <script type='application/ld+json' suppressHydrationWarning>
        {JSON.stringify(softwareAppSchema)}
      </script>

      <section className='section-container grid gap-10 py-14 lg:grid-cols-2 lg:items-center'>
        <div>
          <p className='mb-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground'>
            Trusted by Patients in Pakistan and Worldwide
          </p>
          <h1 className='heading-1'>Your AI-Powered Medical Voice Assistant</h1>
          <p className='mt-5 subtext'>
            Get instant, voice-first symptom guidance, specialist routing, and online health
            consultation support built for modern care workflows.
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Button asChild size='lg'>
              <Link href='/sign-up'>Start Free Consultation</Link>
            </Button>
            <Button asChild size='lg' variant='outline'>
              <Link href='/features'>Explore Features</Link>
            </Button>
            <Button asChild size='lg' variant='ghost'>
              <Link href='/pricing'>View Pricing</Link>
            </Button>
          </div>
          <div className='mt-8 rounded-xl border bg-muted/30 p-4'>
            <h2 className='text-lg font-semibold'>As Featured In</h2>
            <div className='mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground sm:grid-cols-4'>
              <span className='rounded-md border bg-background px-3 py-2 text-center'>
                HealthTech Weekly
              </span>
              <span className='rounded-md border bg-background px-3 py-2 text-center'>
                Digital Care Today
              </span>
              <span className='rounded-md border bg-background px-3 py-2 text-center'>
                AI Pakistan
              </span>
              <span className='rounded-md border bg-background px-3 py-2 text-center'>
                Telemed Global
              </span>
            </div>
          </div>
        </div>

        <div className='rounded-2xl border bg-linear-to-b from-slate-50 to-white p-5 shadow-sm dark:from-slate-900 dark:to-slate-950'>
          <Image
            src='/medical-assistance.png'
            alt='AI medical voice consultation interface'
            width={1000}
            height={720}
            priority
            className='h-auto w-full rounded-xl object-cover'
          />
        </div>
      </section>

      <section className='section-container pt-4'>
        <h2 className='heading-2'>AI Symptom Analysis</h2>
        <p className='subtext'>
          Capture detailed symptom narratives, detect urgency patterns, and guide users toward safer
          next steps in under a minute.
        </p>

        <h2 className='heading-2 mt-12'>Voice Health Consultations</h2>
        <p className='subtext'>
          Conversational voice flows reduce friction for users who need quick support, especially in
          mobile-first healthcare journeys.
        </p>

        <h2 className='heading-2 mt-12'>Start Free - 10 Consultations On Us</h2>
        <p className='subtext'>
          Launch instantly with the free trial, then scale to predictable monthly plans as your care
          needs grow.
        </p>
      </section>

      <section className='section-container'>
        <h2 className='heading-2'>Feature Highlights</h2>
        <div className='mt-8 grid gap-6 md:grid-cols-2'>
          {features.map((feature) => (
            <article key={feature.title} className='card-responsive p-6'>
              <feature.icon className='size-6 text-primary' />
              <h3 className='mt-4 text-xl font-semibold'>{feature.title}</h3>
              <p className='mt-2 text-muted-foreground'>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='section-container'>
        <h2 className='heading-2'>Pricing Preview</h2>
        <div className='mt-8 grid gap-6 md:grid-cols-3'>
          <article className='card-responsive p-6'>
            <h3 className='text-xl font-semibold'>Free Trial</h3>
            <p className='mt-2 text-3xl font-bold'>$0</p>
            <p className='mt-2 text-muted-foreground'>10 consultations to evaluate the platform.</p>
          </article>
          <article className='card-responsive p-6'>
            <h3 className='text-xl font-semibold'>Basic</h3>
            <p className='mt-2 text-3xl font-bold'>$19/mo</p>
            <p className='mt-2 text-muted-foreground'>
              50 consultations per month with specialist routing.
            </p>
          </article>
          <article className='card-responsive p-6'>
            <h3 className='text-xl font-semibold'>Pro</h3>
            <p className='mt-2 text-3xl font-bold'>$49/mo</p>
            <p className='mt-2 text-muted-foreground'>
              Unlimited consultations and premium AI models.
            </p>
          </article>
        </div>
        <div className='mt-6'>
          <Button asChild>
            <Link href='/pricing'>Compare Full Plans</Link>
          </Button>
        </div>
      </section>

      <section className='section-container'>
        <h2 className='heading-2'>Testimonials</h2>
        <div className='mt-8 grid gap-6 md:grid-cols-3'>
          {testimonials.map((item) => (
            <article
              key={item.name}
              className='card-responsive p-6'
              itemScope
              itemType='https://schema.org/Review'
            >
              <p className='italic text-muted-foreground' itemProp='reviewBody'>
                &quot;{item.quote}&quot;
              </p>
              <p className='mt-4 font-semibold' itemProp='author'>
                {item.name}
              </p>
              <p className='text-sm text-muted-foreground'>{item.location}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='section-container'>
        <h2 className='heading-2'>FAQ Preview</h2>
        <div className='mt-6 rounded-xl border p-6'>
          <ul className='space-y-3'>
            {faqPreview.map((question) => (
              <li key={question} className='flex items-start gap-2 text-muted-foreground'>
                <Timer className='mt-0.5 size-4 text-primary' />
                <span>{question}</span>
              </li>
            ))}
          </ul>
          <div className='mt-6'>
            <Button asChild variant='outline'>
              <Link href='/faq'>Read All FAQs</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className='section-container pt-0'>
        <h2 className='heading-2'>Explore More</h2>
        <p className='subtext'>
          Learn about{' '}
          <Link href='/features' className='underline'>
            features
          </Link>
          , compare{' '}
          <Link href='/pricing' className='underline'>
            pricing
          </Link>
          , read the{' '}
          <Link href='/blog' className='underline'>
            blog
          </Link>
          , and meet the team on the{' '}
          <Link href='/about' className='underline'>
            about page
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
