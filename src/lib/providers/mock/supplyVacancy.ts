import type { DataProvider, ProviderResult } from "../types";
import { createRng, pick, randInt } from "./rng";

export interface SupplyItem {
  id: string;
  name: string;
  category: string; // 신규아파트/신규오피스텔/신규상가/지식산업센터/복합시설
  distanceMeters: number;
  expectedCompletionYear: number;
  scale: string; // 세대수 또는 연면적 요약
  stage: string;
}

export type VacancyLevel = "낮음" | "보통" | "높음" | "데이터 부족";

export interface SupplyVacancyOutput {
  radiusMeters: number;
  supplyItems: SupplyItem[];
  vacancyLevel: VacancyLevel;
  vacancyProxyFactors: string[];
}

export interface SupplyVacancyInput {
  seed: string;
  radiusMeters: number;
  footfallProxyIndex?: number; // CommercialDistrict 결과와 연동해 공실위험 추정에 참고
}

const CATEGORIES = ["신규 아파트", "신규 오피스텔", "신규 상가", "지식산업센터", "복합시설"];
const STAGES = ["계획", "승인", "착공", "공사중", "완공예정"];

// 신규 공급(개발호재의 반대급부)과 공실위험을 대체하는 [MOCK] 생성기 (§44~45).
// 직접 공실률 통계가 없으므로 공실위험은 항상 [Proxy]로만 표시한다.
export class MockSupplyVacancyProvider
  implements DataProvider<SupplyVacancyInput, SupplyVacancyOutput>
{
  readonly key = "SupplyVacancyProvider";
  readonly mode = "mock" as const;

  async fetch(input: SupplyVacancyInput): Promise<ProviderResult<SupplyVacancyOutput>> {
    const rng = createRng(`${input.seed}:supply`);
    const count = randInt(rng, 0, 4);
    const today = new Date();

    const supplyItems: SupplyItem[] = Array.from({ length: count }).map((_, i) => ({
      id: `${input.seed}-supply-${i}`,
      name: `인근 ${pick(rng, CATEGORIES)} 공급 예정지 ${String.fromCharCode(65 + i)}`,
      category: pick(rng, CATEGORIES),
      distanceMeters: randInt(rng, 200, input.radiusMeters),
      expectedCompletionYear: today.getFullYear() + randInt(rng, 1, 5),
      scale: `${randInt(rng, 100, 1500)}세대/실 내외(추정)`,
      stage: pick(rng, STAGES),
    }));

    // 공실위험 Proxy: 신규공급 압력 + (있다면) 유동인구 지수 역상관으로 근사.
    const supplyPressure = Math.min(1, supplyItems.length / 4);
    const footfallFactor = input.footfallProxyIndex != null ? 1 - input.footfallProxyIndex / 100 : 0.5;
    const riskScore = supplyPressure * 0.6 + footfallFactor * 0.4;

    let vacancyLevel: VacancyLevel;
    if (riskScore < 0.33) vacancyLevel = "낮음";
    else if (riskScore < 0.6) vacancyLevel = "보통";
    else vacancyLevel = "높음";

    return {
      ok: true,
      data: {
        radiusMeters: input.radiusMeters,
        supplyItems,
        vacancyLevel,
        vacancyProxyFactors: [
          `신규공급 예정 ${supplyItems.length}건`,
          input.footfallProxyIndex != null
            ? `유동인구 추정지수 ${input.footfallProxyIndex}/100`
            : "유동인구 추정지수 미확인",
        ],
      },
      evidence: {
        sourceOrganization: "신규공급: 지자체 공고 / 공실위험: Proxy 추정",
        sourceDataset: "신규 공급계획 + 공실위험 Proxy [MOCK]",
        asOfDate: today,
        geographicUnit: "반경",
        radiusMeters: input.radiusMeters,
        rawSampleCount: supplyItems.length,
        usedSampleCount: supplyItems.length,
        calculationMethod: "신규공급 건수 + 유동인구 지수 조합 Proxy",
        evidenceType: "PROXY",
        limitations:
          "실제 공실률 통계가 없어 Proxy로만 제공합니다. 신규공급 항목은 [MOCK][DEMO] 예시이며 실제 사업정보가 아닙니다.",
        isMock: true,
      },
    };
  }
}

export const mockSupplyVacancyProvider = new MockSupplyVacancyProvider();
