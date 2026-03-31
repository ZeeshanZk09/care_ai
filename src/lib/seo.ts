import type { Metadata } from 'next';
import {
  AUTHOR_NAME,
  DEFAULT_OG_IMAGE,
  KEYWORDS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
} from '@/lib/seo.config';

type MetadataType = 'website' | 'article';

type BuildMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  keywords?: readonly string[];
  type?: MetadataType;
  noIndex?: boolean;
  titleAbsolute?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  articleAuthors?: string[];
  tags?: string[];
  robots?: Metadata['robots'];
};

const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

const normalizePath = (path: string | undefined) => {
  if (!path || path === '/') {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
};

const toAbsoluteUrl = (value: string) => {
  try {
    return new URL(value).toString();
  } catch {
    const normalized = value.startsWith('/') ? value : `/${value}`;
    return new URL(normalized, SITE_URL).toString();
  }
};

const mergeKeywords = (keywords: readonly string[]) => {
  const merged = [...KEYWORDS, ...keywords];
  return Array.from(new Set(merged));
};

const toRobots = (noIndex: boolean, overrides?: Metadata['robots']): Metadata['robots'] => {
  if (overrides) {
    return overrides;
  }

  if (noIndex) {
    return {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    index: true,
    follow: true,
  };
};

export const buildMetadata = ({
  title,
  description = SITE_DESCRIPTION,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  keywords = [],
  type = 'website',
  noIndex = false,
  titleAbsolute = false,
  publishedTime,
  modifiedTime,
  articleAuthors = [AUTHOR_NAME],
  tags = [],
  robots,
}: BuildMetadataOptions = {}): Metadata => {
  const normalizedPath = normalizePath(path);
  const absoluteImage = toAbsoluteUrl(image);
  const canonicalUrl = toAbsoluteUrl(normalizedPath);
  const mergedKeywords = mergeKeywords(keywords);

  const resolvedTitle: Metadata['title'] =
    titleAbsolute && title ? { absolute: title } : (title ?? SITE_NAME);

  const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: resolvedTitle,
    description,
    keywords: mergedKeywords,
    authors: [{ name: AUTHOR_NAME }],
    creator: AUTHOR_NAME,
    publisher: AUTHOR_NAME,
    alternates: {
      canonical: normalizedPath,
    },
    openGraph: {
      type,
      locale: 'en_US',
      siteName: SITE_NAME,
      url: canonicalUrl,
      title: title ?? SITE_NAME,
      description,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} social image`,
        },
      ],
      ...(type === 'article'
        ? {
            publishedTime,
            modifiedTime,
            authors: articleAuthors,
            tags,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: title ?? SITE_NAME,
      description,
      images: [absoluteImage],
    },
    robots: toRobots(noIndex, robots),
  };

  return metadata;
};

export const seoTitleTemplate = TITLE_TEMPLATE;
