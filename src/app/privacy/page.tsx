import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy Policy | How We Protect Your Health Data',
  description:
    'Learn how MediVoice AI protects your health data, including collection, storage, sharing, and your rights under applicable privacy laws.',
  path: '/privacy',
  robots: {
    index: true,
    follow: true,
    noarchive: true,
  },
});

export default function PrivacyPolicyPage() {
  return (
    <div className='section-container'>
      <div className='max-w-3xl mx-auto prose dark:prose-invert'>
        <h1 className='heading-1 mb-8'>Privacy Policy</h1>
        <p className='text-muted-foreground mb-4'>Last updated: March 2026</p>

        <h2 className='heading-3 mt-8'>1. Introduction</h2>
        <p>
          Welcome to CareAI. We respect your privacy and are committed to protecting your personal
          data. This privacy policy will inform you as to how we look after your personal data when
          you visit our website.
        </p>

        <h2 className='heading-3 mt-8'>2. Data We Collect</h2>
        <p>
          We may collect, use, store and transfer different kinds of personal data about you which
          we have grouped together as follows:
        </p>
        <ul>
          <li>
            <strong>Identity Data:</strong> includes first name, last name, username.
          </li>
          <li>
            <strong>Contact Data:</strong> includes email address.
          </li>
          <li>
            <strong>Health Data:</strong> includes symptoms, consultation notes, and AI analysis
            reports.
          </li>
        </ul>

        <h2 className='heading-3 mt-8'>3. How We Use Your Data</h2>
        <p>
          We will only use your personal data when the law allows us to. Most commonly, we will use
          your personal data to:
        </p>
        <ul>
          <li>Provide our AI medical agent service.</li>
          <li>Manage our relationship with you.</li>
          <li>Improve our website, products/services, marketing or customer relationships.</li>
        </ul>

        <h2 className='heading-3 mt-8'>4. Data Security</h2>
        <p>
          We have put in place appropriate security measures to prevent your personal data from
          being accidentally lost, used or accessed in an unauthorised way. We do not sell your
          personal data to third parties.
        </p>
      </div>
    </div>
  );
}
