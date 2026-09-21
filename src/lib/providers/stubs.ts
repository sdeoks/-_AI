import type { DataProvider, ProviderResult } from "./types";
import { notConnectedResult } from "./types";

// Phase 2~4에서 구현 예정인 Provider들의 자리표시자(placeholder).
// 실제 공식 API 연동 전까지는 항상 ok:false를 반환하여 UI가
// "데이터 연결 안 됨"을 정직하게 표시하도록 한다 (§58, §72).
class NotConnectedProvider<Input> implements DataProvider<Input, never> {
  constructor(
    readonly key: string,
    readonly mode: "mock" | "live" = "live",
  ) {}

  async fetch(): Promise<ProviderResult<never>> {
    return notConnectedResult(this.key);
  }
}

// Population/Business/CommercialDistrict/Transport(+POI)/ApartmentComplex(배후주거)/
// Rental/AuctionComparable/Development/SupplyVacancy는 Mock 구현으로 전환되어
// src/lib/providers/mock/ 로 이동했다. Land/Building은 Task 15에서 전환 예정.
export const landProvider = new NotConnectedProvider("LandProvider");
export const buildingProvider = new NotConnectedProvider("BuildingProvider");
