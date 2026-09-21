import { mockPopulationProvider } from "@/lib/providers/mock/population";
import { createEvidence } from "@/lib/evidence/build";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runPopulationDomain(ctx: DomainContext): Promise<DomainResult> {
  const result = await mockPopulationProvider.fetch({
    seed: ctx.seed,
    addressLabel: ctx.property.address,
  });
  if (!result.ok || !result.data) {
    return unavailableResult("POPULATION", result.error?.message ?? "unknown");
  }
  const d = result.data;

  const evidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "POPULATION_TOTAL",
    metricLabel: "인근 행정동 인구",
    metricValue: String(d.totalPopulation),
    metricUnit: "명",
    input: result.evidence!,
    rawRecords: [
      { label: `세대수 ${d.households.toLocaleString()}세대`, payload: { households: d.households } },
      {
        label: `1인가구 ${d.singlePersonHouseholds.toLocaleString()}세대`,
        payload: { singlePersonHouseholds: d.singlePersonHouseholds },
      },
      ...d.ageBrackets.map((a) => ({
        label: `${a.label}: ${(a.ratio * 100).toFixed(1)}%`,
        payload: a,
      })),
      ...d.trend.map((t) => ({
        label: `${t.year}년 인구 ${t.totalPopulation.toLocaleString()}명`,
        payload: t,
      })),
    ],
  });

  return {
    tabKey: "POPULATION",
    status: "OK",
    completionRate: 100,
    evidenceIds: [evidence.id],
    headlineEvidenceId: evidence.id,
    summary: d,
  };
}
