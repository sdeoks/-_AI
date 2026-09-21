import type { PropertyType } from "@/lib/enums";
import type { DataProvider, ProviderResult } from "../types";
import { createRng, randInt } from "./rng";

export interface RentalListing {
  id: string;
  distanceMeters: number;
  buildingName?: string;
  floor: number | null;
  exclusiveArea: number;
  deposit: number; // 보증금(원)
  monthlyRent: number; // 월세(원), 전세면 0
  managementFee: number | null;
  isActualContract: boolean; // true=실제 임대계약(전월세 실거래), false=임대 호가
  listingDate: string; // 계약/등록시기
}

export interface RentalOutput {
  listings: RentalListing[];
}

export interface RentalInput {
  propertyType: PropertyType;
  radiusMeters: number;
  monthsBack: number;
  targetExclusiveArea?: number;
  targetFloor?: number | null;
  seed: string;
}

// 국토교통부 전월세 실거래가 + 사용자 업로드 임대 호가를 대체하는 [MOCK] 생성기 (§26).
// "실제 임대계약"과 "임대 호가"를 명확히 구분하는 것이 이 Provider의 핵심 원칙이다.
export class MockRentalProvider implements DataProvider<RentalInput, RentalOutput> {
  readonly key = "RentalProvider";
  readonly mode = "mock" as const;

  async fetch(input: RentalInput): Promise<ProviderResult<RentalOutput>> {
    const rng = createRng(`${input.seed}:rental`);
    const count = randInt(rng, 10, 28);
    const targetArea = input.targetExclusiveArea ?? 60;
    const baseMonthlyPerArea = 35_000; // 원/㎡/월 근사 기준값
    const baseDepositPerArea = 4_500_000; // 원/㎡

    const listings: RentalListing[] = Array.from({ length: count }).map((_, i) => {
      const distanceMeters = Math.round(rng() * input.radiusMeters);
      const exclusiveArea = Math.max(
        15,
        Math.round(targetArea + (rng() - 0.5) * targetArea * 0.5),
      );
      const isJeonse = rng() < 0.25; // 전세
      const isActualContract = rng() < 0.35; // 나머지는 호가
      const monthsAgo = Math.floor(rng() * input.monthsBack);
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);

      const noise = 0.85 + rng() * 0.3;
      const monthlyRent = isJeonse
        ? 0
        : Math.round((baseMonthlyPerArea * exclusiveArea * noise) / 10_000) * 10_000;
      const deposit = isJeonse
        ? Math.round((baseDepositPerArea * exclusiveArea * 3.5 * noise) / 1_000_000) * 1_000_000
        : Math.round((baseDepositPerArea * exclusiveArea * 0.3 * noise) / 1_000_000) * 1_000_000;

      return {
        id: `${input.seed}-rental-${i}`,
        distanceMeters,
        buildingName: undefined,
        floor: 1 + Math.floor(rng() * 20),
        exclusiveArea,
        deposit,
        monthlyRent,
        managementFee: Math.round(randInt(rng, 5, 20) * exclusiveArea * 100),
        isActualContract,
        listingDate: date.toISOString().slice(0, 10),
      };
    });

    const actualCount = listings.filter((l) => l.isActualContract).length;

    return {
      ok: true,
      data: { listings },
      evidence: {
        sourceOrganization: actualCount >= 3 ? "국토교통부" : "사용자 업로드 임대 호가",
        sourceDataset:
          actualCount >= 3
            ? "아파트 등 전월세 실거래가 자료 [MOCK]"
            : "임대 호가 자료 [MOCK]",
        dataPeriodStart: monthsAgoDate(input.monthsBack),
        dataPeriodEnd: new Date(),
        geographicUnit: "반경",
        radiusMeters: input.radiusMeters,
        rawSampleCount: listings.length,
        usedSampleCount: listings.length,
        calculationMethod: "실제계약/호가 구분 후 유사도 가중 통계",
        evidenceType: actualCount >= 3 ? "REAL_TRANSACTION" : "ESTIMATED",
        limitations:
          "본 데이터는 실제 국토교통부 전월세 실거래가 API가 아직 연결되지 않아 생성된 [MOCK] 데이터입니다. 호가는 실제 계약가와 다를 수 있습니다.",
        isMock: true,
      },
    };
  }
}

function monthsAgoDate(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

export const mockRentalProvider = new MockRentalProvider();
