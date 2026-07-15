"use client";

import type { RiskLevel } from "@/lib/schemas";

const VERDICT_FILL: Record<RiskLevel, { bar: string; label: string }> = {
  safe: { bar: "bg-emerald-600 dark:bg-emerald-400", label: "Safe" },
  suspicious: { bar: "bg-amber-500 dark:bg-amber-400", label: "Suspicious" },
  high_risk: { bar: "bg-red-600 dark:bg-red-400", label: "High Risk" },
};

/** Colored risk meter: zone track (green 0–19, amber 20–54, red 55–100) with
 *  a fill in the verdict color. Announced as a meter for screen readers;
 *  zone boundaries are labeled in text, never conveyed by color alone. */
export default function RiskMeter({
  score,
  verdict,
}: {
  score: number;
  verdict: RiskLevel;
}) {
  const cfg = VERDICT_FILL[verdict];
  return (
    <div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`Risk score ${score} out of 100 — ${cfg.label}`}
        className="relative h-4 w-full overflow-hidden rounded-full border border-zinc-400 dark:border-zinc-600"
      >
        {/* zone track (muted) */}
        <div className="absolute inset-0 flex" aria-hidden="true">
          <div className="w-[20%] bg-emerald-200 dark:bg-emerald-900" />
          <div className="w-[35%] bg-amber-200 dark:bg-amber-900" />
          <div className="w-[45%] bg-red-200 dark:bg-red-900" />
        </div>
        {/* score fill in verdict color (transition falls back to instant
            under prefers-reduced-motion via the global CSS rule) */}
        <div
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 rounded-r-full ${cfg.bar} transition-[width] duration-700 ease-out`}
          style={{ width: `${Math.max(2, score)}%` }}
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
