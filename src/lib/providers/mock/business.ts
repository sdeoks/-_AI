import type { DataProvider, ProviderResult } from "../types";
import { createRng, randInt } from "./rng";

export interface IndustryShare {
  industry: string;
  ratio: number; // 0~1
}

export interface BusinessOutput {
  businessCount: number;
  employeeCount: number;
  industryBreakdown: IndustryShare[];
  purchasingPowerIndex: number; // 0~100, [추정]
  purchasingPowerBasis: string[];
}

export interface BusinessInput {
  seed: string;
}

const INDUSTRIES = [
  "도소매업",
  "숙박·음식점업",
  "제조업",
  "정보통신업",
  "전문·과학기술업",
  "교육서비스업",
  "부동산업",
  "금융·보험업",
];

// 통계청 전국사업체조사 + KOSIS 산업별 임금통계를 대체하는 [MOCK] 데이터 생성기 (§37).
// "인근 직장인 평균연봉" 같은 직접 근거 없는 숫자는 만들지 않고,
// 사업체수·종사자수·산업구성을 종합한 "구매력 추정지수"만 제공한다.
export class MockBusinessProvider implements DataProvider<BusinessInput, BusinessOutput> {
  readonly key = "BusinessProvider";
  readonly mode = "mock" as const;

  async fetch(input: BusinessInput): Promise<ProviderResult<BusinessOutput>> {
    const rng = createRng(`${input.seed}:business`);

    const businessCount = randInt(rng, 800, 6000);
    const employeeCount = Math.round(businessCount * (2.2 + rng() * 4));

    const raw = INDUSTRIES.map(() => rng());
    const sum = raw.reduce((a, b) => a + b, 0);
    const industryBreakdown: IndustryShare[] = INDUSTRIES.map((industry, i) => ({
      industry,
      ratio: Math.round((raw[i] / sum) * 1000) / 1000,
    })).sort((a, b) => b.ratio - a.ratio);

    // 구매력 추정지수: 사업체 밀도 + 전문/금융업 비중 + 종사자수를 조합한 0~100 지수.
    // 직접 임금 데이터가 아니라 대체변수(Proxy) 조합이므로 [추정] 배지를 사용한다.
    const professionalShare =
      (industryBreakdown.find((i) => i.industry === "전문·과학기술업")?.ratio ?? 0) +
      (industryBreakdown.find((i) => i.industry === "금융·보험업")?.ratio ?? 0) +
      (industryBreakdown.find((i) => i.industry === "정보통신업")?.ratio ?? 0);
    const densityScore = Math.min(1, employeeCount / 20000);
    const purchasingPowerIndex = Math.round(
      Math.min(100, Math.max(10, professionalShare * 140 + densityScore * 40)),
    );

    return {
      ok: true,
      data: {
        businessCount,
        employeeCount,
        industryBreakdown,
        purchasingPowerIndex,
        purchasingPowerBasis: [
          "통계청 전국사업체조사 사업체·종사자수 [MOCK]",
          "KOSIS 산업별 임금통계 [MOCK]",
          "산업구성 중 전문·금융·정보통신업 비중",
        ],
      },
      evidence: {
        sourceOrganization: "통계청",
        sourceDataset: "전국사업체조사 [MOCK]",
        asOfDate: new Date(new Date().getFullYear() - 1, 11, 31),
        geographicUnit: "행정동",
        rawSampleCount: businessCount,
        usedSampleCount: businessCount,
        calculationMethod: "사업체수·종사자수 집계, 구매력 추정지수는 산업구성 가중 조합",
        evidenceType: "PUBLIC_STATISTICS",
        limitations:
          "실제 SGIS/KOSIS API 미연동 [MOCK] 데이터. 구매력 추정지수는 직접 임금 데이터가 아닌 산업구성 기반 Proxy입니다.",
        isMock: true,
      },
    };
  }
}

export const mockBusinessProvider = new MockBusinessProvider();
