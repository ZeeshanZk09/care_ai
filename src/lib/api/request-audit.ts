import { auth } from '@/auth';
import { getClientIp, getUserAgent, writeAuditLog } from '@/lib/audit';

type ApiHandler<TContext = unknown> = (request: Request, context: TContext) => Promise<Response>;

export const withApiRequestAudit = <TContext>(handler: ApiHandler<TContext>) => {
  return async (request: Request, context: TContext): Promise<Response> => {
    const start = Date.now();
    let response: Response | null = null;
    let thrownError: unknown = null;

    try {
      response = await handler(request, context);
      return response;
    } catch (error) {
      thrownError = error;
      throw error;
    } finally {
      const durationMs = Date.now() - start;
      const path = new URL(request.url).pathname;
      const status = response?.status ?? 500;
      const session = await auth().catch(() => null);

      await writeAuditLog({
        userId: session?.user?.id,
        action: thrownError ? 'api.request.failed' : 'api.request.completed',
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: {
          method: request.method,
          path,
          status,
          durationMs,
          error: thrownError instanceof Error ? thrownError.message : null,
        },
      });
    }
  };
};
