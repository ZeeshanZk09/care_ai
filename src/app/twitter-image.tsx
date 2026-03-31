import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo.config';

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px',
        background:
          'linear-gradient(120deg, rgba(30,58,138,1) 0%, rgba(15,23,42,1) 50%, rgba(2,6,23,1) 100%)',
        color: '#ffffff',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div style={{ fontSize: 34, fontWeight: 700 }}>{SITE_NAME}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 800, maxWidth: '95%' }}>
          Your AI-Powered Medical Voice Assistant
        </div>
        <div style={{ fontSize: 28, color: '#cbd5e1', maxWidth: '90%' }}>{SITE_TAGLINE}</div>
      </div>

      <div style={{ fontSize: 22, color: '#93c5fd' }}>
        AI medical assistant • Voice health consultation • AI symptom analysis
      </div>
    </div>,
    size
  );
}
