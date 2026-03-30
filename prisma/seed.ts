import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";

type PlanTier = "FREE" | "BASIC" | "PRO";

const PLAN_DEFINITIONS: Array<{
  tier: PlanTier;
  name: string;
  monthlyPriceCents: number;
  consultationsLimit: number | null;
  isLifetimeLimit: boolean;
}> = [
  {
    tier: "FREE",
    name: "Free Plan",
    monthlyPriceCents: 0,
    consultationsLimit: 10,
    isLifetimeLimit: true,
  },
  {
    tier: "BASIC",
    name: "Basic Plan",
    monthlyPriceCents: 1900,
    consultationsLimit: 50,
    isLifetimeLimit: false,
  },
  {
    tier: "PRO",
    name: "Pro Plan",
    monthlyPriceCents: 4900,
    consultationsLimit: null,
    isLifetimeLimit: false,
  },
];

const getMonthStartUtc = (date = new Date()) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
};

async function seedPlans() {
  for (const plan of PLAN_DEFINITIONS) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        monthlyPriceCents: plan.monthlyPriceCents,
        consultationsLimit: plan.consultationsLimit,
        isLifetimeLimit: plan.isLifetimeLimit,
      },
      create: {
        tier: plan.tier,
        name: plan.name,
        monthlyPriceCents: plan.monthlyPriceCents,
        consultationsLimit: plan.consultationsLimit,
        isLifetimeLimit: plan.isLifetimeLimit,
      },
    });
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@careai.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "CareAI Admin";

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      planTier: "PRO",
      consultationsUsed: 0,
      consultationsResetAt: getMonthStartUtc(),
      premiumAccessGrantedAt: new Date(),
      emailVerified: new Date(),
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      planTier: "PRO",
      consultationsUsed: 0,
      consultationsResetAt: getMonthStartUtc(),
      premiumAccessGrantedAt: new Date(),
      emailVerified: new Date(),
    },
  });
}

async function main() {
  await seedPlans();
  await seedAdmin();
  console.log("Seed complete: plans and admin user upserted.");
}

let exitCode = 0;

try {
  await main();
} catch (error) {
  console.error("Seed failed:", error);
  exitCode = 1;
}

await prisma.$disconnect();

if (exitCode !== 0) {
  process.exit(exitCode);
}
