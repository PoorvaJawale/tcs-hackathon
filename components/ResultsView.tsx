"use client";

import NumberFlow from "@number-flow/react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Building2,
  Briefcase,
  IndianRupee,
  Phone,
  Clock,
  CreditCard,
} from "lucide-react";
import type { AnalyzeResponse } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type UiVerdict = "Safe" | "Suspicious" | "High Risk";
type UiSeverity = "info" | "warn" | "critical";

type UiResult = {
  verdict: UiVerdict;
  riskScore: number;
  summary: string;
  extracted: {
    company: string;
    role: string;
    stipend: string;
    contact: string;
    deadline: string;
    paymentTerms: string;
  };
  indicators: Array<{
    label: string;
    explanation: string;
    severity: UiSeverity;
  }>;
  verificationSteps: string[];
};

const VERDICT_STYLES: Record<
  UiResult["verdict"],
  {
    bg: string;
    border: string;
    text: string;
    meter: string;
    ring: string;
    Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    label: string;
    description: string;
  }
> = {
  Safe: {
    bg: "bg-safe/10",
    border: "border-safe/40",
    text: "text-safe",
    meter: "bg-safe",
    ring: "ring-safe/30",
    Icon: ShieldCheck,
    label: "Safe",
    description:
      "No major red flags detected. Still verify the recruiter before sharing personal documents.",
  },
  Suspicious: {
    bg: "bg-warn/10",
    border: "border-warn/50",
    text: "text-warn",
    meter: "bg-warn",
    ring: "ring-warn/30",
    Icon: ShieldAlert,
    label: "Suspicious",
    description:
      "Some warning signs. Do not send money or documents until you verify with the company directly.",
  },
  "High Risk": {
    bg: "bg-danger/10",
    border: "border-danger/50",
    text: "text-danger",
    meter: "bg-danger",
    ring: "ring-danger/30",
    Icon: ShieldX,
    label: "High Risk",
    description:
      "Strong scam indicators. Do not pay, do not share IDs. Report to your placement cell.",
  },
};

const SEVERITY_META = {
  info: { Icon: Info, tone: "border-border bg-secondary/40 text-muted-foreground" },
  warn: { Icon: AlertTriangle, tone: "border-warn/40 bg-warn/10 text-warn" },
  critical: { Icon: XCircle, tone: "border-danger/50 bg-danger/10 text-danger" },
} as const;

function toUiResult(result: AnalyzeResponse): UiResult {
  const verdictMap: Record<AnalyzeResponse["verdict"], UiVerdict> = {
    safe: "Safe",
    suspicious: "Suspicious",
    high_risk: "High Risk",
  };

  const contact = [result.entities.senderEmail, result.entities.senderPhone]
    .filter(Boolean)
    .join(", ");

  const paymentEntries = result.entities.paymentRequests
    .filter((p) => p.mentioned)
    .map((p) => [p.amount, p.purpose, p.method].filter(Boolean).join(" - "));

  return {
    verdict: verdictMap[result.verdict],
    riskScore: result.score,
    summary: result.summary,
    extracted: {
      company: result.entities.companyName || "Not provided",
      role: result.entities.roleTitle || "Not provided",
      stipend: result.entities.salary || "Not provided",
      contact: contact || "Not provided",
      deadline: result.entities.deadline || result.entities.urgencyPhrases[0] || "Not provided",
      paymentTerms:
        paymentEntries.length > 0
          ? paymentEntries.join("; ")
          : result.entities.salary || "Not provided",
    },
    indicators: result.indicators.map((ind) => ({
      label: ind.title,
      explanation: ind.whyItMatters,
      severity:
        ind.severity === "high"
          ? "critical"
          : ind.severity === "medium"
            ? "warn"
            : "info",
    })),
    verificationSteps: result.verificationSteps,
  };
}

