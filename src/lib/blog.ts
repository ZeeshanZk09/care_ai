import prisma from '@/lib/prisma';

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage: string;
  publishedAt: Date;
  updatedAt: Date;
  authorName: string;
};

type BlogPostRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  tags: unknown;
  coverImage: string | null;
  publishedAt: Date | string | null;
  updatedAt: Date | string | null;
  authorName: string | null;
};

const FALLBACK_POSTS: BlogPost[] = [
  {
    slug: 'ai-symptom-analysis-works',
    title: 'How AI Symptom Analysis Works in Real-Time Voice Consultations',
    excerpt:
      'Learn how voice-first triage can capture symptoms quickly and guide patients to safer next steps with evidence-based AI support.',
    content:
      'AI symptom analysis combines natural language understanding, medical triage logic, and context-aware follow-up prompts to help users describe issues clearly.\n\nIn a voice workflow, patients speak naturally while the assistant asks clarifying questions, reducing friction compared with long forms.\n\nThe result is faster preliminary guidance and better routing to the right specialist when needed.',
    category: 'AI Health',
    tags: ['AI medical assistant', 'voice consultation', 'symptom checker'],
    coverImage: '/medical-assistance.png',
    publishedAt: new Date('2026-02-10T08:30:00.000Z'),
    updatedAt: new Date('2026-03-10T08:30:00.000Z'),
    authorName: 'MediVoice AI Team',
  },
  {
    slug: 'telemedicine-trends-pakistan',
    title: 'Telemedicine Trends in Pakistan: What Patients Expect in 2026',
    excerpt:
      'From instant access to multilingual support, discover the trends shaping online health consultations across Pakistan.',
    content:
      'Telemedicine in Pakistan continues to grow as users expect immediate answers, transparent pricing, and trustworthy digital care experiences.\n\nVoice-enabled AI assistants support this shift by reducing wait times and making consultations easier for first-time users.\n\nProviders that pair accessibility with strong privacy controls are earning long-term user trust.',
    category: 'Telemedicine',
    tags: ['telemedicine Pakistan', 'online doctor consultation'],
    coverImage: '/brain.png',
    publishedAt: new Date('2026-02-24T10:00:00.000Z'),
    updatedAt: new Date('2026-03-15T10:00:00.000Z'),
    authorName: 'MediVoice AI Team',
  },
  {
    slug: 'secure-health-data-ai-saas',
    title: 'Securing Health Data in Medical AI SaaS Platforms',
    excerpt:
      'A practical overview of data minimization, encryption, and access controls for voice-based health AI products.',
    content:
      'Security in health AI starts with collecting only what is necessary and protecting that information throughout its lifecycle.\n\nBest practices include strict access controls, encrypted transport and storage, and clear retention policies.\n\nTeams should also communicate privacy safeguards in simple language so users understand how their data is handled.',
    category: 'Security',
    tags: ['health data privacy', 'medical AI SaaS', 'security'],
    coverImage: '/care_ai_logo.png',
    publishedAt: new Date('2026-03-01T09:00:00.000Z'),
    updatedAt: new Date('2026-03-20T09:00:00.000Z'),
    authorName: 'MediVoice AI Team',
  },
];

const parseTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const toDate = (value: Date | string | null | undefined, fallback: Date) => {
  if (!value) {
    return fallback;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const rowToPost = (row: BlogPostRow): BlogPost => {
  const now = new Date();

  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? 'Read the latest MediVoice AI update.',
    content: row.content ?? row.excerpt ?? 'This article will be available soon.',
    category: row.category ?? 'General',
    tags: parseTags(row.tags),
    coverImage: row.coverImage ?? '/og/default.png',
    publishedAt: toDate(row.publishedAt, now),
    updatedAt: toDate(row.updatedAt, now),
    authorName: row.authorName ?? 'MediVoice AI Team',
  };
};

const queryPublishedPosts = async (): Promise<BlogPost[]> => {
  const rows = await prisma.$queryRaw<BlogPostRow[]>`
    SELECT
      "slug",
      "title",
      "excerpt",
      "content",
      "category",
      "tags",
      "coverImage",
      "publishedAt",
      "updatedAt",
      "authorName"
    FROM "BlogPost"
    WHERE "isPublished" = true
    ORDER BY "publishedAt" DESC
  `;

  return rows.map(rowToPost).filter((post) => Boolean(post.slug && post.title));
};

export const getPublishedBlogPosts = async (): Promise<BlogPost[]> => {
  try {
    const posts = await queryPublishedPosts();
    if (posts.length > 0) {
      return posts;
    }
  } catch {
    // Fallback is used when BlogPost table or columns are unavailable.
    return FALLBACK_POSTS;
  }

  return FALLBACK_POSTS;
};

export const getPublishedBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  const allPosts = await getPublishedBlogPosts();
  return allPosts.find((post) => post.slug === slug) ?? null;
};

export const getPublishedBlogSlugs = async () => {
  const posts = await getPublishedBlogPosts();
  return posts.map((post) => post.slug);
};

export const getRelatedBlogPosts = async (slug: string, category: string, limit = 3) => {
  const posts = await getPublishedBlogPosts();

  const byCategory = posts
    .filter((post) => post.slug !== slug && post.category === category)
    .slice(0, limit);

  if (byCategory.length >= limit) {
    return byCategory;
  }

  const remaining = posts
    .filter((post) => post.slug !== slug && !byCategory.some((item) => item.slug === post.slug))
    .slice(0, limit - byCategory.length);

  return [...byCategory, ...remaining];
};
