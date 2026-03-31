import type { MetadataRoute } from 'next';
import { getPublishedBlogPosts } from '@/lib/blog';
import { SITE_URL } from '@/lib/seo.config';

const toUrl = (path: string) => `${SITE_URL}${path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const publicRoutes: MetadataRoute.Sitemap = [
    {
      url: toUrl('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: toUrl('/pricing'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: toUrl('/features'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: toUrl('/blog'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: toUrl('/faq'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: toUrl('/about'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: toUrl('/contact'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: toUrl('/terms'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: toUrl('/privacy'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const posts = await getPublishedBlogPosts();
  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: toUrl(`/blog/${post.slug}`),
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...publicRoutes, ...blogEntries];
}
