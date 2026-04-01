import NextAuth, { customFetch } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { env } from '@/env';
import prisma from '@/lib/prisma';
import { notifySecurityAlert } from '@/lib/alerts';
import { getClientIp, getUserAgent, writeAuditLog } from '@/lib/audit';
import { accountRestrictedTemplate } from '@/lib/email-templates';
import { sendEmail } from '@/lib/mail';
import {
  clearCaptchaChallenge,
  consumeRateLimit,
  getCaptchaChallengePrompt,
  issueCaptchaChallenge,
  verifyCaptchaChallenge,
} from '@/lib/security/rate-limit';
import bcrypt from 'bcryptjs';

const SIGN_IN_WINDOW_MS = 60 * 60 * 1000;
const SIGN_IN_MAX_ATTEMPTS = 5;
const SIGN_IN_LOCK_THRESHOLD = 10;
const SIGN_IN_LOCK_DURATION_MS = 60 * 60 * 1000;
const CAPTCHA_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const FAILED_LOGIN_ALERT_THRESHOLD = 3;
const FAILED_LOGIN_ALERT_WINDOW_MS = 5 * 60 * 1000;
const FAILED_LOGIN_SPIKE_THRESHOLD = 10;
const GLOBAL_FAILED_LOGIN_24H_THRESHOLD = 20;
const GLOBAL_FAILED_LOGIN_ALERT_WINDOW_MS = 60 * 60 * 1000;
const AGENT_ID = 'GPT-5.3-Codex';
const CAPTCHA_ERROR_PREFIX = 'CAPTCHA_REQUIRED|';

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

const normalizeEmailValue = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
};

const buildCaptchaErrorMessage = (prompt: string, retryAfterSeconds: number) => {
  return `${CAPTCHA_ERROR_PREFIX}${prompt}|${retryAfterSeconds}`;
};

type FailedSignInEventInput = {
  userId?: string | null;
  email: string;
  reason: string;
  ipAddress: string | null;
  userAgent: string | null;
};

type AuthUserRecord = {
  id: string;
  email: string;
  name: string | null;
  password: string | null;
  emailVerified: Date | null;
  status: 'ACTIVE' | 'RESTRICTED' | 'BLOCKED';
  restrictionReason: string | null;
  restrictionEndsAt: Date | null;
};

type RollingFailureCounts = {
  ipFailures: number;
  userFailures: number;
  combinedFailures: number;
};

const isFailedLoginLockActive = (user: AuthUserRecord, now = new Date()) => {
  return (
    user.status === 'RESTRICTED' &&
    user.restrictionReason === 'FAILED_LOGIN_LOCK' &&
    Boolean(user.restrictionEndsAt && user.restrictionEndsAt > now)
  );
};

const clearExpiredFailedLoginLock = async (user: AuthUserRecord, now = new Date()) => {
  if (
    user.status !== 'RESTRICTED' ||
    user.restrictionReason !== 'FAILED_LOGIN_LOCK' ||
    !user.restrictionEndsAt ||
    user.restrictionEndsAt > now
  ) {
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: 'ACTIVE',
      restrictionReason: null,
      restrictionEndsAt: null,
    },
  });
};

const getRollingFailureCounts = async (input: {
  ipAddress: string | null;
  userId?: string | null;
}) => {
  const since = new Date(Date.now() - SIGN_IN_WINDOW_MS);

  const [ipFailures, userFailures] = await Promise.all([
    input.ipAddress
      ? prisma.auditLog.count({
          where: {
            action: 'auth.signin.failed',
            ipAddress: input.ipAddress,
            createdAt: {
              gte: since,
            },
          },
        })
      : Promise.resolve(0),
    input.userId
      ? prisma.auditLog.count({
          where: {
            action: 'auth.signin.failed',
            userId: input.userId,
            createdAt: {
              gte: since,
            },
          },
        })
      : Promise.resolve(0),
  ]);

  return {
    ipFailures,
    userFailures,
    combinedFailures: Math.max(ipFailures, userFailures),
  } as RollingFailureCounts;
};

