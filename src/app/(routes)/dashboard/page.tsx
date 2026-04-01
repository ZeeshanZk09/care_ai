import HistoryList from "./_component/HistoryList";
import DoctorAgentList from "./_component/DoctorAgentList";

import Link from "next/link";
import { auth } from "@/auth";
import { getEntitlementSnapshot } from "@/lib/billing/entitlements";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center gap-4">
        <h1 className="text-2xl font-bold">You are not signed in</h1>
        <Link
          href="/sign-in"
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  let currentPlan: "FREE" | "BASIC" | "PRO" = "FREE";
  let consultationsRemaining: number | null = null;

  try {
    const entitlement = await getEntitlementSnapshot(session.user.id);
    currentPlan = entitlement.plan;
    consultationsRemaining = entitlement.consultationsRemaining;
  } catch (error) {
    console.error("[dashboard] Failed to load entitlement snapshot:", error);
  }

  return (
    <section className="relative w-full mx-auto max-w-7xl my-10">
      {currentPlan === "FREE" ? (
        <article className="mx-4 mb-8 rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Plan Comparison
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Unlock stronger reports and better value
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You currently have {consultationsRemaining ?? 0} free consultations
            remaining. Upgrade to improve report depth and reduce consultation
            bottlenecks.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold">Free</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Standard model quality, one-time 10 consultations.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold">Basic</p>
              <p className="mt-1 text-xs text-muted-foreground">
                50 consultations/month with specialist routing and faster
                outputs.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold">Pro</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Unlimited consultations, premium model quality, and
                comprehensive reports.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/pricing"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Compare Plans
            </Link>
            <Link
              href="/pricing"
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Activate CARE30 (30% off for 7 days)
            </Link>
          </div>
        </article>
      ) : null}

      <HistoryList />
      <DoctorAgentList />
    </section>
  );
}
