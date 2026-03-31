import { buildMetadata } from '@/lib/seo';
import { buildOrganizationSchema } from '@/lib/structured-data';

export const metadata = buildMetadata({
  title: 'About Us | Trusted AI Medical Assistant Platform',
  description:
    'Learn why we built MediVoice AI and how we deliver secure, accessible healthcare guidance through AI-powered voice consultations.',
  path: '/about',
  keywords: ['about MediVoice AI', 'AI health startup Pakistan', 'medical AI team'],
  type: 'website',
});

export default function AboutPage() {
  const organizationSchema = buildOrganizationSchema();

  return (
    <div className='section-container'>
      <script type='application/ld+json' suppressHydrationWarning>
        {JSON.stringify(organizationSchema)}
      </script>

      <div className='max-w-3xl mx-auto'>
        <h1 className='heading-1 text-center mb-8'>About CareAI</h1>

        <div className='prose prose-lg dark:prose-invert mx-auto'>
          <p className='text-lg text-muted-foreground mb-6'>
            CareAI is revolutionizing the way patients get initial medical guidance. By leveraging
            cutting-edge Artificial Intelligence voice agents, we provide immediate, accessible, and
            personalized health assistance.
          </p>

          <h2 className='heading-3 mt-10 mb-4'>Our Mission</h2>
          <p className='text-muted-foreground mb-6'>
            Our mission is to democratize access to basic healthcare guidance. We believe everyone
            deserves quick, accurate, and compassionate understanding of their symptoms before they
            make the trip to a hospital or clinic.
          </p>

          <h2 className='heading-3 mt-10 mb-4'>How It Works</h2>
          <ul className='list-disc pl-6 text-muted-foreground space-y-2 mb-6'>
            <li>Describe your symptoms to our smart triage system.</li>
            <li>
              Get matched with specialized AI doctor agents (e.g., Pediatrician, Cardiologist).
            </li>
            <li>Engage in a voice or text consultation to explore your symptoms.</li>
            <li>Receive a summarized consultation report to share with your real-life doctor.</li>
          </ul>

          <h2 className='heading-3 mt-10 mb-4'>Disclaimer</h2>
          <p className='text-muted-foreground p-4 bg-muted rounded-lg border border-border'>
            CareAI is designed for educational and preliminary guidance purposes only. It is{' '}
            <strong>not</strong> a substitute for professional medical advice, diagnosis, or
            treatment. Always seek the advice of your physician or other qualified health provider
            with any questions you may have regarding a medical condition.
          </p>
        </div>
      </div>
    </div>
  );
}
