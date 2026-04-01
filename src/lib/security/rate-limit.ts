type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

type CaptchaChallenge = {
  prompt: string;
  answer: string;
  expiresAt: number;
};

const captchaChallenges = new Map<string, CaptchaChallenge>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  count: number;
};

const createMathCaptcha = () => {
  const left = Math.floor(Math.random() * 8) + 1;
  const right = Math.floor(Math.random() * 8) + 1;

  return {
    prompt: `What is ${left} + ${right}?`,
    answer: String(left + right),
  };
};

export const consumeRateLimit = (
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult => {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      remaining: Math.max(0, maxAttempts - 1),
      count: 1,
    };
  }

  current.count += 1;
  buckets.set(key, current);

  if (current.count > maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      remaining: 0,
      count: current.count,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    remaining: Math.max(0, maxAttempts - current.count),
    count: current.count,
  };
};

export const resetRateLimit = (key: string) => {
  buckets.delete(key);
};

export const issueCaptchaChallenge = (key: string, ttlMs: number) => {
  const now = Date.now();
  const existing = captchaChallenges.get(key);

  if (existing && existing.expiresAt > now) {
    return {
      prompt: existing.prompt,
      expiresAt: existing.expiresAt,
    };
  }

  const challenge = createMathCaptcha();
  const expiresAt = now + ttlMs;
  captchaChallenges.set(key, {
    prompt: challenge.prompt,
    answer: challenge.answer,
    expiresAt,
  });

  return {
    prompt: challenge.prompt,
    expiresAt,
  };
};

export const getCaptchaChallengePrompt = (key: string): string | null => {
  const challenge = captchaChallenges.get(key);
  if (!challenge) {
    return null;
  }

  if (challenge.expiresAt <= Date.now()) {
    captchaChallenges.delete(key);
    return null;
  }

  return challenge.prompt;
};

export const verifyCaptchaChallenge = (key: string, answer: string | null | undefined): boolean => {
  const challenge = captchaChallenges.get(key);
  if (!challenge) {
    return false;
  }

  if (challenge.expiresAt <= Date.now()) {
    captchaChallenges.delete(key);
    return false;
  }

  const normalizedAnswer = answer?.trim();
  if (!normalizedAnswer) {
    return false;
  }

  const verified = normalizedAnswer === challenge.answer;
  if (verified) {
    captchaChallenges.delete(key);
  }

  return verified;
};

export const clearCaptchaChallenge = (key: string) => {
  captchaChallenges.delete(key);
};
