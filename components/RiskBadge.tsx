"use client";

import NumberFlow from "@number-flow/react";
import type { RiskLevel } from "@/lib/schemas";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

const CONFIG: Record<
  RiskLevel,
  { label: string; classes: string; textClass: string; icon: any }
> = {
  safe: {
    label: "Safe",
    classes: "bg-emerald-500/5 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/20",
    textClass: "text-emerald-600 dark:text-emerald-400",
    icon: ShieldCheck,
  },
  suspicious: {
    label: "Suspicious",
    classes: "bg-amber-500/5 text-amber-700 border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400 dark:border-amber-500/20",
    textClass: "text-amber-600 dark:text-amber-400",
    icon: AlertTriangle,
  },
  high_risk: {
    label: "High Risk",
    classes: "bg-red-500/5 text-red-700 border-red-500/20 dark:bg-red-500/5 dark:text-red-400 dark:border-red-500/20",
    textClass: "text-red-600 dark:text-red-400",
    icon: ShieldAlert,
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
  const Icon = cfg.icon;
  
  return (
    <div
      role="status"
      className={`flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border p-5 ${cfg.classes} transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-current/10 ${cfg.textClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Security Verdict</span>
          <span className="text-xl font-bold tracking-tight">{cfg.label}</span>
        </div>
      </div>
      
      <div className="sm:ml-auto flex items-center gap-6 border-t sm:border-t-0 border-card-border/50 pt-3 sm:pt-0 text-sm font-medium">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Risk Score</span>
          <span className="text-base font-bold text-slate-900 dark:text-white">
            <NumberFlow value={score} className="tabular-nums" />
            <span className="text-xs font-normal text-slate-400">/100</span>
          </span>
        </div>
        
        <div className="h-8 w-px bg-card-border/60" />
        
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Scan Confidence</span>
          <span className="text-base font-bold text-slate-900 dark:text-white">
            <NumberFlow value={confidence} className="tabular-nums" />%
          </span>
        </div>
      </div>
    </div>
  );
}
