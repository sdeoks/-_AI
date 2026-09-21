import { mockSupplyVacancyProvider } from "@/lib/providers/mock/supplyVacancy";
import { createEvidence } from "@/lib/evidence/build";
import { ANALYSIS_RADIUS_DEFAULTS_METERS } from "@/lib/enums";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runSupplyVacancyDomain(
  ctx: DomainContext,
  footfallProxyIndex?: number,
): Promise<DomainResult> {
  const radiusMeters = ANALYSIS_RADIUS_DEFAULTS_METERS.commercialDistrict;
  const result = await mockSupplyVacancyProvider.fetch({
    seed: ctx.seed,
    radiusMeters,
    footfallProxyIndex,
  });
  if (!result.ok || !result.data) {
    return unavailableResult("SUPPLY_VACANCY", result.error?.message ?? "unknown");
  }
  const d = result.data;

  const evidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "VACANCY_RISK",
    metricLabel: "공실위험",
    metricValue: d.vacancyLevel,
    input: result.evidence!,
    rawRecords: d.supplyItems.map((s) => ({
      label: `${s.name} · ${s.category} · ${s.expectedCompletionYear}년 · ${s.stage}`,
      payload: s,
    })),
  });

  return {
    tabKey: "SUPPLY_VACANCY",
    status: "OK",
    completionRate: 100,
    evidenceIds: [evidence.id],
    headlineEvidenceId: evidence.id,
    summary: d,
  };
}
