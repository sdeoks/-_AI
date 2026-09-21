import type { DataProvider, ProviderResult } from "./types";
import { notConnectedResult } from "./types";

// 아직 연결되지 않은(또는 Mock 모드가 아닌 환경에서 API 키가 없는) Provider를 위한
// 범용 자리표시자. 실제 공식 API 연동(live 모드) 전까지는 항상 ok:false를 반환하여
// UI가 "데이터 연결 안 됨"을 정직하게 표시하도록 한다 (§58, §72).
//
// 현재 §58에서 정의한 데이터 도메인 Provider는 모두 Mock 구현이 존재한다
// (src/lib/providers/mock/). 이 클래스는 향후 실제 API 키가 설정되지 않은
// live 모드 Provider의 fallback으로 재사용한다.
export class NotConnectedProvider<Input> implements DataProvider<Input, never> {
  constructor(
    readonly key: string,
    readonly mode: "mock" | "live" = "live",
  ) {}

  async fetch(): Promise<ProviderResult<never>> {
    return notConnectedResult(this.key);
  }
}
