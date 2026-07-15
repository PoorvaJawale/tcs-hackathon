"use client";

import type { RiskLevel } from "@/lib/schemas";

const VERDICT_FILL: Record<RiskLevel, { bar: string; label: string }> = {
  safe: { bar: "bg-emerald-600 dark:bg-emerald-400", label: "Safe" },
  suspicious: { bar: "bg-amber-500 dark:bg-amber-400", label: "Suspicious" },
  high_risk: { bar: "bg-red-600 dark:bg-red-400", label: "High Risk" },
};

/** Risk meter filled to the score in the verdict color. Announced as a meter
 *  for screen readers; zone boundaries are labeled in text, never conveyed by
 *  color alone. */
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
    <div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`Risk score ${score} out of 100 — ${cfg.label}`}
        className="relative h-4 w-full overflow-hidden rounded-full border border-zinc-400 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800"
      >
        {/* score fill in verdict color (transition falls back to instant
            under prefers-reduced-motion via the global CSS rule) */}
        <div
          aria-hidden="true"
          className={`h-full rounded-full ${cfg.bar} transition-[width] duration-700 ease-out`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      <div
        className="mt-1 flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300"
        aria-hidden="true"
      >
        <span>0 · Safe</span>
        <span>20 · Suspicious</span>
        <span>55 · High Risk</span>
        <span>100</span>
      </div>
    </div>
  );
}
