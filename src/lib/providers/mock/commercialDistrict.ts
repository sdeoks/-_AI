import type { DataProvider, ProviderResult } from "../types";
import { createRng, randInt } from "./rng";

export interface StoreCategoryCount {
  category: string;
  count: number;
}

export interface CommercialDistrictOutput {
  radiusMeters: number;
  totalStoreCount: number;
  byCategory: StoreCategoryCount[];
  footfallProxyIndex: number; // 0~100, [Proxy]
  footfallProxyBasis: string[];
}

export interface CommercialDistrictInput {
  seed: string;
  radiusMeters: number;
}

const CATEGORIES = [
  "음식점",
  "카페",
  "편의점",
  "병원",
  "약국",
  "학원",
  "미용",
  "소매",
  "주점",
  "서비스",
  "기타",
];

// 소상공인시장진흥공단 상가(상권)정보를 대체하는 [MOCK] 데이터 생성기 (§38).
export class MockCommercialDistrictProvider
  implements DataProvider<CommercialDistrictInput, CommercialDistrictOutput>
{
  readonly key = "CommercialDistrictProvider";
  readonly mode = "mock" as const;

  async fetch(
    input: CommercialDistrictInput,
  ): Promise<ProviderResult<CommercialDistrictOutput>> {
    const rng = createRng(`${input.seed}:commercial:${input.radiusMeters}`);

    const areaFactor = (input.radiusMeters / 500) ** 2;
    const totalStoreCount = Math.round(randInt(rng, 120, 420) * areaFactor);

    const raw = CATEGORIES.map(() => rng());
    const sum = raw.reduce((a, b) => a + b, 0);
    const byCategory: StoreCategoryCount[] = CATEGORIES.map((category, i) => ({
      category,
      count: Math.round((raw[i] / sum) * totalStoreCount),
    })).sort((a, b) => b.count - a.count);

    // 유동인구 추정지수: 실제 유동인구 계측 자료가 없어 점포밀도 + 반경 기준
    // Proxy로만 산출한다. 절대 실제 인원수로 표현하지 않는다.
    const density = totalStoreCount / areaFactor / 300;
    const footfallProxyIndex = Math.round(Math.min(100, Math.max(5, density * 100)));

    return {
      ok: true,
      data: {
        radiusMeters: input.radiusMeters,
        totalStoreCount,
        byCategory,
        footfallProxyIndex,
        footfallProxyBasis: ["점포수 밀도(반경 대비)", "업종 구성"],
      },
      evidence: {
        sourceOrganization: "소상공인시장진흥공단",
        sourceDataset: "상가(상권)정보 [MOCK]",
        asOfDate: quarterStart(),
        geographicUnit: "반경",
        radiusMeters: input.radiusMeters,
        rawSampleCount: totalStoreCount,
        usedSampleCount: totalStoreCount,
        calculationMethod: "반경 내 업종별 점포수 집계",
        evidenceType: "OFFICIAL",
        limitations:
          "실제 소상공인시장진흥공단 API 미연동 [MOCK] 데이터. 분기 배치 갱신 자료 특성상 실시간 데이터가 아닙니다.",
        isMock: true,
      },
    };
  }
}

function quarterStart(): Date {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1);
}

export const mockCommercialDistrictProvider = new MockCommercialDistrictProvider();