const lockUserForFailedSignins = async (input: {
  user: AuthUserRecord;
  ipAddress: string | null;
  userAgent: string | null;
  email: string;
}) => {
  const lockUntil = new Date(Date.now() + SIGN_IN_LOCK_DURATION_MS);

  await prisma.user.update({
    where: { id: input.user.id },
    data: {
      status: 'RESTRICTED',
      restrictionReason: 'FAILED_LOGIN_LOCK',
      restrictionEndsAt: lockUntil,
    },
  });

  const template = accountRestrictedTemplate(
    input.user.name,
    'Multiple failed sign-in attempts detected. Temporary lock enabled for account safety.',
    lockUntil.toISOString()
  );

  try {
    await sendEmail(input.user.email, template.subject, template.html, {
      userId: input.user.id,
      templateName: 'security_failed_login_lock',
      metadata: {
        reason: 'FAILED_LOGIN_LOCK',
        lockUntil: lockUntil.toISOString(),
      },
    });
  } catch {
    // Ignore email dispatch failures; security alerting still runs.
  }

  await notifySecurityAlert({
    subject: 'CareAI security lock: account temporarily restricted',
    summary: `Account ${input.user.email} was temporarily locked after repeated failed sign-ins.`,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      userId: input.user.id,
      email: input.email,
      lockUntil: lockUntil.toISOString(),
      reason: 'FAILED_LOGIN_LOCK',
      agentId: AGENT_ID,
    },
  });

  return lockUntil;
};

type AuthorizeContext = {
  normalizedEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  captchaKey: string;
};

const buildAuthorizeContext = (
  credentials:
    | {
        email?: unknown;
      }
    | undefined,
  request: Request | undefined
): AuthorizeContext => {
  const normalizedEmail = normalizeEmailValue(credentials?.email);
  const ipAddress = getClientIp(request?.headers ?? null);
  const userAgent = getUserAgent(request?.headers ?? null);
  const normalizedIp = ipAddress ?? 'unknown';

  return {
    normalizedEmail,
    ipAddress,
    userAgent,
    captchaKey: `auth:signin:captcha:${normalizedIp}:${normalizedEmail}`,
  };
};

const loadUserForAuthorize = async (normalizedEmail: string, now: Date) => {
  let user = (await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })) as AuthUserRecord | null;

  if (!user) {
    return null;
  }

  await clearExpiredFailedLoginLock(user, now);
  if (
    user.status === 'RESTRICTED' &&
    user.restrictionReason === 'FAILED_LOGIN_LOCK' &&
    user.restrictionEndsAt &&
    user.restrictionEndsAt <= now
  ) {
    user = {
      ...user,
      status: 'ACTIVE',
      restrictionReason: null,
      restrictionEndsAt: null,
    };
  }

  return user;
};

const enforceCaptchaForAuthorize = async (
  context: AuthorizeContext,
  combinedFailures: number,
  captchaAnswer: unknown
) => {
  const existingCaptchaPrompt = getCaptchaChallengePrompt(context.captchaKey);
  const captchaRequired = combinedFailures >= SIGN_IN_MAX_ATTEMPTS || Boolean(existingCaptchaPrompt);

  if (!captchaRequired) {
    return;
  }

  const normalizedCaptchaAnswer = typeof captchaAnswer === 'string' ? captchaAnswer : '';

  if (!existingCaptchaPrompt) {
    const challenge = issueCaptchaChallenge(context.captchaKey, CAPTCHA_CHALLENGE_TTL_MS);

    await writeAuditLog({
      action: 'auth.signin.captcha_issued',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        email: context.normalizedEmail,
        prompt: challenge.prompt,
        retryAfterSeconds: Math.floor(CAPTCHA_CHALLENGE_TTL_MS / 1000),
        occurredAt: new Date().toISOString(),
        agentId: AGENT_ID,
      },
    });

    throw new Error(
      buildCaptchaErrorMessage(challenge.prompt, Math.floor(CAPTCHA_CHALLENGE_TTL_MS / 1000))
    );
  }

  const captchaVerified = verifyCaptchaChallenge(context.captchaKey, normalizedCaptchaAnswer);
  if (captchaVerified) {
    await writeAuditLog({
      action: 'auth.signin.captcha_passed',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        email: context.normalizedEmail,
        occurredAt: new Date().toISOString(),
        agentId: AGENT_ID,
      },
    });
    return;
  }

  await writeAuditLog({
    action: 'auth.signin.captcha_required',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: {
      email: context.normalizedEmail,
      prompt: existingCaptchaPrompt,
      occurredAt: new Date().toISOString(),
      agentId: AGENT_ID,
    },
  });

  throw new Error(
    buildCaptchaErrorMessage(existingCaptchaPrompt, Math.floor(CAPTCHA_CHALLENGE_TTL_MS / 1000))
  );
};

