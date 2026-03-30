import { auth } from '@/auth';
import { Check } from 'lucide-react';
import { getEntitlementSnapshot } from '@/lib/billing/entitlements';
import { type PlanTier } from '@/lib/billing/plans';
import PlanActionButton from './_components/PlanActionButton';

const plans: Array<{
  code: PlanTier;
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
}> = [
  {
    code: 'FREE',
    name: 'Free Trial',
    price: '$0',
    description: 'Perfect to try out our AI medical assistant.',
    features: [
      '10 Free Consultations (one-time)',
      'Basic symptom analysis',
      'Standard AI Models',
      'Email Support',
    ],
    buttonText: 'Get Started Free',
    popular: false,
  },
  {
    code: 'BASIC',
    name: 'Basic Plan',
    price: '$19/mo',
    description: 'For individuals needing regular health guidance.',
    features: [
      '50 Consultations per month',
      'Advanced symptom analysis',
      'Faster AI Models',
      'Specialist Routing',
      'Priority Support',
    ],
    buttonText: 'Subscribe Basic',
    popular: true,
  },
  {
    code: 'PRO',
    name: 'Pro Plan',
    price: '$49/mo',
    description: 'Unlimited peace of mind for you and your family.',
    features: [
      'Unlimited Consultations',
      'Comprehensive health reports',
      'Premium AI Models (Highest Accuracy)',
      'Direct specialist routing',
      '24/7 Priority Support',
    ],
    buttonText: 'Subscribe Pro',
    popular: false,
  },
];

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
      <div className='text-center mb-16'>
        <h1 className='heading-1'>Simple, Transparent Pricing</h1>
        <p className='subtext mx-auto mt-4'>
          Choose the right plan for your healthcare needs. Every new user gets 10 free consultations
          to experience the power of CareAI.
        </p>
      </div>

      <div className='grid-cards'>
        {plans.map((plan) => (
          <div
            key={plan.code}
            className={`card-responsive relative flex flex-col p-8 ${plan.popular ? 'border-primary shadow-lg ring-1 ring-primary' : ''}`}
          >
            {plan.popular && (
              <span className='absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-semibold py-1 px-3 rounded-full'>
                Most Popular
              </span>
            )}

            <div className='mb-6'>
              <h3 className='heading-3 mb-2'>{plan.name}</h3>
              <p className='text-muted-foreground'>{plan.description}</p>
            </div>

            <div className='mb-6'>
              <span className='text-5xl font-bold text-foreground'>{plan.price}</span>
            </div>

            <ul className='flex-1 space-y-4 mb-8'>
              {plan.features.map((feature) => (
                <li key={feature} className='flex items-start gap-3'>
                  <Check className='h-5 w-5 text-primary shrink-0' />
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
          </div>
        ))}
      </div>
    </div>
  );
}
