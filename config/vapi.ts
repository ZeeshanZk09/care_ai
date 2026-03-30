import Vapi from '@vapi-ai/web';
import { env } from '@/env';

const vapi = new Vapi(env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);

export { vapi };
