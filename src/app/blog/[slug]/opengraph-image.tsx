import { ImageResponse } from 'next/og';
import { getPublishedBlogPostBySlug } from '@/lib/blog';
import { SITE_NAME } from '@/lib/seo.config';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

type OpenGraphImageProps = {
  params: Promise<{ slug: string }>;
};

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  const title = post?.title ?? 'MediVoice AI Blog';
  const category = post?.category ?? 'Health AI Insights';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(140deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)',
        color: '#ffffff',
        padding: '56px',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 700 }}>{SITE_NAME}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'inline-flex',
            width: 'fit-content',
            fontSize: 24,
            borderRadius: '999px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '8px 18px',
          }}
        >
          {category}
        </div>
        <div style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 800, maxWidth: '95%' }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 22, color: '#dbeafe' }}>medivoice.ai/blog</div>
    </div>,
    size
  );
}
