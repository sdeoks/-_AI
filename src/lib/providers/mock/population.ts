import type { DataProvider, ProviderResult } from "../types";
import { createRng, randInt } from "./rng";

export interface AgeBracket {
  label: string; // '아동' | '청년' | '30~49' | '50+' | '고령'
  ratio: number; // 0~1
}

export interface PopulationYearPoint {
  year: number;
  totalPopulation: number;
}

export interface PopulationOutput {
  administrativeDongName: string;
  totalPopulation: number;
  households: number;
  singlePersonHouseholds: number;
  ageBrackets: AgeBracket[];
  trend: PopulationYearPoint[]; // 최근 5년, 오름차순
}

export interface PopulationInput {
  seed: string;
  addressLabel: string;
}

// 통계청 SGIS(인구총조사/주민등록인구)를 대체하는 [MOCK] 데이터 생성기.
// 실제 서비스에서는 SGIS Open API 응답으로 교체되어야 한다 (docs/DATA_MATRIX.md 참고).
export class MockPopulationProvider
  implements DataProvider<PopulationInput, PopulationOutput>
{
  readonly key = "PopulationProvider";
  readonly mode = "mock" as const;

  async fetch(input: PopulationInput): Promise<ProviderResult<PopulationOutput>> {
    const rng = createRng(`${input.seed}:population`);

    const totalPopulation = randInt(rng, 12000, 42000);
    const avgHouseholdSize = 2.1 + rng() * 0.6;
    const households = Math.round(totalPopulation / avgHouseholdSize);
    const singlePersonRatio = 0.22 + rng() * 0.18;
    const singlePersonHouseholds = Math.round(households * singlePersonRatio);

    const child = 0.08 + rng() * 0.05;
    const youth = 0.14 + rng() * 0.06;
    const mid = 0.32 + rng() * 0.1;
    const senior60 = 0.14 + rng() * 0.08;
    const elder = Math.max(0.05, 1 - child - youth - mid - senior60);

    const ageBrackets: AgeBracket[] = [
      { label: "아동(0~14세)", ratio: round2(child) },
      { label: "청년(15~29세)", ratio: round2(youth) },
      { label: "30~49세", ratio: round2(mid) },
      { label: "50~64세", ratio: round2(senior60) },
      { label: "고령(65세+)", ratio: round2(elder) },
    ];

    const currentYear = new Date().getFullYear();
    let pop = totalPopulation;
    const trend: PopulationYearPoint[] = [];
    for (let i = 4; i >= 0; i--) {
      trend.push({ year: currentYear - i, totalPopulation: Math.round(pop) });
      pop = pop / (1 + (rng() - 0.45) * 0.03);
    }
    trend.reverse();
    trend[trend.length - 1] = { year: currentYear, totalPopulation };

    return {
      ok: true,
      data: {
        administrativeDongName: `${input.addressLabel} 인근 행정동`,
        totalPopulation,
        households,
        singlePersonHouseholds,
        ageBrackets,
        trend,
      },
      evidence: {
        sourceOrganization: "통계청 SGIS",
        sourceDataset: "인구총조사·주민등록인구 통계 [MOCK]",
        asOfDate: new Date(currentYear, 3, 1),
        geographicUnit: "행정동",
        rawSampleCount: 1,
        usedSampleCount: 1,
        calculationMethod: "행정동 단위 인구/세대 집계",
        evidenceType: "PUBLIC_STATISTICS",
        limitations:
          "본 데이터는 실제 SGIS API가 아직 연결되지 않아 생성된 [MOCK] 데이터입니다. 총조사와 주민등록인구는 기준시점이 다를 수 있습니다.",
        isMock: true,
      },
    };
  }
}

function round2(v: number): number {
  return Math.round(v * 1000) / 1000;
}

export const mockPopulationProvider = new MockPopulationProvider();
