import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo.config';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px',
        background: 'radial-gradient(circle at 10% 20%, #1e3a8a 0%, #0f172a 45%, #020617 100%)',
        color: '#ffffff',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
          }}
        />
        <div style={{ fontSize: 36, fontWeight: 700 }}>{SITE_NAME}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ fontSize: 64, lineHeight: 1.1, fontWeight: 800, maxWidth: '92%' }}>
          Your AI-Powered Medical Voice Assistant
        </div>
        <div style={{ fontSize: 30, color: '#cbd5e1', maxWidth: '85%' }}>{SITE_TAGLINE}</div>
      </div>

      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#93c5fd' }}
      >
        <span>Instant symptom analysis</span>
        <span>Voice-first consultations</span>
      </div>
    </div>,
    size
  );
}
