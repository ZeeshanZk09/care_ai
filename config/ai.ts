import OpenAI from 'openai';
import { env } from '@/env';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.OPEN_ROUTER_API_KEY,
});

export { openai };
