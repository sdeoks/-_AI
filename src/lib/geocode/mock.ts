import type { GeocodeAdapter, GeocodeResult } from "./types";

// [MOCK] 실제 VWorld/Kakao/Naver 지오코딩 API가 연결되지 않은 상태에서 사용하는
// 결정론적(deterministic) 가짜 지오코더. 같은 주소는 항상 같은 좌표를 반환하여
// 데모/개발 중 반복 조회 결과가 흔들리지 않게 한다. 실제 서비스 배포 전 반드시
// 공식 지오코딩 API로 교체해야 한다 (docs/DATA_MATRIX.md 참고).

const GWANGGYO_CENTER = { lat: 37.2946, lng: 127.0454 };
const SEOUL_METRO_CENTER = { lat: 37.5665, lng: 126.978 };

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class MockGeocodeAdapter implements GeocodeAdapter {
  readonly key = "mock-geocoder";

  async geocode(address: string): Promise<GeocodeResult> {
    const trimmed = address.trim();
    if (!trimmed) {
      return { lat: 0, lng: 0, provider: this.key, confidence: "failed" };
    }

    const center = trimmed.includes("광교")
      ? GWANGGYO_CENTER
      : SEOUL_METRO_CENTER;

    const h = hashString(trimmed);
    // 중심점 기준 약 ±1.2km 내로 결정론적으로 분산시킨다.
    const dLat = ((h % 2000) - 1000) / 1000 / 90; // 위도 1도 ≈ 111km
    const dLng = (((h >> 11) % 2000) - 1000) / 1000 / 70;

    return {
      lat: Number((center.lat + dLat).toFixed(6)),
      lng: Number((center.lng + dLng).toFixed(6)),
      provider: this.key,
      confidence: "approximate",
    };
  }
}

export const mockGeocodeAdapter = new MockGeocodeAdapter();