export default function ResultsView({ result }: { result: AnalyzeResponse }) {
  const ui = toUiResult(result);
  const v = VERDICT_STYLES[ui.verdict];
  const { Icon } = v;
  const clampedScore = Math.max(0, Math.min(100, ui.riskScore));

  return (
    <div className="space-y-6 [perspective:1200px]">
      <Card className={cn("border-2 card-reveal", v.border, v.bg)} style={{ animationDelay: "0ms" }}>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div
              className={cn(
                "grid place-items-center size-20 rounded-2xl ring-4 bg-background shrink-0",
                v.ring,
                v.text
              )}
            >
              <Icon className="size-10" aria-hidden />
            </div>
            <div className="flex-1">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Verdict</p>
              <p className={cn("mt-1 font-display text-3xl sm:text-4xl font-bold", v.text)}>{v.label}</p>
              <p className="mt-2 text-sm text-foreground/80 max-w-xl">{v.description}</p>
            </div>
            <div className="flex flex-col items-center sm:items-end">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Risk score</p>
              <div className={cn("font-display font-bold text-5xl tabular-nums", v.text)}>
                <NumberFlow value={ui.riskScore} />
              </div>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-foreground/90">{ui.summary}</p>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              <span>Risk meter</span>
              <span>{clampedScore}/100</span>
            </div>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={clampedScore}
              aria-valuetext={`Risk score ${clampedScore} out of 100`}
              className="h-3 overflow-hidden rounded-full bg-foreground/10"
            >
              <div
                className={cn("h-full transition-[width] duration-700 ease-out", v.meter)}
                style={{ width: `${clampedScore}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Safe</span>
              <span>Suspicious</span>
              <span>High Risk</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-reveal" style={{ animationDelay: "140ms" }}>
        <CardHeader>
          <CardTitle className="font-display text-lg">Extracted details</CardTitle>
          <CardDescription>What the AI pulled from the offer.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailItem icon={Building2} label="Company" value={ui.extracted.company} />
            <DetailItem icon={Briefcase} label="Role" value={ui.extracted.role} />
            <DetailItem icon={IndianRupee} label="Stipend / Salary" value={ui.extracted.stipend} />
            <DetailItem icon={Phone} label="Contact" value={ui.extracted.contact} />
            <DetailItem icon={Clock} label="Deadline / Urgency" value={ui.extracted.deadline} />
            <DetailItem icon={CreditCard} label="Payment terms" value={ui.extracted.paymentTerms} />
          </dl>
        </CardContent>
      </Card>

      <Card className="card-reveal" style={{ animationDelay: "280ms" }}>
        <CardHeader>
          <CardTitle className="font-display text-lg">Fraud indicators</CardTitle>
          <CardDescription>
            <NumberFlow value={ui.indicators.length} /> signal{ui.indicators.length === 1 ? "" : "s"} detected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ui.indicators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No indicators flagged.</p>
          ) : (
            <ul className="space-y-3">
              {ui.indicators.map((ind, i) => {
                const s = SEVERITY_META[ind.severity];
                const SIcon = s.Icon;
                return (
                  <li key={i} className={cn("flex items-start gap-3 rounded-lg border p-3", s.tone)}>
                    <SIcon className="size-5 shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        <span className="sr-only">{ind.severity}: </span>
                        {ind.label}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground/80">{ind.explanation}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="card-reveal" style={{ animationDelay: "420ms" }}>
        <CardHeader>
          <CardTitle className="font-display text-lg">Verification steps</CardTitle>
          <CardDescription>Do these before responding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="space-y-3">
            {ui.verificationSteps.map((step, i) => (
              <li key={`${step}-${i}`} className="flex items-start gap-3">
                <span className="grid place-items-center size-7 shrink-0 rounded-full bg-primary/10 text-primary text-sm font-semibold font-mono">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground/90 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <Alert className="border-safe/40 bg-safe/10">
            <CheckCircle2 className="size-4 text-safe" aria-hidden />
            <AlertTitle>Golden rule</AlertTitle>
            <AlertDescription>
              Legitimate employers never ask for a security fee, registration charge, or Aadhaar and bank details to release an offer letter.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-medium text-foreground break-words">{value || "Not provided"}</p>
    </div>
  );
}
