import type { DataProvider, ProviderResult } from "../types";
import { createRng, pick, randInt } from "./rng";

export interface NearbyComplex {
  name: string;
  distanceMeters: number;
  households: number | null; // null = 세대수 미확인
  builtYear: number | null;
  recentPricePerArea: number | null; // 원/㎡, 최근 실거래 평당가 환산 전 단가
  transactionCount: number;
}

export interface ResidentialBackupOutput {
  radiusMeters: number;
  complexes: NearbyComplex[];
  totalComplexes: number;
  confirmedHouseholds: number;
  unconfirmedComplexCount: number;
}

export interface ResidentialBackupInput {
  seed: string;
  radiusMeters: number;
}

const PREFIXES = ["광교", "e편한세상", "자연앤", "힐스테이트", "푸르지오", "래미안", "자이"];
const SUFFIXES = ["파크뷰", "센트럴", "레이크", "포레", "스퀘어", "리버뷰"];

// 한국부동산원/국토교통부 공동주택 단지정보를 대체하는 [MOCK] 생성기 (§35).
// 세대수 등 일부 항목은 의도적으로 "미확인"으로 남겨, 자료 누락을 숨기지 않는다는
// 제품 원칙(§35 예시)을 보여준다.
export class MockResidentialBackupProvider
  implements DataProvider<ResidentialBackupInput, ResidentialBackupOutput>
{
  readonly key = "ApartmentComplexProvider";
  readonly mode = "mock" as const;

  async fetch(
    input: ResidentialBackupInput,
  ): Promise<ProviderResult<ResidentialBackupOutput>> {
    const rng = createRng(`${input.seed}:residential:${input.radiusMeters}`);
    const areaFactor = (input.radiusMeters / 1000) ** 2;
    const count = Math.max(3, Math.round(randInt(rng, 5, 14) * areaFactor));

    const complexes: NearbyComplex[] = Array.from({ length: count }).map(() => {
      const unconfirmed = rng() < 0.15;
      return {
        name: `${pick(rng, PREFIXES)} ${pick(rng, SUFFIXES)}`,
        distanceMeters: randInt(rng, 50, input.radiusMeters),
        households: unconfirmed ? null : randInt(rng, 300, 2200),
        builtYear: unconfirmed ? null : randInt(rng, 1998, 2024),
        recentPricePerArea: unconfirmed ? null : randInt(rng, 6_500_000, 18_000_000),
        transactionCount: unconfirmed ? 0 : randInt(rng, 0, 12),
      };
    });

    const confirmedHouseholds = complexes.reduce(
      (sum, c) => sum + (c.households ?? 0),
      0,
    );
    const unconfirmedComplexCount = complexes.filter((c) => c.households == null).length;

    return {
      ok: true,
      data: {
        radiusMeters: input.radiusMeters,
        complexes: complexes.sort((a, b) => a.distanceMeters - b.distanceMeters),
        totalComplexes: complexes.length,
        confirmedHouseholds,
        unconfirmedComplexCount,
      },
      evidence: {
        sourceOrganization: "한국부동산원",
        sourceDataset: "공동주택 단지 기본정보 [MOCK]",
        asOfDate: new Date(),
        geographicUnit: "반경",
        radiusMeters: input.radiusMeters,
        rawSampleCount: complexes.length,
        usedSampleCount: complexes.length,
        calculationMethod: "반경 내 공동주택 단지 세대수 합산 (미확인 단지 제외)",
        evidenceType: "OFFICIAL",
        limitations:
          "실제 한국부동산원 API 미연동 [MOCK] 데이터. 일부 단지는 세대수 등 정보가 확인되지 않은 상태로 남겨둡니다.",
        isMock: true,
      },
    };
  }
}

export const mockResidentialBackupProvider = new MockResidentialBackupProvider();
