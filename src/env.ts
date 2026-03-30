import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  OPEN_ROUTER_API_KEY: z.string().min(1),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  AUTH_URL: z.url().optional(),
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: z.string().min(1),
  NEXT_PUBLIC_VAPI_ASSISTANT_ID: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_BASIC_PRICE_ID: z.string().min(1).optional(),
  STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),
  EMAIL_USER: z.string().min(1).optional(),
  EMAIL_PASS: z.string().min(1).optional(),
  EMAIL_FROM_NAME: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_ADMIN_NAME: z.string().min(1).optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");

  throw new Error(`Environment validation failed: ${errors}`);
}

export const env = parsedEnv.data;

const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_BASIC_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),
});

const emailSchema = z.object({
  EMAIL_USER: z.string().min(1),
  EMAIL_PASS: z.string().min(1),
  EMAIL_FROM_NAME: z.string().min(1).optional(),
});

const cronSchema = z.object({
  CRON_SECRET: z.string().min(1),
});

export const requireStripeEnv = () => {
  return stripeSchema.parse(env);
};

export const requireEmailEnv = () => {
  return emailSchema.parse(env);
};

export const requireCronEnv = () => {
  return cronSchema.parse(env);
};
