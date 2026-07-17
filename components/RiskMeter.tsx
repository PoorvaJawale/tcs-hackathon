"use client";

import type { RiskLevel } from "@/lib/schemas";

const VERDICT_FILL: Record<RiskLevel, { bar: string; label: string }> = {
  safe: { bar: "bg-emerald-500", label: "Safe" },
  suspicious: { bar: "bg-amber-500", label: "Suspicious" },
  high_risk: { bar: "bg-red-500", label: "High Risk" },
};

export default function RiskMeter({
  score,
  verdict,
}: {
  score: number;
  verdict: RiskLevel;
}) {
  const cfg = VERDICT_FILL[verdict];
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Threat Indicator</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{score}/100</span>
      </div>
      
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`Risk score ${score} out of 100 — ${cfg.label}`}
        className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div
          aria-hidden="true"
          className={`h-full rounded-full ${cfg.bar} transition-[width] duration-700 ease-out`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      
      <div
        className="flex justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500"
        aria-hidden="true"
      >
        <span>Safe</span>
        <span>Suspicious (20)</span>
        <span>High Risk (55+)</span>
      </div>
    </div>
  );
}
