import type { PropertyType } from "@/lib/enums";
import type { DataProvider, ProviderResult } from "../types";
import { createRng, pick, randInt } from "./rng";

export interface BuildingInfo {
  builtYear: number;
  mainUse: string;
  totalFloorArea: number; // ㎡
  buildingCoverageRatio: number; // 건폐율 %
  floorAreaRatio: number; // 용적률 %
  floors: number;
  parkingSpaces: number;
  elevators: number;
}

export interface LandInfo {
  useDistrict: string; // 용도지역
  useZone: string | null; // 용도지구
  landCategory: string; // 지목
  landArea: number; // ㎡
  roadCondition: string;
  landUsePlanNote: string;
}

export const ENVIRONMENT_RISK_ITEMS = [
  "침수",
  "하천",
  "경사",
  "소음",
  "철도",
  "고압선",
  "위험시설",
  "혐오시설",
] as const;

export interface LandBuildingOutput {
  building: BuildingInfo;
  land: LandInfo;
  environmentItems: string[]; // 모두 "확인필요" — 실제 데이터 없이 임의 위험도를 생성하지 않는다
}

export interface LandBuildingInput {
  propertyType: PropertyType;
  builtYearHint: number | null;
  landAreaHint: number | null;
  seed: string;
}

const USE_DISTRICTS = ["제2종일반주거지역", "제3종일반주거지역", "준주거지역", "일반상업지역"];
const LAND_CATEGORIES = ["대", "잡종지"];
const MAIN_USES: Record<string, string> = {
  apartment: "공동주택(아파트)",
  officetel: "업무시설(오피스텔)",
  retail: "제2종근린생활시설",
  sectional_retail: "제1종근린생활시설",
  neighborhood_facility: "제1종근린생활시설",
  commercial_building: "근린생활시설",
  office: "업무시설",
  row_house: "공동주택(연립)",
  multiplex_house: "공동주택(다세대)",
  detached_house: "단독주택",
  multi_household_house: "단독주택(다가구)",
  land: "-",
  other: "기타",
};

// 국토교통부 건축HUB(건축물대장) / VWorld 토지이용계획을 대체하는 [MOCK] 생성기 (§46).
// 환경·위험 정보(§47)는 실제 공식 데이터가 없으므로 임의의 위험도를 생성하지 않고
// 전 항목을 "확인필요"로 정직하게 남긴다.
export class MockLandBuildingProvider
  implements DataProvider<LandBuildingInput, LandBuildingOutput>
{
  readonly key = "LandBuildingProvider";
  readonly mode = "mock" as const;

  async fetch(input: LandBuildingInput): Promise<ProviderResult<LandBuildingOutput>> {
    const rng = createRng(`${input.seed}:landBuilding`);

    const builtYear = input.builtYearHint ?? randInt(rng, 1995, 2023);
    const floors = randInt(rng, 3, 25);
    const landArea = input.landAreaHint ?? randInt(rng, 300, 3000);

    const building: BuildingInfo = {
      builtYear,
      mainUse: MAIN_USES[input.propertyType] ?? "기타",
      totalFloorArea: Math.round(landArea * (1.5 + rng())),
      buildingCoverageRatio: Math.round(40 + rng() * 30),
      floorAreaRatio: Math.round(150 + rng() * 250),
      floors,
      parkingSpaces: Math.round(landArea / randInt(rng, 30, 60)),
      elevators: floors >= 5 ? randInt(rng, 1, 3) : 0,
    };

    const land: LandInfo = {
      useDistrict: pick(rng, USE_DISTRICTS),
      useZone: rng() < 0.3 ? "지구단위계획구역" : null,
      landCategory: pick(rng, LAND_CATEGORIES),
      landArea,
      roadCondition: `${pick(rng, ["6m", "8m", "12m", "20m"])} 도로 접함`,
      landUsePlanNote: "토지이용계획 열람 API 미연동 — 상세 확인 필요",
    };

    return {
      ok: true,
      data: {
        building,
        land,
        environmentItems: [...ENVIRONMENT_RISK_ITEMS],
      },
      evidence: {
        sourceOrganization: "국토교통부 건축HUB / VWorld",
        sourceDataset: "건축물대장 + 토지이용계획 [MOCK]",
        asOfDate: new Date(),
        geographicUnit: "필지",
        rawSampleCount: 1,
        usedSampleCount: 1,
        calculationMethod: "건축물대장/토지이용계획 항목 나열",
        evidenceType: "OFFICIAL",
        limitations:
          "실제 건축HUB/VWorld API가 아직 연결되지 않아 생성된 [MOCK] 데이터입니다. 환경·위험 정보는 실제 자료가 없어 전부 확인필요로 표시됩니다.",
        isMock: true,
      },
    };
  }
}

export const mockLandBuildingProvider = new MockLandBuildingProvider();
