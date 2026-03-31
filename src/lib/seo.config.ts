const normalizeSiteUrl = (value: string | undefined) => {
  const fallback = 'http://localhost:3000';
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
};

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL
);

export const SITE_NAME = 'MediVoice AI';
export const SITE_TAGLINE = 'Your AI-Powered Medical Voice Assistant';
export const SITE_DESCRIPTION =
  'MediVoice AI is an AI medical assistant for voice health consultation and AI symptom analysis, helping patients get faster, safer guidance online.';
export const TWITTER_HANDLE = '@MediVoiceAI';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/default.png`;
export const AUTHOR_NAME = 'MediVoice AI';

export const KEYWORDS = [
  'AI medical voice assistant',
  'online doctor consultation',
  'AI symptom checker',
  'voice health assistant Pakistan',
  'medical AI SaaS',
  'health AI chatbot',
  'AI medical assistant',
  'voice health consultation',
  'AI symptom analysis',
  'online health consultation',
] as const;
