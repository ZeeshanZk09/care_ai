import NextAuth, { customFetch } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { env } from '@/env';
import prisma from '@/lib/prisma';
import { getClientIp, getUserAgent, writeAuditLog } from '@/lib/audit';
import { consumeRateLimit, resetRateLimit } from '@/lib/security/rate-limit';
import bcrypt from 'bcryptjs';

const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
const SIGN_IN_MAX_ATTEMPTS = 5;

const OAUTH_FETCH_RETRY_LIMIT = 2;
const OAUTH_FETCH_TIMEOUT_MS = 10_000;
const OAUTH_FETCH_RETRY_DELAY_MS = 250;

const GOOGLE_OAUTH_HOST_REGEX =
  /(^|\.)accounts\.google\.com$|(^|\.)oauth2\.googleapis\.com$|(^|\.)openidconnect\.googleapis\.com$/i;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRequestUrl = (input: RequestInfo | URL) => {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (input instanceof Request) {
    return input.url;
  }

  return undefined;
};

const isGoogleOAuthRequest = (input: RequestInfo | URL) => {
  const requestUrl = getRequestUrl(input);
  if (!requestUrl) {
    return false;
  }

  try {
    const parsed = new URL(requestUrl);
    return GOOGLE_OAUTH_HOST_REGEX.test(parsed.hostname);
  } catch {
    return false;
  }
};

const getErrorDetails = (error: unknown) => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const causeMessage =
    error.cause && typeof error.cause === 'object' && 'message' in error.cause
      ? String((error.cause as { message?: unknown }).message)
      : '';

  return `${error.message} ${causeMessage}`.trim();
};

const isRetryableFetchError = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  const details = getErrorDetails(error);
  return /fetch failed|timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR|ECONNREFUSED/i.test(
    details
  );
};

const withTimeout = (signal: AbortSignal | null | undefined, timeoutMs: number) => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  let mergedSignal: AbortSignal;
  if (signal && typeof AbortSignal.any === 'function') {
    mergedSignal = AbortSignal.any([signal, timeoutController.signal]);
  } else if (signal) {
    mergedSignal = timeoutController.signal;
  } else {
    mergedSignal = timeoutController.signal;
  }

  return {
    signal: mergedSignal,
    clear: () => clearTimeout(timeoutId),
  };
};

const resilientOAuthFetch: typeof fetch = async (input, init) => {
  if (!isGoogleOAuthRequest(input)) {
    return fetch(input, init);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= OAUTH_FETCH_RETRY_LIMIT; attempt++) {
    const { signal, clear } = withTimeout(init?.signal, OAUTH_FETCH_TIMEOUT_MS);

    try {
      return await fetch(input, {
        ...init,
        signal,
      });
    } catch (error) {
      lastError = error;

      if (attempt >= OAUTH_FETCH_RETRY_LIMIT || !isRetryableFetchError(error)) {
        throw error;
      }

      await wait(OAUTH_FETCH_RETRY_DELAY_MS * (attempt + 1));
    } finally {
      clear();
    }
  }

  throw lastError;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
    maxAge: 900,
    updateAge: 300,
  },
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
      },
      [customFetch]: resilientOAuthFetch,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const ipAddress = getClientIp(request?.headers ?? null);
        const userAgent = getUserAgent(request?.headers ?? null);
        const limiterKey = `auth:signin:${ipAddress ?? 'unknown'}`;

        const limitResult = consumeRateLimit(limiterKey, SIGN_IN_MAX_ATTEMPTS, SIGN_IN_WINDOW_MS);

        if (!limitResult.allowed) {
          await writeAuditLog({
            action: 'auth.signin.rate_limited',
            ipAddress,
            userAgent,
            metadata: {
              email: credentials.email,
              retryAfterSeconds: limitResult.retryAfterSeconds,
            },
          });

          throw new Error('Too many sign-in attempts. Please try again in 15 minutes.');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.password) {
          await writeAuditLog({
            action: 'auth.signin.failed',
            ipAddress,
            userAgent,
            metadata: {
              email: credentials.email,
              reason: 'USER_NOT_FOUND_OR_PASSWORDLESS',
            },
          });
          return null;
        }

        if (user.status === 'BLOCKED') {
          await writeAuditLog({
            userId: user.id,
            action: 'auth.signin.blocked',
            ipAddress,
            userAgent,
            metadata: {
              email: user.email,
            },
          });

          throw new Error('Your account is blocked. Contact support for assistance.');
        }

        const isMatch = await bcrypt.compare(credentials.password as string, user.password);
        if (!isMatch) {
          await writeAuditLog({
            userId: user.id,
            action: 'auth.signin.failed',
            ipAddress,
            userAgent,
            metadata: {
              email: user.email,
              reason: 'INVALID_PASSWORD',
            },
          });
          return null;
        }

        if (!user.emailVerified) {
          await writeAuditLog({
            userId: user.id,
            action: 'auth.signin.failed',
            ipAddress,
            userAgent,
            metadata: {
              email: user.email,
              reason: 'EMAIL_NOT_VERIFIED',
            },
          });
          throw new Error('Email not verified');
        }

        resetRateLimit(limiterKey);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastActiveAt: new Date(),
          },
        });

        await writeAuditLog({
          userId: user.id,
          action: 'auth.signin.success',
          ipAddress,
          userAgent,
          metadata: {
            email: user.email,
          },
        });

        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials' && !user.email) {
        return false;
      }

      let dbUser: { id: string; status: string; email: string } | null = null;
      if (user.id) {
        dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            status: true,
            email: true,
          },
        });
      } else if (user.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            status: true,
            email: true,
          },
        });
      }

      if (dbUser?.status === 'BLOCKED') {
        await writeAuditLog({
          userId: dbUser.id,
          action: 'auth.signin.blocked',
          metadata: {
            provider: account?.provider,
            email: dbUser.email,
          },
        });
        return '/auth/error?reason=blocked';
      }

      return true;
    },
    async session({ session, user }) {
      const userId = user?.id ?? session.user?.id;
      const userEmail = user?.email ?? session.user?.email;

      let dbUser: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        role: 'USER' | 'ADMIN';
        status: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED';
        planTier: 'FREE' | 'BASIC' | 'PRO';
        premiumAccessGrantedAt: Date | null;
      } | null = null;

      if (userId) {
        dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            status: true,
            planTier: true,
            premiumAccessGrantedAt: true,
          },
        });
      } else if (userEmail) {
        dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            status: true,
            planTier: true,
            premiumAccessGrantedAt: true,
          },
        });
      }

      if (!dbUser) {
        return session;
      }

      session.user.id = dbUser.id;
      session.user.name = dbUser.name;
      session.user.email = dbUser.email;
      session.user.image = dbUser.image;
      session.user.role = dbUser.role;
      session.user.status = dbUser.status;
      session.user.planTier = dbUser.planTier;
      session.user.premiumAccessGrantedAt = dbUser.premiumAccessGrantedAt;
      return session;
    },
  },
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
  },
  secret: env.NEXTAUTH_SECRET,
});
