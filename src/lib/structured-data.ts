import {
  AUTHOR_NAME,
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from '@/lib/seo.config';

type OfferPlan = {
  name: string;
  price: number;
  priceCurrency: string;
  description: string;
  url: string;
};

type BlogListItem = {
  title: string;
  url: string;
  datePublished: string;
};

type FaqQuestion = { q: string; a: string };

type ArticleSchemaInput = {
  headline: string;
  description: string;
  slug: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  authorName?: string;
  keywords?: string[];
};

type SoftwareAppSchemaInput = {
  description?: string;
  featureList?: string[];
  offers?: OfferPlan[];
};

type BreadcrumbItem = { name: string; url: string };

const toAbsoluteUrl = (value: string) => {
  try {
    return new URL(value).toString();
  } catch {
    const normalized = value.startsWith('/') ? value : `/${value}`;
    return new URL(normalized, SITE_URL).toString();
  }
};

export const buildSoftwareAppSchema = (input: SoftwareAppSchemaInput = {}) => {
  const offers = input.offers?.map((offer) => ({
    '@type': 'Offer',
    name: offer.name,
    price: offer.price,
    priceCurrency: offer.priceCurrency,
    description: offer.description,
    url: toAbsoluteUrl(offer.url),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    description: input.description ?? SITE_DESCRIPTION,
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    featureList: input.featureList,
    offers,
  };
};

export const buildOrganizationSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: toAbsoluteUrl('/care_ai_logo.png'),
    foundingDate: '2026-01-01',
    description: SITE_DESCRIPTION,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@medivoice.ai',
      availableLanguage: ['en', 'ur'],
    },
  };
};

export const buildFAQSchema = (questions: FaqQuestion[]) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
};

export const buildArticleSchema = (post: ArticleSchemaInput) => {
  const image = post.image ? toAbsoluteUrl(post.image) : DEFAULT_OG_IMAGE;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.headline,
    description: post.description,
    image,
    author: {
      '@type': 'Person',
      name: post.authorName ?? AUTHOR_NAME,
    },
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    mainEntityOfPage: toAbsoluteUrl(`/blog/${post.slug}`),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl('/care_ai_logo.png'),
      },
    },
    keywords: post.keywords,
  };
};

export const buildBreadcrumbSchema = (items: BreadcrumbItem[]) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.url),
    })),
  };
};

export const buildOfferSchema = (plans: OfferPlan[]) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: plans.map((plan, index) => ({
      '@type': 'Offer',
      position: index + 1,
      name: plan.name,
      price: plan.price,
      priceCurrency: plan.priceCurrency,
      description: plan.description,
      url: toAbsoluteUrl(plan.url),
    })),
  };
};

export const buildBlogSchema = (posts: BlogListItem[], description = SITE_DESCRIPTION) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${SITE_NAME} Blog`,
    description,
    url: toAbsoluteUrl('/blog'),
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: toAbsoluteUrl(post.url),
      datePublished: post.datePublished,
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    })),
  };
};

export const buildContactPageSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `${SITE_NAME} Contact`,
    url: toAbsoluteUrl('/contact'),
    description: 'Get in touch with MediVoice AI for support, billing, and partnerships.',
    mainEntity: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      email: 'support@medivoice.ai',
    },
  };
};
