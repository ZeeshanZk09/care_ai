import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Terms of Service | MediVoice AI',
  description:
    "Read the terms and conditions for using MediVoice AI's medical voice assistant platform.",
  path: '/terms',
  robots: {
    index: true,
    follow: true,
    noarchive: true,
  },
});

export default function TermsPage() {
  return (
    <div className='section-container'>
      <div className='mx-auto max-w-3xl space-y-6'>
        <h1 className='heading-1'>Terms of Service</h1>
        <p className='text-muted-foreground'>Last updated: March 2026</p>

        <section>
          <h2 className='heading-3'>1. Service Scope</h2>
          <p className='text-muted-foreground'>
            MediVoice AI provides AI-powered preliminary health guidance and does not replace
            licensed medical diagnosis or emergency services.
          </p>
        </section>

        <section>
          <h2 className='heading-3'>2. User Responsibilities</h2>
          <p className='text-muted-foreground'>
            You agree to provide accurate information, keep account credentials secure, and seek
            professional care for urgent medical concerns.
          </p>
        </section>

        <section>
          <h2 className='heading-3'>3. Billing and Subscriptions</h2>
          <p className='text-muted-foreground'>
            Paid plans renew according to your selected billing cycle. You may cancel through your
            account settings.
          </p>
        </section>

        <section>
          <h2 className='heading-3'>4. Limitation of Liability</h2>
          <p className='text-muted-foreground'>
            To the maximum extent permitted by law, MediVoice AI is not liable for indirect or
            consequential damages resulting from use of the platform.
          </p>
        </section>
      </div>
    </div>
  );
}
