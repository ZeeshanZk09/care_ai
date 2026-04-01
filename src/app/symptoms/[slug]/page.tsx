import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  findSymptomLandingPage,
  symptomLandingPages,
} from "@/lib/content/growth-seo";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildFAQSchema } from "@/lib/structured-data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return symptomLandingPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: Readonly<PageProps>): Promise<Metadata> {
  const { slug } = await params;
  const page = findSymptomLandingPage(slug);

  if (!page) {
    return buildMetadata({
      title: "Symptom Guide Not Found",
      description: "The requested symptom guide could not be found.",
      path: `/symptoms/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${page.title} | CareAI`,
    description: page.description,
    path: `/symptoms/${slug}`,
    keywords: [
      page.title.toLowerCase(),
      "ai symptom consultation",
      "medical voice assistant triage",
    ],
  });
}

export default async function SymptomLandingPage({
  params,
}: Readonly<PageProps>) {
  const { slug } = await params;
  const page = findSymptomLandingPage(slug);

  if (!page) {
    notFound();
  }

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Symptom Guides", url: "/symptoms" },
    { name: page.title, url: `/symptoms/${page.slug}` },
  ]);

  const faqSchema = buildFAQSchema([
    {
      q: "How should I prepare my consultation notes?",
      a: "Include onset, severity, related symptoms, and any medications so the AI can ask better follow-up questions.",
    },
    {
      q: "When should I seek urgent care instead of online triage?",
      a: page.warning,
    },
    {
      q: "Can this page help improve specialist routing?",
      a: "Yes, focused symptom details improve specialist matching and report clarity.",
    },
  ]);

  return (
    <article className="section-container">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(faqSchema)}
      </script>

      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Symptom Guide
        </p>
        <h1 className="heading-1 mt-2">{page.title}</h1>
        <p className="subtext mt-4">{page.description}</p>
      </header>

      <section className="mt-8 rounded-xl border border-amber-300/60 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold text-amber-900">
          Urgent Care Signal
        </h2>
        <p className="mt-2 text-sm text-amber-900">{page.warning}</p>
      </section>

      <section className="mt-8 rounded-xl border p-6">
        <h2 className="text-2xl font-semibold">
          What to include in your consultation
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          {page.consultationTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={page.ctaHref}>{page.ctaLabel}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/faq/${page.faqTopicSlug}`}>
            Read Related FAQ Cluster
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/pricing">Compare Plans</Link>
        </Button>
      </section>
    </article>
  );
}
