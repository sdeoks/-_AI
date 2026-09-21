import type { Property } from "@/generated/prisma/client";
import type { PropertyType, DashboardTabKey } from "@/lib/enums";

export interface DomainContext {
  propertyId: string;
  property: Property;
  propertyType: PropertyType;
  seed: string;
}

export interface DomainResult {
  tabKey: DashboardTabKey;
  status: "OK" | "PARTIAL" | "UNAVAILABLE";
  completionRate: number;
  evidenceIds: string[];
  headlineEvidenceId?: string;
  summary: unknown;
}

export function unavailableResult(tabKey: DashboardTabKey, reason: string): DomainResult {
  return {
    tabKey,
    status: "UNAVAILABLE",
    completionRate: 0,
    evidenceIds: [],
    summary: { error: reason },
  };
}
