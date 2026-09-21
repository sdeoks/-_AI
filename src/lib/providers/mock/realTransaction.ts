import type { PropertyType } from "@/lib/enums";
import type { DataProvider, ProviderResult } from "../types";

export interface RawTransactionRecord {
  id: string;
  transactionDate: string; // ISO date
  address: string;
  complexName?: string;
  distanceMeters: number;
  exclusiveArea: number; // ㎡
  floor: number | null;
  priceAmount: number; // 원
  builtYear?: number;
  lat: number;
  lng: number;
}

export interface RealTransactionInput {
  lat: number;
  lng: number;
  propertyType: PropertyType;
  radiusMeters: number;
  monthsBack: number;
  targetExclusiveArea?: number;
  seed: string;
}

export interface RealTransactionOutput {
  records: RawTransactionRecord[];
}

// 국토교통부 실거래가 자료를 대체하는 [MOCK] 데이터 생성기.
// 실제 서비스에서는 공공데이터포털 RTMS API 응답으로 교체되어야 한다.
// (docs/DATA_MATRIX.md "아파트 실거래" 행 참고 — 서비스ID 등 공식 문서 재확인 필요)
export class MockRealTransactionProvider
  implements DataProvider<RealTransactionInput, RealTransactionOutput>
{
  readonly key = "REAL_TRANSACTION";
  readonly mode = "mock" as const;

  async fetch(
    input: RealTransactionInput,
  ): Promise<ProviderResult<RealTransactionOutput>> {
    const rng = mulberry32(hashSeed(input.seed));
    const count = 40 + Math.floor(rng() * 60); // 40~99건 원표본

    const basePricePerArea = pricePerAreaBase(input.propertyType); // 원/㎡
    const targetArea = input.targetExclusiveArea ?? areaDefault(input.propertyType);

    const complexNames = generateComplexNames(rng, input.propertyType);

    const records: RawTransactionRecord[] = Array.from({ length: count }).map(
      (_, i) => {
        const distanceMeters = Math.round(rng() * input.radiusMeters);
        const areaJitter = (rng() - 0.5) * targetArea * 0.5;
        const exclusiveArea = Math.max(15, Math.round(targetArea + areaJitter));
        const monthsAgo = Math.floor(rng() * input.monthsBack);
        const date = new Date();
        date.setMonth(date.getMonth() - monthsAgo);
        date.setDate(1 + Math.floor(rng() * 27));

        const distanceFactor = 1 - (distanceMeters / (input.radiusMeters * 2.2));
        const areaFactor = 1 - Math.abs(exclusiveArea - targetArea) / (targetArea * 4);
        const noise = 0.9 + rng() * 0.2;
        const pricePerArea = Math.max(
          basePricePerArea * 0.5,
          basePricePerArea * distanceFactor * areaFactor * noise,
        );
        const priceAmount = Math.round((pricePerArea * exclusiveArea) / 1_000_000) * 1_000_000;

        const angle = rng() * Math.PI * 2;
        const metersPerDegLat = 111_320;
        const metersPerDegLng = 111_320 * Math.cos((input.lat * Math.PI) / 180);
        const dLat = (Math.sin(angle) * distanceMeters) / metersPerDegLat;
        const dLng = (Math.cos(angle) * distanceMeters) / metersPerDegLng;

        return {
          id: `${input.seed}-tx-${i}`,
          transactionDate: date.toISOString().slice(0, 10),
          address: `${input.seed.includes("광교") ? "경기 수원시 영통구 광교" : "인근"} ${i + 1}번지`,
          complexName: complexNames[i % complexNames.length],
          distanceMeters,
          exclusiveArea,
          floor: input.propertyType === "land" ? null : 1 + Math.floor(rng() * 25),
          priceAmount,
          builtYear: 2005 + Math.floor(rng() * 20),
          lat: Number((input.lat + dLat).toFixed(6)),
          lng: Number((input.lng + dLng).toFixed(6)),
        };
      },
    );

    return {
      ok: true,
      data: { records },
      evidence: {
        sourceOrganization: "국토교통부",
        sourceDataset: `${propertyTypeDatasetLabel(input.propertyType)} 실거래가 자료 [MOCK]`,
        dataPeriodStart: monthsAgoDate(input.monthsBack),
        dataPeriodEnd: new Date(),
        geographicUnit: "반경",
        radiusMeters: input.radiusMeters,
        rawSampleCount: records.length,
        calculationMethod: "실거래금액 중앙값 · 유사도 가중 중앙값",
        evidenceType: "REAL_TRANSACTION",
        limitations:
          "본 데이터는 실제 국토교통부 API가 아직 연결되지 않아 생성된 [MOCK] 데이터입니다.",
        isMock: true,
      },
    };
  }
}

function propertyTypeDatasetLabel(type: PropertyType): string {
  switch (type) {
    case "apartment":
      return "아파트 매매";
    case "officetel":
      return "오피스텔 매매";
    case "row_house":
    case "multiplex_house":
      return "연립다세대 매매";
    case "detached_house":
    case "multi_household_house":
      return "단독·다가구 매매";
    case "retail":
    case "sectional_retail":
    case "neighborhood_facility":
    case "commercial_building":
    case "office":
      return "상업업무용 매매";
    case "land":
      return "토지 매매";
    default:
      return "부동산 매매";
  }
}

function pricePerAreaBase(type: PropertyType): number {
  switch (type) {
    case "apartment":
      return 14_500_000;
    case "officetel":
      return 9_500_000;
    case "row_house":
    case "multiplex_house":
      return 7_800_000;
    case "detached_house":
    case "multi_household_house":
      return 6_500_000;
    case "retail":
    case "sectional_retail":
    case "neighborhood_facility":
    case "commercial_building":
      return 11_000_000;
    case "office":
      return 8_800_000;
    case "land":
      return 5_200_000;
    default:
      return 8_000_000;
  }
}

function areaDefault(type: PropertyType): number {
  switch (type) {
    case "apartment":
      return 84;
    case "officetel":
      return 45;
    case "retail":
    case "sectional_retail":
    case "neighborhood_facility":
      return 60;
    case "land":
      return 200;
    default:
      return 70;
  }
}

function generateComplexNames(rng: () => number, type: PropertyType): string[] {
  if (type !== "apartment") return ["-"];
  const prefixes = ["광교", "e편한세상", "자연앤", "힐스테이트", "푸르지오", "래미안"];
  const suffixes = ["파크뷰", "센트럴", "레이크", "포레", "스퀘어"];
  const names = new Set<string>();
  while (names.size < 6) {
    const p = prefixes[Math.floor(rng() * prefixes.length)];
    const s = suffixes[Math.floor(rng() * suffixes.length)];
    names.add(`${p} ${s}`);
  }
  return Array.from(names);
}

function monthsAgoDate(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const mockRealTransactionProvider = new MockRealTransactionProvider();
