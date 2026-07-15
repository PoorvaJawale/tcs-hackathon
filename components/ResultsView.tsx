"use client";

import type { AnalyzeResponse, Indicator } from "@/lib/schemas";
import RiskBadge from "./RiskBadge";
import RiskMeter from "./RiskMeter";
import ChecklistDnd from "./ChecklistDnd";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/60">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="text-sm font-medium break-words">
        {value || <span className="text-zinc-500 dark:text-zinc-400">Not stated</span>}
      </dd>
    </div>
  );
}

const SEVERITY_STYLES: Record<Indicator["severity"], { chip: string; label: string }> = {
  high: {
    chip: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
    label: "High",
  },
  medium: {
    chip: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    label: "Medium",
  },
  low: {
    chip: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
    label: "Low",
  },
};

const MATCH_LABELS: Record<string, { text: string; icon: string; cls: string }> = {
  exact: {
    text: "Matches official domain",
    icon: "✔",
    cls: "text-emerald-800 dark:text-emerald-300",
  },
  typosquat: {
    text: "Lookalike / typosquat domain",
    icon: "✖",
    cls: "text-red-800 dark:text-red-300",
  },
  mismatch: {
    text: "Does not match official domain",
    icon: "✖",
    cls: "text-red-800 dark:text-red-300",
  },
  unknown: {
    text: "Unable to verify",
    icon: "?",
    cls: "text-zinc-700 dark:text-zinc-300",
  },
};

export default function ResultsView({ result }: { result: AnalyzeResponse }) {
  const anyDegraded =
    result.degraded.extraction || result.degraded.verification || result.degraded.reasoning;
  const match = MATCH_LABELS[result.verification.domainMatch];
  const redactionTotal = Object.values(result.redaction).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      <RiskBadge
        verdict={result.verdict}
        score={result.score}
        confidence={result.confidence}
      />

      <RiskMeter score={result.score} verdict={result.verdict} />

      <p className="text-base leading-relaxed">{result.summary}</p>

      {anyDegraded && (
        <p
          role="note"
          className="rounded-lg border border-amber-600 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-200"
        >
          <strong>Verification incomplete:</strong>{" "}
          {[
            result.degraded.extraction && "AI extraction",
            result.degraded.verification && "company/domain lookup",
            result.degraded.reasoning && "AI reasoning",
          ]
            .filter(Boolean)
            .join(", ")}{" "}
          ran in fallback mode, so confidence is reduced. Treat unverified claims
          with extra caution.
        </p>
      )}

      {redactionTotal > 0 && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Privacy: {redactionTotal} personal identifier
          {redactionTotal === 1 ? " was" : "s were"} redacted (
          {Object.entries(result.redaction)
            .map(([k, v]) => `${k.toLowerCase().replace(/_/g, " ")} ×${v}`)
            .join(", ")}
          ) before any text was sent to AI services.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Extracted details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Detail label="Company" value={result.entities.companyName} />
            <Detail label="Role" value={result.entities.roleTitle} />
            <Detail label="Salary / stipend" value={result.entities.salary} />
            <Detail label="Deadline" value={result.entities.deadline} />
            <Detail label="Sender" value={result.entities.senderName} />
            <Detail label="Sender email" value={result.entities.senderEmail} />
            <Detail label="Phone" value={result.entities.senderPhone} />
            <Detail
              label="Payment requested"
              value={
                result.entities.paymentRequests.filter((p) => p.mentioned).length
                  ? result.entities.paymentRequests
                      .filter((p) => p.mentioned)
                      .map((p) => [p.amount, p.purpose].filter(Boolean).join(" — "))
                      .join("; ") || "Yes"
                  : "None found"
              }
            />
          </dl>
        </Panel>

        <Panel title="Domain verification">
          <dl className="flex flex-col gap-3">
            <Detail label="Email domain used" value={result.verification.emailDomain} />
            <Detail
              label="Official domain found"
              value={result.verification.officialDomain}
            />
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-zinc-600 dark:text-zinc-400">Domain match</dt>
              <dd className={`text-sm font-semibold ${match.cls}`}>
                <span aria-hidden="true">{match.icon}</span> {match.text}
              </dd>
            </div>
            <Detail
              label="Company existence"
              value={
                result.verification.companyExists === "verified"
                  ? `Verified (${result.verification.confidence.companyExists}% confidence)`
                  : result.verification.companyExists === "not_found"
                    ? "Could not be found online"
                    : "Unable to verify"
              }
            />
          </dl>
          {result.verification.notes.length > 0 && (
            <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
              {result.verification.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={`Fraud indicators (${result.indicators.length})`}>
        {result.indicators.length === 0 ? (
          <p className="text-sm">
            No fraud indicators fired. Still confirm the offer through official
            channels before sharing documents.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {result.indicators.map((ind) => {
              const sev = SEVERITY_STYLES[ind.severity];
              return (
                <li
                  key={ind.id}
                  className="rounded-lg border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sev.chip}`}
                    >
                      {sev.label} severity
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {ind.source === "rule"
                        ? "Rule engine"
                        : ind.source === "verification"
                          ? "Domain verification"
                          : "AI analysis"}
                    </span>
                  </div>
                  <p className="mt-1.5 font-medium">{ind.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                    Why this matters: {ind.whyItMatters}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Recommended verification steps">
        <ChecklistDnd steps={result.verificationSteps} />
      </Panel>
    </div>
  );
}
