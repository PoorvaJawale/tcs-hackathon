"use client";

import NumberFlow from "@number-flow/react";
import type { RiskLevel } from "@/lib/schemas";

/* Status is always communicated by icon + label + color, never color alone
   (WCAG 1.4.1). Text/background pairs are AA-contrast in both skins. */
const CONFIG: Record<
  RiskLevel,
  { label: string; classes: string; icon: React.ReactNode }
> = {
  safe: {
    label: "Safe",
    classes:
      "bg-emerald-100 text-emerald-900 border-emerald-600 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  suspicious: {
    label: "Suspicious",
    classes:
      "bg-amber-100 text-amber-900 border-amber-600 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  high_risk: {
    label: "High Risk",
    classes:
      "bg-red-100 text-red-900 border-red-600 dark:bg-red-950 dark:text-red-200 dark:border-red-400",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

export default function RiskBadge({
  verdict,
  score,
  confidence,
}: {
  verdict: RiskLevel;
  score: number;
  confidence: number;
}) {
  const cfg = CONFIG[verdict];
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-4 rounded-xl border-2 p-5 ${cfg.classes}`}
    >
      {cfg.icon}
      <span className="text-2xl font-bold">{cfg.label}</span>
      <span className="ml-auto flex items-baseline gap-4 text-sm font-medium">
        <span>
          Risk score:{" "}
          {/* NumberFlow animates and honours prefers-reduced-motion natively */}
          <NumberFlow value={score} className="text-lg font-bold tabular-nums" />
          /100
        </span>
        <span>
          Confidence:{" "}
          <NumberFlow value={confidence} className="text-lg font-bold tabular-nums" />%
        </span>
      </span>
    </div>
  );
}
