import { Mic, ShieldCheck, Stethoscope, Workflow } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import RelatedLinks from '@/components/marketing/RelatedLinks';
import { buildMetadata } from '@/lib/seo';
import { buildSoftwareAppSchema } from '@/lib/structured-data';

const featuresDescription =
  'Explore AI symptom analysis, voice consultation workflows, specialist routing, premium models, and secure health data support for Pakistan and international users.';

export const metadata = buildMetadata({
  title: 'Features | AI Voice Symptom Analysis, Specialist Routing & More',
  description: featuresDescription,
  path: '/features',
  keywords: [
    'AI symptom analysis',
    'voice health consultation features',
    'medical AI specialist routing',
    'online health chat features',
  ],
  type: 'website',
});

const featureList = [
  'Real-time AI symptom analysis from voice input',
  'Voice-first consultation flow with natural follow-up prompts',
  'Specialist routing paths for focused care recommendations',
  'Premium AI models for higher diagnostic quality',
  'Secure health data handling with privacy-first controls',
  'Support for Pakistan and international users',
];

const softwareSchema = buildSoftwareAppSchema({
  description: featuresDescription,
  featureList,
});

const sections = [
  {
    icon: Workflow,
    title: 'AI Symptom Analysis',
    body: 'Our triage flow asks the right follow-up questions to identify red flags and guide users toward safer next steps quickly.',
  },
  {
    icon: Mic,
    title: 'Voice Health Consultations',
    body: 'Patients can speak naturally instead of filling long forms, helping improve completion rates and consultation quality.',
  },
  {
    icon: Stethoscope,
    title: 'Specialist Routing',
    body: 'Users are routed toward focused care pathways based on symptom context, urgency signals, and history-aware prompts.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Health Data',
    body: 'Built with encrypted transport, strict access policies, and transparent privacy controls to support trust in health AI.',
  },
];

export default function FeaturesPage() {
  return (
    <div className='section-container'>
      <script type='application/ld+json' suppressHydrationWarning>
        {JSON.stringify(softwareSchema)}
      </script>

      <header className='max-w-3xl'>
        <h1 className='heading-1'>Powerful Features for AI-Driven Medical Voice Consultation</h1>
        <p className='subtext mt-4'>{featuresDescription}</p>
      </header>

      <section className='mt-10 grid gap-6 md:grid-cols-2'>
        {sections.map((section) => (
          <article key={section.title} className='card-responsive p-6'>
            <section.icon className='size-6 text-primary' />
            <h2 className='mt-4 text-2xl font-semibold'>{section.title}</h2>
            <p className='mt-3 text-muted-foreground'>{section.body}</p>
          </article>
        ))}
      </section>

      <section className='mt-10 rounded-xl border bg-muted/40 p-6'>
        <h2 className='text-2xl font-semibold'>Built for modern care teams</h2>
        <p className='mt-3 text-muted-foreground'>
          MediVoice AI helps clinics, startups, and digital care teams deliver faster first-line
          guidance without sacrificing quality.
        </p>
        <div className='mt-5 flex flex-wrap gap-3'>
          <Button asChild>
            <Link href='/pricing'>View Pricing</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/faq'>Read FAQ</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        title='Continue Exploring'
        links={[
          {
            href: '/pricing',
            label: 'Pricing Plans',
            description: 'Compare Free, Basic, and Pro options.',
          },
          {
            href: '/faq',
            label: 'Frequently Asked Questions',
            description: 'Read answers on safety, plans, and privacy.',
          },
        ]}
      />
    </div>
  );
}
