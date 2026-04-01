import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import ExitIntentLeadCapture from '@/components/marketing/ExitIntentLeadCapture';
import Link from 'next/link';
import { getEntitlementSnapshot } from '@/lib/billing/entitlements';
import type { PlanTier } from '@/lib/billing/plans';
import { buildMetadata } from '@/lib/seo';
import { buildOfferSchema } from '@/lib/structured-data';
import PlanActionButton from './_components/PlanActionButton';
import GuidedUpgradeFlow from './_components/GuidedUpgradeFlow';
import PricingComparisonToggle from './_components/PricingComparisonToggle';

const pricingDescription =
  'Choose affordable AI health consultation plans with free trial access, 50 consultations per month on Basic, and unlimited Pro support with Pakistan-friendly pricing.';

export const metadata = buildMetadata({
  title: 'Pricing Plans | Free, Basic & Pro Medical AI Consultation',
  description: pricingDescription,
  path: '/pricing',
  keywords: [
    'AI medical consultation pricing',
    'health AI subscription',
    'medical chatbot plans Pakistan',
    'online doctor subscription',
  ],
  type: 'website',
});

const plans: Array<{
  code: PlanTier;
  name: string;
  monthlyPrice: number;
  priceLabel: string;
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
}> = [
  {
    code: 'FREE',
    name: 'Free Trial',
    monthlyPrice: 0,
    priceLabel: '$0',
    description: 'Perfect to try out our AI medical assistant.',
    features: [
      '10 free consultations (one-time)',
      'Basic symptom analysis',
      'Standard AI models',
      'Email support',
    ],
    buttonText: 'Get Started Free',
    popular: false,
  },
  {
    code: 'BASIC',
    name: 'Basic Plan',
    monthlyPrice: 19,
    priceLabel: '$19/mo',
    description: 'For individuals needing regular health guidance.',
    features: [
      '50 consultations per month',
      'Advanced symptom analysis',
      'Faster AI models',
      'Specialist routing',
      'Priority support',
    ],
    buttonText: 'Subscribe Basic',
    popular: true,
  },
  {
    code: 'PRO',
    name: 'Pro Plan',
    monthlyPrice: 49,
    priceLabel: '$49/mo',
    description: 'Unlimited peace of mind for you and your family.',
    features: [
      'Unlimited consultations',
      'Comprehensive health reports',
      'Premium AI models (highest accuracy)',
      'Direct specialist routing',
      '24/7 priority support',
    ],
    buttonText: 'Subscribe Pro',
    popular: false,
  },
];

const pricingQuestions = [
  {
    q: 'What happens after I pay?',
    a: 'Your account upgrades immediately, and billing details are available in your dashboard billing section.',
  },
  {
    q: 'Can I cancel my plan anytime?',
    a: 'Yes. You can cancel at any time and keep access until your current billing period ends.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Yes. Every new account includes 10 free consultations before you need a paid plan.',
  },
  {
    q: 'Which plan is best for families?',
    a: 'Pro is ideal for households that need unlimited consultations and premium model access.',
  },
];

const offerSchema = buildOfferSchema(
  plans.map((plan) => ({
    name: plan.name,
    price: plan.monthlyPrice,
    priceCurrency: 'USD',
    description: `${plan.description} Includes: ${plan.features.join(', ')}.`,
    url: '/pricing',
  }))
);

export default async function PricingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  let currentPlan: PlanTier = 'FREE';
  if (userId) {
    try {
      const entitlement = await getEntitlementSnapshot(userId);
      currentPlan = entitlement.plan;
    } catch (error) {
      console.error('[pricing] Failed to load current entitlement snapshot:', error);
    }
  }

  return (
    <div className='section-container'>
      <script type='application/ld+json' suppressHydrationWarning>
        {JSON.stringify(offerSchema)}
      </script>

      <div className='text-center'>
        <h1 className='heading-1'>Simple, Transparent Pricing for AI Medical Consultations</h1>
        <p className='subtext mx-auto mt-4'>
          Compare flexible plans for affordable AI health consultation workflows, from free trial
          onboarding to unlimited Pro support.
        </p>
      </div>

      <div className='mt-12 grid-cards'>
        {plans.map((plan) => (
          <article
            key={plan.code}
            className={`card-responsive relative flex flex-col p-8 ${plan.popular ? 'border-primary shadow-lg ring-1 ring-primary' : ''}`}
          >
            {plan.popular && (
              <span className='absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground'>
                Most Popular
              </span>
            )}

            <div className='mb-6'>
              <h2 className='heading-3 mb-2'>{plan.name}</h2>
              <p className='text-muted-foreground'>{plan.description}</p>
            </div>

            <div className='mb-6'>
              <span className='text-5xl font-bold text-foreground'>{plan.priceLabel}</span>
            </div>

            <ul className='flex-1 space-y-4 mb-8'>
              {plan.features.map((feature) => (
                <li key={feature} className='flex items-start gap-3'>
                  <Check className='h-5 w-5 shrink-0 text-primary' />
                  <span className='text-foreground'>{feature}</span>
                </li>
              ))}
            </ul>

            <PlanActionButton
              targetPlan={plan.code}
              currentPlan={currentPlan}
              isAuthenticated={Boolean(userId)}
              defaultLabel={plan.buttonText}
            />
          </article>
        ))}
      </div>

      <PricingComparisonToggle />

      <section className='mt-4 overflow-x-auto'>
        <div className='mt-4 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground'>
          Upgrade campaigns currently include <strong>CARE30</strong> for 30% off Pro for 7 days,
          improving conversion economics versus staying capped on Free.
        </div>
      </section>

      <GuidedUpgradeFlow isAuthenticated={Boolean(userId)} />

      <section className='mt-14 rounded-xl border p-6'>
        <h2 className='text-2xl font-semibold'>Billing Questions</h2>
        <div className='mt-5 space-y-3'>
          {pricingQuestions.map((item) => (
            <details key={item.q} className='rounded-lg border p-4'>
              <summary className='cursor-pointer font-medium'>{item.q}</summary>
              <p className='mt-2 text-muted-foreground'>{item.a}</p>
            </details>
          ))}
        </div>
        <p className='mt-5 text-sm text-muted-foreground'>
          Need more detail? Visit our{' '}
          <Link href='/faq' className='underline'>
            FAQ
          </Link>{' '}
          including the{' '}
          <Link href='/faq/billing-and-plans' className='underline'>
            billing and plans cluster
          </Link>{' '}
          and{' '}
          <Link href='/symptoms' className='underline'>
            symptom consultation guides
          </Link>
          , or contact{' '}
          <Link href='/contact' className='underline'>
            support
          </Link>
          .
        </p>
      </section>

      <section className='mt-14 rounded-xl border bg-muted/40 p-8 text-center'>
        <h2 className='text-2xl font-semibold'>Not sure which plan? Start with the Free Trial.</h2>
        <p className='mx-auto mt-3 max-w-2xl text-muted-foreground'>
          Begin with 10 free consultations and upgrade only when you need higher monthly capacity.
        </p>
        <div className='mt-6 flex flex-wrap justify-center gap-3'>
          <Button asChild>
            <Link href='/sign-up'>Start Free Consultation</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/faq'>Read FAQ</Link>
          </Button>
          <Button asChild variant='ghost'>
            <Link href='/contact'>Contact Sales</Link>
          </Button>
        </div>
      </section>

      <ExitIntentLeadCapture
        context='pricing'
        title='Wait - grab our free plan comparison guide'
        description='Get a quick checklist to choose the right consultation plan and save on annual billing.'
      />
    </div>
  );
}
