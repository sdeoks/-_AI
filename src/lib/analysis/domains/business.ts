import { mockBusinessProvider } from "@/lib/providers/mock/business";
import { createEvidence } from "@/lib/evidence/build";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runBusinessDomain(ctx: DomainContext): Promise<DomainResult> {
  const result = await mockBusinessProvider.fetch({ seed: ctx.seed });
  if (!result.ok || !result.data) {
    return unavailableResult("BUSINESS", result.error?.message ?? "unknown");
  }
  const d = result.data;

  const countEvidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "BUSINESS_COUNT",
    metricLabel: "인근 사업체·종사자수",
    metricValue: String(d.employeeCount),
    metricUnit: "명",
    input: result.evidence!,
    rawRecords: [
      { label: `사업체수 ${d.businessCount.toLocaleString()}개`, payload: { businessCount: d.businessCount } },
      ...d.industryBreakdown.map((i) => ({
        label: `${i.industry}: ${(i.ratio * 100).toFixed(1)}%`,
        payload: i,
      })),
    ],
  });

  const purchasingPowerEvidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "PURCHASING_POWER_INDEX",
    metricLabel: "구매력 추정지수",
    metricValue: String(d.purchasingPowerIndex),
    metricUnit: "점",
    input: {
      ...result.evidence!,
      evidenceType: "ESTIMATED",
      calculationMethod: "산업구성(전문·금융·정보통신업 비중) + 종사자밀도 가중 조합",
      filterDescription: d.purchasingPowerBasis.join(" · "),
    },
  });

  return {
    tabKey: "BUSINESS",
    status: "OK",
    completionRate: 100,
    evidenceIds: [countEvidence.id, purchasingPowerEvidence.id],
    headlineEvidenceId: purchasingPowerEvidence.id,
    summary: d,
  };
}
