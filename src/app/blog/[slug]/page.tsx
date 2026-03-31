import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RelatedLinks from '@/components/marketing/RelatedLinks';
import { getPublishedBlogPostBySlug, getPublishedBlogSlugs, getRelatedBlogPosts } from '@/lib/blog';
import { buildMetadata } from '@/lib/seo';
import { buildArticleSchema, buildBreadcrumbSchema } from '@/lib/structured-data';

export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getPublishedBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    return buildMetadata({
      title: 'Article Not Found',
      description: 'The requested blog post was not found.',
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    image: post.coverImage,
    keywords: post.tags,
    type: 'article',
    publishedTime: post.publishedAt.toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
    articleAuthors: [post.authorName],
    tags: post.tags,
  });
}

export default async function BlogPostPage({ params }: Readonly<PageProps>) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const articleSchema = buildArticleSchema({
    headline: post.title,
    description: post.excerpt,
    slug: post.slug,
    image: post.coverImage,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    authorName: post.authorName,
    keywords: post.tags,
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  const relatedPosts = await getRelatedBlogPosts(post.slug, post.category, 3);

  return (
    <article className='section-container'>
      <script type='application/ld+json' suppressHydrationWarning>
        {JSON.stringify(articleSchema)}
      </script>
      <script type='application/ld+json' suppressHydrationWarning>
        {JSON.stringify(breadcrumbSchema)}
      </script>

      <nav className='mb-6 text-sm text-muted-foreground'>
        <Link href='/' className='hover:underline'>
          Home
        </Link>{' '}
        /{' '}
        <Link href='/blog' className='hover:underline'>
          Blog
        </Link>{' '}
        / <span>{post.title}</span>
      </nav>

      <header className='max-w-4xl'>
        <p className='text-xs font-medium uppercase tracking-wide text-primary'>{post.category}</p>
        <h1 className='mt-2 text-4xl font-bold tracking-tight sm:text-5xl'>{post.title}</h1>
        <p className='mt-4 text-lg text-muted-foreground'>{post.excerpt}</p>
        <p className='mt-3 text-sm text-muted-foreground'>
          By {post.authorName} • Published {post.publishedAt.toLocaleDateString()} • Updated{' '}
          {post.updatedAt.toLocaleDateString()}
        </p>
      </header>

      <div className='mt-8 overflow-hidden rounded-xl border'>
        <Image
          src={post.coverImage}
          alt={post.title}
          width={1200}
          height={630}
          priority
          className='h-auto w-full object-cover'
        />
      </div>

      <section className='prose prose-slate mt-10 max-w-none dark:prose-invert'>
        {post.content
          .split(/\n\n+/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={`${post.slug}-p-${index}`}>{paragraph}</p>
          ))}
      </section>

      <RelatedLinks
        title='Keep Exploring'
        links={[
          {
            href: '/features',
            label: 'Explore Features',
            description: 'See how voice triage and specialist routing work.',
          },
          {
            href: '/pricing',
            label: 'Compare Pricing',
            description: 'Pick Free, Basic, or Pro based on consultation volume.',
          },
          ...relatedPosts.map((related) => ({
            href: `/blog/${related.slug}`,
            label: related.title,
            description: related.excerpt,
          })),
        ]}
      />
    </article>
  );
}
