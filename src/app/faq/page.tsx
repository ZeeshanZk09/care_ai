import Link from "next/link";
import RelatedLinks from "@/components/marketing/RelatedLinks";
import { buildMetadata } from "@/lib/seo";
import { buildFAQSchema } from "@/lib/structured-data";

const faqDescription =
  "Get answers about AI medical consultations, plan features, billing, data privacy, and symptom-checking accuracy before you start using MediVoice AI.";

export const metadata = buildMetadata({
  title: "FAQ | AI Medical Voice Assistant - Common Questions Answered",
  description: faqDescription,
  path: "/faq",
  keywords: [
    "AI medical assistant FAQ",
    "is AI health consultation safe",
    "medical AI accuracy",
    "AI doctor consultation questions",
  ],
  type: "website",
});

const faqGroups = [
  {
    category: "Safety and Accuracy",
    questions: [
      {
        q: "Is AI medical consultation safe?",
        a: "MediVoice AI is designed for preliminary guidance and triage support. It does not replace licensed clinicians for diagnosis or emergency treatment.",
      },
      {
        q: "How accurate is AI symptom checking?",
        a: "Accuracy depends on symptom clarity and context. Our system uses structured follow-up prompts and evidence-based logic to improve guidance quality.",
      },
      {
        q: "What AI models are used?",
        a: "Plans use different model tiers, from standard to premium. Higher tiers prioritize deeper reasoning and better specialist routing quality.",
      },
      {
        q: "Can I use this in Pakistan?",
        a: "Yes. MediVoice AI supports users in Pakistan and internationally through a web-based voice consultation experience.",
      },
    ],
  },
  {
    category: "Billing and Access",
    questions: [
      {
        q: "What happens after I pay?",
        a: "Your plan activates immediately, and your updated limits appear in dashboard billing details right after successful payment.",
      },
      {
        q: "How do I cancel my plan?",
        a: "Open your account billing section and cancel anytime. You keep access until the current billing period ends.",
      },
      {
        q: "What is the difference between Basic and Pro plans?",
        a: "Basic includes 50 consultations per month and faster models, while Pro provides unlimited consultations with premium AI and priority support.",
      },
      {
        q: "Is my health data private?",
        a: "We apply encrypted transport and controlled access policies. We do not sell personal health data to third parties.",
      },
    ],
  },
];

const faqSchema = buildFAQSchema(faqGroups.flatMap((group) => group.questions));

export default function FAQPage() {
  return (
    <div className="section-container">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(faqSchema)}
      </script>

      <header className="max-w-3xl">
        <h1 className="heading-1">Frequently Asked Questions</h1>
        <p className="subtext mt-4">{faqDescription}</p>
      </header>

      <div className="mt-10 space-y-10">
        {faqGroups.map((group) => (
          <section key={group.category}>
            <h2 className="text-2xl font-semibold">{group.category}</h2>
            <div className="mt-4 space-y-3">
              {group.questions.map((item) => (
                <article key={item.q}>
                  <details className="rounded-lg border p-4">
                    <summary className="cursor-pointer">
                      <h3 className="inline text-base font-medium">{item.q}</h3>
                    </summary>
                    <p className="mt-2 text-muted-foreground">{item.a}</p>
                  </details>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Need custom help? Visit{" "}
        <Link href="/contact" className="underline">
          contact support
        </Link>
        .
      </p>

      <RelatedLinks
        title="Helpful Next Steps"
        links={[
          {
            href: "/faq/safety-and-accuracy",
            label: "Safety and Accuracy Cluster",
            description:
              "Deep dive into triage reliability and escalation boundaries.",
          },
          {
            href: "/faq/billing-and-plans",
            label: "Billing and Plans Cluster",
            description: "Compare feature depth, costs, and upgrade paths.",
          },
          {
            href: "/pricing",
            label: "Compare Pricing",
            description: "Find the plan that matches your consultation volume.",
          },
          {
            href: "/symptoms",
            label: "Symptom Guides",
            description:
              "Start from symptom-specific guides before consultation.",
          },
          {
            href: "/contact",
            label: "Contact Support",
            description:
              "Ask about billing, partnerships, or product guidance.",
          },
        ]}
      />
    </div>
  );
}
