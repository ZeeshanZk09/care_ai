import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const enforceCsrfProtection = (
  request: Request,
  options?: {
    allowMissingOrigin?: boolean;
  }
) => {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) {
    if (options?.allowMissingOrigin) {
      return null;
    }

    return NextResponse.json(
      { error: 'CSRF protection rejected this request (missing origin).' },
      { status: 403 }
    );
  }

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json(
        { error: 'CSRF protection rejected this request (origin mismatch).' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'CSRF protection rejected this request (invalid origin).' },
      { status: 403 }
    );
  }

  return null;
};
