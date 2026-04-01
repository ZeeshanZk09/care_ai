import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  faqTopicClusters,
  findFaqTopicCluster,
} from "@/lib/content/growth-seo";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildFAQSchema } from "@/lib/structured-data";

type PageProps = {
  params: Promise<{ topic: string }>;
};

export function generateStaticParams() {
  return faqTopicClusters.map((topic) => ({ topic: topic.slug }));
}

export async function generateMetadata({
  params,
}: Readonly<PageProps>): Promise<Metadata> {
  const { topic } = await params;
  const cluster = findFaqTopicCluster(topic);

  if (!cluster) {
    return buildMetadata({
      title: "FAQ Topic Not Found",
      description: "The requested FAQ topic cluster could not be found.",
      path: `/faq/${topic}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${cluster.title} | CareAI FAQ`,
    description: cluster.description,
    path: `/faq/${cluster.slug}`,
    keywords: ["faq topic cluster", "careai support", cluster.slug],
  });
}

export default async function FaqTopicPage({ params }: Readonly<PageProps>) {
  const { topic } = await params;
  const cluster = findFaqTopicCluster(topic);

  if (!cluster) {
    notFound();
  }

  const faqSchema = buildFAQSchema(cluster.questions);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "FAQ", url: "/faq" },
    { name: cluster.title, url: `/faq/${cluster.slug}` },
  ]);

  return (
    <div className="section-container">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(faqSchema)}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumbSchema)}
      </script>

      <header className="max-w-3xl">
        <h1 className="heading-1">{cluster.title}</h1>
        <p className="subtext mt-4">{cluster.description}</p>
      </header>

      <section className="mt-8 space-y-4">
        {cluster.questions.map((item) => (
          <details key={item.q} className="rounded-lg border p-4">
            <summary className="cursor-pointer text-base font-medium">
              {item.q}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/dashboard">Start Consultation</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/pricing">Compare Plans</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/symptoms">Explore Symptom Guides</Link>
        </Button>
      </section>
    </div>
  );
}
