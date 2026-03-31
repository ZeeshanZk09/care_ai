import Image from 'next/image';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { getPublishedBlogPosts } from '@/lib/blog';
import { buildBlogSchema } from '@/lib/structured-data';

export const revalidate = 3600;

const blogDescription =
  'Read articles on AI-powered health, symptom checking, telemedicine trends, and medical technology across Pakistan and worldwide care markets.';

export const metadata = buildMetadata({
  title: 'Health & AI Blog | Medical Insights, Tips & AI News',
  description: blogDescription,
  path: '/blog',
  keywords: [
    'AI health blog',
    'medical AI news',
    'telemedicine Pakistan',
    'AI symptom checker articles',
  ],
  type: 'website',
});

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  const schema = buildBlogSchema(
    posts.map((post) => ({
      title: post.title,
      url: `/blog/${post.slug}`,
      datePublished: post.publishedAt.toISOString(),
    })),
    blogDescription
  );

  return (
    <div className='section-container'>
      <script type='application/ld+json' suppressHydrationWarning>
        {JSON.stringify(schema)}
      </script>

      <header className='max-w-3xl'>
        <h1 className='heading-1'>Health & AI Blog</h1>
        <p className='subtext mt-4'>{blogDescription}</p>
      </header>

      <section className='mt-10 grid gap-6 md:grid-cols-2'>
        {posts.map((post, index) => (
          <article key={post.slug} className='card-responsive overflow-hidden'>
            <Image
              src={post.coverImage}
              alt={post.title}
              width={1200}
              height={630}
              className='h-52 w-full object-cover'
              priority={index === 0}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            <div className='p-6'>
              <p className='text-xs font-medium uppercase tracking-wide text-primary'>
                {post.category}
              </p>
              <h2 className='mt-2 text-2xl font-semibold'>
                <Link href={`/blog/${post.slug}`} className='hover:underline'>
                  {post.title}
                </Link>
              </h2>
              <p className='mt-3 text-sm text-muted-foreground'>{post.excerpt}</p>
              <p className='mt-4 text-xs text-muted-foreground'>
                Updated {post.updatedAt.toLocaleDateString()}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
