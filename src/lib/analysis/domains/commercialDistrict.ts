import { mockCommercialDistrictProvider } from "@/lib/providers/mock/commercialDistrict";
import { createEvidence } from "@/lib/evidence/build";
import { ANALYSIS_RADIUS_DEFAULTS_METERS } from "@/lib/enums";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runCommercialDistrictDomain(
  ctx: DomainContext,
): Promise<DomainResult> {
  const radiusMeters = ANALYSIS_RADIUS_DEFAULTS_METERS.commercialDistrict;
  const result = await mockCommercialDistrictProvider.fetch({
    seed: ctx.seed,
    radiusMeters,
  });
  if (!result.ok || !result.data) {
    return unavailableResult("COMMERCIAL_DISTRICT", result.error?.message ?? "unknown");
  }
  const d = result.data;

  const storeEvidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "COMMERCIAL_STORE_COUNT",
    metricLabel: `반경 ${radiusMeters}m 점포수`,
    metricValue: String(d.totalStoreCount),
    metricUnit: "개",
    input: result.evidence!,
    rawRecords: d.byCategory.map((c) => ({
      label: `${c.category}: ${c.count}개`,
      payload: c,
    })),
  });

  const footfallEvidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "FOOTFALL_PROXY",
    metricLabel: "유동인구 추정지수",
    metricValue: String(d.footfallProxyIndex),
    metricUnit: "점",
    input: {
      ...result.evidence!,
      evidenceType: "PROXY",
      calculationMethod: "반경 대비 점포밀도 기반 Proxy (실제 유동인구 계측 자료 아님)",
      filterDescription: d.footfallProxyBasis.join(" · "),
    },
  });

  return {
    tabKey: "COMMERCIAL_DISTRICT",
    status: "OK",
    completionRate: 100,
    evidenceIds: [storeEvidence.id, footfallEvidence.id],
    headlineEvidenceId: storeEvidence.id,
    summary: d,
  };
}
