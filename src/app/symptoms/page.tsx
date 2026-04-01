import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";
import { symptomLandingPages } from "@/lib/content/growth-seo";

export const metadata = buildMetadata({
  title: "Symptom Guides | AI Consultation Entry Pages",
  description:
    "Explore symptom-focused AI consultation guides for chest pain, migraines, and stomach pain with structured CTAs.",
  path: "/symptoms",
  keywords: [
    "symptom triage pages",
    "AI chest pain consultation",
    "migraine symptom checker",
    "stomach pain triage",
  ],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Symptom Guides", url: "/symptoms" },
]);

export default function SymptomGuidesPage() {
  return (
    <div className="section-container">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumbSchema)}
      </script>

      <header className="max-w-3xl">
        <h1 className="heading-1">Symptom-Focused Consultation Guides</h1>
        <p className="subtext mt-4">
          Start with a focused symptom page to prepare better notes and improve
          consultation quality before your next CareAI session.
        </p>
      </header>

      <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {symptomLandingPages.map((page) => (
          <article
            key={page.slug}
            className="card-responsive flex flex-col p-6"
          >
            <h2 className="text-xl font-semibold">{page.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {page.description}
            </p>
            <p className="mt-4 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900">
              {page.warning}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/symptoms/${page.slug}`}>Read Guide</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={page.ctaHref}>{page.ctaLabel}</Link>
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
