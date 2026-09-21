import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { EvidenceType } from "@/lib/enums";
import { EVIDENCE_TYPE_BADGE } from "@/lib/enums";

const BADGE_COLORS: Record<EvidenceType, string> = {
  OFFICIAL: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  REAL_TRANSACTION: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  PUBLIC_STATISTICS: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  PRIVATE: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  USER_PROVIDED: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  CALCULATED: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  AI_ANALYSIS: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  ESTIMATED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PROXY: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  UNVERIFIED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function EvidenceTypeBadge({ type }: { type: EvidenceType }) {
  return <Badge className={BADGE_COLORS[type]}>[{EVIDENCE_TYPE_BADGE[type]}]</Badge>;
}

export function MockBadge() {
  return (
    <Badge className="bg-fuchsia-600 text-white">[DEMO]/[MOCK]</Badge>
  );
}
