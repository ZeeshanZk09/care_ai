import prisma from "@/lib/prisma";
import RegenerateRiskButton from "./_components/RegenerateRiskButton";

const formatDateTime = (value: Date | null | undefined) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
};

type RiskItem = {
  title?: string;
  severity?: string;
  detail?: string;
};

export default async function AdminRiskPage() {
  const [latest, history] = await Promise.all([
    prisma.riskSnapshot.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        riskScore: true,
        risks: true,
        suggestions: true,
        snapshot: true,
        createdAt: true,
      },
    }),
    prisma.riskSnapshot.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        riskScore: true,
        createdAt: true,
      },
    }),
  ]);

  const risks = (latest?.risks as RiskItem[] | null) ?? [];
  const suggestions = (latest?.suggestions as string[] | null) ?? [];
  const snapshot = (latest?.snapshot as Record<string, unknown> | null) ?? null;

  const cooldownRemainingMs = latest
    ? Math.max(0, 60 * 60 * 1000 - (Date.now() - latest.createdAt.getTime()))
    : 0;

  return (
    <section className="space-y-4">
      <header className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-xl font-semibold">AI Risk Calculator</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and compare structured AI risk snapshots for platform health
          and operational priorities.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <RegenerateRiskButton />
          {cooldownRemainingMs > 0 ? (
            <p className="text-xs text-amber-700">
              Cooldown active: {Math.ceil(cooldownRemainingMs / 60000)}{" "}
              minute(s) remaining.
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
          <h3 className="text-base font-semibold">Latest Risk Report</h3>
          {latest ? (
            <div className="mt-3 space-y-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Overall Risk Score
                </p>
                <p className="mt-1 text-3xl font-semibold">
                  {latest.riskScore} / 100
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Generated {formatDateTime(latest.createdAt)}
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <h4 className="text-sm font-semibold">Identified Risks</h4>
                <ul className="mt-2 space-y-2 text-sm">
                  {risks.map((risk, index) => (
                    <li
                      key={`${risk.title ?? "risk"}-${index}`}
                      className="rounded border p-2"
                    >
                      <p className="font-medium">
                        {risk.title ?? "Unspecified risk"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Severity: {risk.severity ?? "MEDIUM"}
                      </p>
                      <p className="mt-1 text-sm">{risk.detail ?? ""}</p>
                    </li>
                  ))}
                  {risks.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      No risks found in the latest report.
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-lg border p-3">
                <h4 className="text-sm font-semibold">
                  Prioritized Suggestions
                </h4>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                  {suggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {suggestions.length === 0 ? (
                    <li className="text-muted-foreground">
                      No suggestions available.
                    </li>
                  ) : null}
                </ol>
              </div>

              <div className="rounded-lg border p-3">
                <h4 className="text-sm font-semibold">Snapshot Context</h4>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No risk reports generated yet.
            </p>
          )}
        </article>

        <article className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-base font-semibold">Report History</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((item) => (
              <li key={item.id} className="rounded border p-2">
                <p className="font-medium">Score: {item.riskScore}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </p>
              </li>
            ))}
            {history.length === 0 ? (
              <li className="text-muted-foreground">
                No historical snapshots yet.
              </li>
            ) : null}
          </ul>
        </article>
      </div>
    </section>
  );
}
