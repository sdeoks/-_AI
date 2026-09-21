import type { DataProvider, ProviderResult } from "../types";
import { createRng, pick, randInt } from "./rng";

export type DevelopmentSourceType = "OFFICIAL_PLAN" | "NEWS";
export type DevelopmentStage =
  | "검토"
  | "계획"
  | "고시"
  | "승인"
  | "착공"
  | "공사중"
  | "완공예정"
  | "완료";

export interface DevelopmentItem {
  id: string;
  name: string;
  category: string;
  distanceMeters: number;
  proposingBody: string;
  announcingOrg: string;
  announcedDate: string;
  stage: DevelopmentStage;
  expectedDate: string | null;
  lastCheckedDate: string;
  sourceType: DevelopmentSourceType;
}

export interface DevelopmentOutput {
  radiusMeters: number;
  items: DevelopmentItem[];
}

export interface DevelopmentInput {
  seed: string;
  radiusMeters: number;
}

const CATEGORIES = [
  "철도/GTX",
  "지하철",
  "도로",
  "택지개발",
  "도시개발",
  "재개발",
  "재건축",
  "산업단지",
  "업무지구",
];
const STAGES: DevelopmentStage[] = [
  "검토",
  "계획",
  "고시",
  "승인",
  "착공",
  "공사중",
  "완공예정",
];
const OFFICIAL_ORGS = ["국토교통부", "경기도", "해당 지자체 도시계획과"];

// 도시계획정보서비스(UPIS)/지자체 공고를 대체하는 [MOCK] 생성기 (§43).
// 실제 사업명을 절대 사용하지 않고 일반화된 템플릿명만 생성하며,
// [언론보도]와 [공식계획]을 항목별로 명확히 구분한다. 실제 서비스 전환 전
// 반드시 공식 도시계획 공고로 교체해야 하며, 이 Mock 데이터를 실제 개발계획
// 정보로 오인해서는 안 된다.
export class MockDevelopmentProvider
  implements DataProvider<DevelopmentInput, DevelopmentOutput>
{
  readonly key = "DevelopmentProvider";
  readonly mode = "mock" as const;

  async fetch(input: DevelopmentInput): Promise<ProviderResult<DevelopmentOutput>> {
    const rng = createRng(`${input.seed}:development`);
    const count = randInt(rng, 2, 6);
    const today = new Date();

    const items: DevelopmentItem[] = Array.from({ length: count }).map((_, i) => {
      const isOfficial = rng() < 0.4;
      const category = pick(rng, CATEGORIES);
      const stage = pick(rng, STAGES);
      const announcedMonthsAgo = randInt(rng, 1, 36);
      const announcedDate = new Date(today);
      announcedDate.setMonth(announcedDate.getMonth() - announcedMonthsAgo);
      const expectedYearsAhead = randInt(rng, 1, 6);
      const expectedDate = ["완공예정", "공사중", "착공"].includes(stage)
        ? `${today.getFullYear() + expectedYearsAhead}년`
        : null;

      return {
        id: `${input.seed}-dev-${i}`,
        name: `인근 ${category} 사업 (예시 ${String.fromCharCode(65 + i)})`,
        category,
        distanceMeters: randInt(rng, 300, input.radiusMeters),
        proposingBody: isOfficial ? pick(rng, OFFICIAL_ORGS) : "미확인(언론보도 기준)",
        announcingOrg: isOfficial ? pick(rng, OFFICIAL_ORGS) : "언론사 보도",
        announcedDate: announcedDate.toISOString().slice(0, 10),
        stage,
        expectedDate,
        lastCheckedDate: today.toISOString().slice(0, 10),
        sourceType: isOfficial ? "OFFICIAL_PLAN" : "NEWS",
      };
    });

    return {
      ok: true,
      data: { radiusMeters: input.radiusMeters, items },
      evidence: {
        sourceOrganization: "국토교통부/지자체 도시계획 공고 + 언론보도",
        sourceDataset: "개발계획 정보 [MOCK][DEMO]",
        asOfDate: today,
        geographicUnit: "반경",
        radiusMeters: input.radiusMeters,
        rawSampleCount: items.length,
        usedSampleCount: items.length,
        calculationMethod: "반경 내 개발계획 항목 나열 (가격/거래 계산 아님)",
        evidenceType: "UNVERIFIED",
        limitations:
          "이 항목은 실제 공식 도시계획 API가 연결되지 않은 완전한 [MOCK][DEMO] 예시 데이터입니다. 실제 개발계획으로 오인하지 마십시오. 실 서비스 전환 시 UPIS/지자체 공고로 전면 교체가 필요합니다. [공식계획]과 [언론보도]를 항목별로 구분합니다.",
        isMock: true,
      },
    };
  }
}

export const mockDevelopmentProvider = new MockDevelopmentProvider();
