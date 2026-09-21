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

export const populationProvider = new NotConnectedProvider("PopulationProvider");
export const businessProvider = new NotConnectedProvider("BusinessProvider");
export const commercialDistrictProvider = new NotConnectedProvider(
  "CommercialDistrictProvider",
);
export const transportProvider = new NotConnectedProvider("TransportProvider");
export const rentalProvider = new NotConnectedProvider("RentalProvider");
export const auctionComparableProvider = new NotConnectedProvider(
  "AuctionComparableProvider",
);
export const developmentProvider = new NotConnectedProvider("DevelopmentProvider");
export const landProvider = new NotConnectedProvider("LandProvider");
export const buildingProvider = new NotConnectedProvider("BuildingProvider");
export const poiProvider = new NotConnectedProvider("POIProvider");
export const apartmentComplexProvider = new NotConnectedProvider(
  "ApartmentComplexProvider",
);
