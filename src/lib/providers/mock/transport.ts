import type { DataProvider, ProviderResult } from "../types";
import { createRng, pick, randInt } from "./rng";

export interface NearestTransit {
  name: string;
  distanceMeters: number;
  lineNames: string[];
}

export interface PoiEntry {
  category: string;
  name: string;
  distanceMeters: number;
}

export interface TransportOutput {
  nearestSubway: NearestTransit | null;
  nearestBusStops: { name: string; distanceMeters: number }[];
  poiList: PoiEntry[];
}

export interface TransportInput {
  seed: string;
  addressLabel: string;
}

const SUBWAY_LINES = ["신분당선", "수인분당선", "3호선", "5호선", "9호선"];
const POI_CATEGORIES = [
  "학교",
  "유치원",
  "학원",
  "병원",
  "약국",
  "마트",
  "백화점",
  "쇼핑몰",
  "공원",
  "체육시설",
  "관공서",
  "은행",
  "문화시설",
];

// 국가대중교통정보센터(TAGO)/지자체 교통공사 + POI 데이터를 대체하는 [MOCK] 생성기 (§41~42).
// 보행 경로 데이터가 없어 모든 거리는 "직선거리 기반"임을 명시한다.
export class MockTransportProvider
  implements DataProvider<TransportInput, TransportOutput>
{
  readonly key = "TransportProvider";
  readonly mode = "mock" as const;

  async fetch(input: TransportInput): Promise<ProviderResult<TransportOutput>> {
    const rng = createRng(`${input.seed}:transport`);

    const hasSubway = rng() > 0.15;
    const nearestSubway: NearestTransit | null = hasSubway
      ? {
          name: `${input.addressLabel.split(" ").slice(-1)[0] ?? "인근"}역`,
          distanceMeters: randInt(rng, 200, 1400),
          lineNames: [pick(rng, SUBWAY_LINES)],
        }
      : null;

    const nearestBusStops = Array.from({ length: 3 }).map((_, i) => ({
      name: `${input.addressLabel.split(" ").slice(-1)[0] ?? "인근"} ${i + 1}번 정류장`,
      distanceMeters: randInt(rng, 50, 500),
    }));

    const poiList: PoiEntry[] = POI_CATEGORIES.flatMap((category) => {
      const count = randInt(rng, 1, 3);
      return Array.from({ length: count }).map((_, i) => ({
        category,
        name: `${category} ${i + 1}`,
        distanceMeters: randInt(rng, 100, 1500),
      }));
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      ok: true,
      data: { nearestSubway, nearestBusStops, poiList },
      evidence: {
        sourceOrganization: "국가대중교통정보센터(TAGO) 등",
        sourceDataset: "지하철·버스 정류장 및 생활인프라 POI [MOCK]",
        asOfDate: new Date(),
        geographicUnit: "직선거리",
        rawSampleCount: poiList.length + nearestBusStops.length + (nearestSubway ? 1 : 0),
        usedSampleCount: poiList.length + nearestBusStops.length + (nearestSubway ? 1 : 0),
        calculationMethod: "대상물건 좌표 기준 직선거리 정렬",
        evidenceType: "OFFICIAL",
        limitations:
          "실제 TAGO/지자체 교통공사 API 미연동 [MOCK] 데이터. 보행 경로(Routing) 자료가 없어 직선거리 기반입니다.",
        isMock: true,
      },
    };
  }
}

export const mockTransportProvider = new MockTransportProvider();
