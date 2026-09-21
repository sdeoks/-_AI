import { mockDevelopmentProvider } from "@/lib/providers/mock/development";
import { createEvidence } from "@/lib/evidence/build";
import { ANALYSIS_RADIUS_DEFAULTS_METERS } from "@/lib/enums";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runDevelopmentDomain(ctx: DomainContext): Promise<DomainResult> {
  const radiusMeters = ANALYSIS_RADIUS_DEFAULTS_METERS.development;
  const result = await mockDevelopmentProvider.fetch({ seed: ctx.seed, radiusMeters });
  if (!result.ok || !result.data) {
    return unavailableResult("DEVELOPMENT", result.error?.message ?? "unknown");
  }
  const d = result.data;

  const evidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "DEVELOPMENT_PLANS",
    metricLabel: `반경 ${radiusMeters}m 개발계획`,
    metricValue: String(d.items.length),
    metricUnit: "건",
    input: result.evidence!,
    rawRecords: d.items.map((item) => ({
      label: `[${item.sourceType === "OFFICIAL_PLAN" ? "공식계획" : "언론보도"}] ${item.name} · ${item.category} · ${item.stage} · ${item.distanceMeters}m`,
      payload: item,
    })),
  });

  return {
    tabKey: "DEVELOPMENT",
    status: "OK",
    completionRate: 100,
    evidenceIds: [evidence.id],
    headlineEvidenceId: evidence.id,
    summary: d,
  };
}
