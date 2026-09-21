import type { PropertyType } from "@/lib/enums";
import type { DataProvider, ProviderResult } from "../types";
import { createRng, pick, randInt } from "./rng";

export interface AuctionCaseRecord {
  id: string;
  caseNumber: string;
  court: string;
  address: string;
  distanceMeters: number;
  exclusiveArea: number;
  floor: number | null;
  appraisalPrice: number;
  minimumSalePrice: number;
  winningBidPrice: number;
  winningBidRatio: number; // 낙찰가율 = 낙찰가/감정가
  failedBidCount: number;
  bidderCount: number;
  saleDate: string;
  pricePerAreaWinning: number;
}

export interface AuctionComparableOutput {
  cases: AuctionCaseRecord[];
}

export interface AuctionComparableInput {
  propertyType: PropertyType;
  radiusMeters: number;
  monthsBack: number;
  targetExclusiveArea?: number;
  seed: string;
}

const COURTS = ["수원지방법원", "서울중앙지방법원", "인천지방법원", "성남지원"];

// 법원경매정보(대법원) 공개 범위를 대체하는 [MOCK] 생성기 (§25).
// 유료 경매정보 사이트를 무단 크롤링하지 않는다는 원칙에 따라, 실제 서비스에서는
// 이 Provider 대신 사용자가 합법적으로 확보한 자료(Screenshot/PDF/CSV)를
// Comparable Importer로 넣는 경로도 함께 제공되어야 한다 (현재 미구현, §59).
export class MockAuctionComparableProvider
  implements DataProvider<AuctionComparableInput, AuctionComparableOutput>
{
  readonly key = "AuctionComparableProvider";
  readonly mode = "mock" as const;

  async fetch(
    input: AuctionComparableInput,
  ): Promise<ProviderResult<AuctionComparableOutput>> {
    const rng = createRng(`${input.seed}:auction`);
    const count = randInt(rng, 3, 12);
    const targetArea = input.targetExclusiveArea ?? 84;
    const basePricePerArea = 13_000_000;

    const cases: AuctionCaseRecord[] = Array.from({ length: count }).map((_, i) => {
      const exclusiveArea = Math.max(
        15,
        Math.round(targetArea + (rng() - 0.5) * targetArea * 0.4),
      );
      const distanceMeters = Math.round(rng() * input.radiusMeters);
      const monthsAgo = Math.floor(rng() * input.monthsBack);
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);

      const appraisalPricePerArea = basePricePerArea * (0.9 + rng() * 0.3);
      const appraisalPrice = Math.round((appraisalPricePerArea * exclusiveArea) / 1_000_000) * 1_000_000;
      const failedBidCount = Math.random() < 0.4 ? 0 : randInt(rng, 1, 3);
      const minimumSalePrice = Math.round(
        appraisalPrice * (1 - failedBidCount * 0.2),
      );
      const winningBidRatio = Math.round((0.75 + rng() * 0.35) * 1000) / 1000;
      const winningBidPrice = Math.round((appraisalPrice * winningBidRatio) / 1_000_000) * 1_000_000;

      return {
        id: `${input.seed}-auction-${i}`,
        caseNumber: `${date.getFullYear()}타경${randInt(rng, 1000, 99999)}`,
        court: pick(rng, COURTS),
        address: `인근 ${i + 1}번지`,
        distanceMeters,
        exclusiveArea,
        floor: 1 + Math.floor(rng() * 20),
        appraisalPrice,
        minimumSalePrice,
        winningBidPrice,
        winningBidRatio,
        failedBidCount,
        bidderCount: randInt(rng, 1, 12),
        saleDate: date.toISOString().slice(0, 10),
        pricePerAreaWinning: Math.round(winningBidPrice / exclusiveArea),
      };
    });

    return {
      ok: true,
      data: { cases },
      evidence: {
        sourceOrganization: "법원경매정보(대법원)",
        sourceDataset: "법원경매정보 매각통계 [MOCK]",
        dataPeriodStart: monthsAgoDate(input.monthsBack),
        dataPeriodEnd: new Date(),
        geographicUnit: "반경",
        radiusMeters: input.radiusMeters,
        rawSampleCount: cases.length,
        usedSampleCount: cases.length,
        calculationMethod: "낙찰가율 중앙값 및 평당 낙찰가 집계",
        evidenceType: "OFFICIAL",
        limitations:
          "본 데이터는 실제 법원경매정보 공개자료 연동이 아직 구현되지 않아 생성된 [MOCK] 데이터입니다. 유료 경매정보 사이트는 무단 크롤링하지 않으며, 사용자 업로드 Importer는 아직 미구현입니다.",
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

export const mockAuctionComparableProvider = new MockAuctionComparableProvider();
