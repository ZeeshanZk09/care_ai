import { AIDoctorAgents } from '@/lib/data/list';
import { auth } from '@/auth';
import { getEntitlementSnapshot } from '@/lib/billing/entitlements';
import React from 'react';
import DoctorAgentCard from './DoctorAgentCard';

export default async function DoctorAgentList() {
  const session = await auth();
  let currentPlan: 'FREE' | 'BASIC' | 'PRO' = 'FREE';

  if (session?.user?.id) {
    try {
      const entitlement = await getEntitlementSnapshot(session.user.id);
      currentPlan = entitlement.plan;
    } catch (error) {
      console.error('[DoctorAgentList] Failed to load entitlement snapshot:', error);
    }
  }

  return (
    <section className='px-4 mt-10'>
      <h2 className='text-3xl font-bold'>AI Specialist Doctor</h2>
      <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-10'>
        {AIDoctorAgents.map(
          ({ agentPrompt, description, id, image, specialist, subscriptionRequired, voiceId }) => {
            return (
              <DoctorAgentCard
                key={id}
                agentPrompt={agentPrompt}
                description={description}
                id={id}
                image={image}
                specialist={specialist}
                subscriptionRequired={subscriptionRequired}
                voiceId={voiceId}
                currentPlan={currentPlan}
              />
            );
          }
        )}
      </div>
    </section>
  );
}
