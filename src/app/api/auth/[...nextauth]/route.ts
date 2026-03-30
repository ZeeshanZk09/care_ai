import { handlers } from '@/auth';
import { withApiRequestAudit } from '@/lib/api/request-audit';

export const GET = withApiRequestAudit(async (request) => handlers.GET(request as any));
export const POST = withApiRequestAudit(async (request) => handlers.POST(request as any));
