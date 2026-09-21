import { mockGeocodeAdapter } from "./mock";
import type { GeocodeAdapter } from "./types";

// 실제 VWorld/Kakao/Naver 키가 등록되면 여기서 provider 전환 로직을 추가한다.
// 현재는 Mock만 구현되어 있다 (README "미구현 Provider" 참고).
export function getGeocodeAdapter(): GeocodeAdapter {
  return mockGeocodeAdapter;
}

export * from "./types";