const maybeLockUserForFailureThreshold = async (
  user: AuthUserRecord | null,
  combinedFailures: number,
  context: AuthorizeContext
) => {
  if (!user || combinedFailures < SIGN_IN_LOCK_THRESHOLD) {
    return null;
  }

  const lockUntil = await lockUserForFailedSignins({
    user,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    email: user.email,
  });

  throw new Error(
    `Too many failed sign-in attempts. Your account is locked until ${lockUntil.toISOString()}.`
  );
};

const handleFailedCredentialState = async (input: {
  user: AuthUserRecord;
  reason: 'INVALID_PASSWORD' | 'EMAIL_NOT_VERIFIED';
  context: AuthorizeContext;
  combinedFailures: number;
}) => {
  await recordFailedSignInAttempt({
    userId: input.user.id,
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
    email: input.user.email,
    reason: input.reason,
  });

  await maybeLockUserForFailureThreshold(input.user, input.combinedFailures + 1, input.context);
};

const recordFailedSignInAttempt = async ({
  userId,
  email,
  reason,
  ipAddress,
  userAgent,
}: FailedSignInEventInput) => {
  const occurredAt = new Date().toISOString();
  const normalizedIp = ipAddress ?? 'unknown';

  await writeAuditLog({
    userId: userId ?? null,
    action: 'auth.signin.failed',
    ipAddress,
    userAgent,
    metadata: {
      email,
      reason,
      occurredAt,
      agentId: AGENT_ID,
    },
  });

  const alertWindow = consumeRateLimit(
    `auth:signin:alert:${normalizedIp}`,
    FAILED_LOGIN_ALERT_THRESHOLD,
    FAILED_LOGIN_ALERT_WINDOW_MS
  );

  if (!alertWindow.allowed) {
    const dispatchWindow = consumeRateLimit(
      `auth:signin:alert:dispatch:${normalizedIp}`,
      1,
      FAILED_LOGIN_ALERT_WINDOW_MS
    );

    if (dispatchWindow.allowed) {
      await notifySecurityAlert({
        subject: 'CareAI security alert: repeated failed logins',
        summary: `IP ${normalizedIp} exceeded 3 failed logins within 5 minutes.`,
        ipAddress,
        userAgent,
        metadata: {
          email,
          reason,
          failedAttemptsInWindow: alertWindow.count,
          windowSeconds: Math.floor(FAILED_LOGIN_ALERT_WINDOW_MS / 1000),
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    }
  }

  const escalationWindow = consumeRateLimit(
    `auth:signin:escalation:${normalizedIp}`,
    FAILED_LOGIN_SPIKE_THRESHOLD,
    SIGN_IN_WINDOW_MS
  );

  if (!escalationWindow.allowed) {
    const escalationDispatch = consumeRateLimit(
      `auth:signin:escalation:dispatch:${normalizedIp}`,
      1,
      SIGN_IN_WINDOW_MS
    );

    if (escalationDispatch.allowed) {
      await writeAuditLog({
        userId: userId ?? null,
        action: 'security.escalation.required',
        ipAddress,
        userAgent,
        metadata: {
          reason: 'FAILED_LOGIN_SPIKE',
          threshold: FAILED_LOGIN_SPIKE_THRESHOLD,
          windowSeconds: Math.floor(SIGN_IN_WINDOW_MS / 1000),
          failedAttemptsInWindow: escalationWindow.count,
          email,
          occurredAt,
          agentId: AGENT_ID,
        },
      });

      await notifySecurityAlert({
        subject: 'CareAI escalation required: login spike detected',
        summary: `IP ${normalizedIp} exceeded 10 failed logins within 10 minutes. Human operator escalation required.`,
        ipAddress,
        userAgent,
        metadata: {
          email,
          reason,
          failedAttemptsInWindow: escalationWindow.count,
          occurredAt,
          agentId: AGENT_ID,
        },
      });
    }
  }

  const failedLogins24h = await prisma.auditLog.count({
    where: {
      action: 'auth.signin.failed',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (failedLogins24h > GLOBAL_FAILED_LOGIN_24H_THRESHOLD) {
    const globalDispatch = consumeRateLimit(
      'auth:signin:global24h:dispatch',
      1,
      GLOBAL_FAILED_LOGIN_ALERT_WINDOW_MS
    );

    if (globalDispatch.allowed) {
      await writeAuditLog({
        userId: userId ?? null,
        action: 'security.monitoring.failed_logins_24h.threshold_exceeded',
        ipAddress,
        userAgent,
        metadata: {
          failedLogins24h,
          threshold: GLOBAL_FAILED_LOGIN_24H_THRESHOLD,
          occurredAt,
          email,
          reason,
          agentId: AGENT_ID,
        },
      });

      await notifySecurityAlert({
        subject: 'CareAI security alert: failed-logins exceeded 24h threshold',
        summary:
          'Global failed sign-ins exceeded the 24-hour threshold. Challenge and lock controls should be verified.',
        ipAddress,
        userAgent,
        metadata: {
          failedLogins24h,
          threshold: GLOBAL_FAILED_LOGIN_24H_THRESHOLD,
          occurredAt,
          email,
          reason,
          agentId: AGENT_ID,
        },
      });
    }
  }
};

const authorizeCredentials = async (
  credentials:
    | {
        email?: unknown;
        password?: unknown;
        captchaAnswer?: unknown;
      }
    | undefined,
  request: Request | undefined,
) => {
  if (!credentials?.email || !credentials?.password) return null;

  const context = buildAuthorizeContext(credentials, request);
  const now = new Date();

  const user = await loadUserForAuthorize(context.normalizedEmail, now);

  if (user && isFailedLoginLockActive(user, now)) {
    throw new Error('Too many failed sign-in attempts. Your account is temporarily locked.');
  }

  const rollingFailures = await getRollingFailureCounts({
    ipAddress: context.ipAddress,
    userId: user?.id ?? null,
  });
  await enforceCaptchaForAuthorize(context, rollingFailures.combinedFailures, credentials.captchaAnswer);
  await maybeLockUserForFailureThreshold(user, rollingFailures.combinedFailures, context);

  if (!user?.password) {
    await recordFailedSignInAttempt({
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      email: context.normalizedEmail,
      reason: 'USER_NOT_FOUND_OR_PASSWORDLESS',
    });
    return null;
  }

  if (user.status === 'BLOCKED') {
    await writeAuditLog({
      userId: user.id,
      action: 'auth.signin.blocked',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        email: user.email,
      },
    });

    throw new Error('Your account is blocked. Contact support for assistance.');
  }

  if (user.status === 'RESTRICTED' && user.restrictionReason !== 'FAILED_LOGIN_LOCK') {
    throw new Error('Your account is currently restricted. Please contact support.');
  }

  const isMatch = await bcrypt.compare(credentials.password as string, user.password);
  if (!isMatch) {
    await handleFailedCredentialState({
      user,
      reason: 'INVALID_PASSWORD',
      context,
      combinedFailures: rollingFailures.combinedFailures,
    });

    return null;
  }

  if (!user.emailVerified) {
    await handleFailedCredentialState({
      user,
      reason: 'EMAIL_NOT_VERIFIED',
      context,
      combinedFailures: rollingFailures.combinedFailures,
    });

    throw new Error('Email not verified');
  }

  clearCaptchaChallenge(context.captchaKey);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastActiveAt: new Date(),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: 'auth.signin.success',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: {
      email: user.email,
    },
  });

  return user;
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
        captchaAnswer: { label: 'Captcha', type: 'text' },
      },
      async authorize(credentials, request) {
        return authorizeCredentials(credentials, request);
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
