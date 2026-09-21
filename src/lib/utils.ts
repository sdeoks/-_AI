import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWon(amount: number | null | undefined): string {
  if (amount == null) return "-";
  const eok = amount / 100_000_000;
  if (Math.abs(eok) >= 1) {
    return `${eok.toFixed(eok >= 10 ? 1 : 2).replace(/\.0+$/, "")}억원`;
  }
  const man = amount / 10_000;
  return `${Math.round(man).toLocaleString()}만원`;
}

export function formatDateKST(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10).replace(/-/g, ".");
}

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  if (!start && !end) return "-";
  return `${formatDateKST(start)} ~ ${formatDateKST(end)}`;
}
