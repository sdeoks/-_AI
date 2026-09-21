import { mockLandBuildingProvider } from "@/lib/providers/mock/landBuilding";
import { createEvidence } from "@/lib/evidence/build";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runLandBuildingDomain(ctx: DomainContext): Promise<DomainResult> {
  const result = await mockLandBuildingProvider.fetch({
    propertyType: ctx.propertyType,
    builtYearHint: ctx.property.builtYear,
    landAreaHint: ctx.property.landArea,
    seed: ctx.seed,
  });
  if (!result.ok || !result.data) {
    return unavailableResult("LAND_BUILDING", result.error?.message ?? "unknown");
  }
  const d = result.data;

  const buildingLandEvidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "LAND_BUILDING_INFO",
    metricLabel: "건폐율/용적률",
    metricValue: `${d.building.buildingCoverageRatio}/${d.building.floorAreaRatio}`,
    metricUnit: "%",
    input: result.evidence!,
    rawRecords: [
      { label: `준공 ${d.building.builtYear}년`, payload: d.building },
      { label: `주용도 ${d.building.mainUse}`, payload: d.building },
      { label: `연면적 ${d.building.totalFloorArea}㎡`, payload: d.building },
      { label: `층수 ${d.building.floors}층 · 승강기 ${d.building.elevators}대 · 주차 ${d.building.parkingSpaces}대`, payload: d.building },
      { label: `용도지역 ${d.land.useDistrict}${d.land.useZone ? " / " + d.land.useZone : ""}`, payload: d.land },
      { label: `지목 ${d.land.landCategory} · 대지면적 ${d.land.landArea}㎡`, payload: d.land },
      { label: d.land.roadCondition, payload: d.land },
    ],
  });

  const environmentEvidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "ENVIRONMENT_RISK",
    metricLabel: "환경·위험 확인 항목",
    metricValue: "확인필요",
    input: {
      sourceOrganization: "미확인",
      sourceDataset: "환경·위험 정보 — 공식 데이터 미연동",
      evidenceType: "UNVERIFIED",
      limitations:
        "침수/하천/경사/소음/철도/고압선/위험시설/혐오시설 등은 신뢰할 만한 공식 자료를 확보하지 못해 전부 확인필요로 표시합니다. 임의로 위험도를 추정하지 않습니다.",
      isMock: false,
    },
    rawRecords: d.environmentItems.map((item) => ({
      label: `${item}: 확인필요`,
      payload: { item, status: "확인필요" },
    })),
  });

  return {
    tabKey: "LAND_BUILDING",
    status: "OK",
    completionRate: 70, // 환경·위험은 확인필요 상태이므로 100% 완료로 간주하지 않음
    evidenceIds: [buildingLandEvidence.id, environmentEvidence.id],
    headlineEvidenceId: buildingLandEvidence.id,
    summary: d,
  };
}
