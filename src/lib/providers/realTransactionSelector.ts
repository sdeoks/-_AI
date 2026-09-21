import type { PropertyType } from "@/lib/enums";

// live 모드 전환 조건: PROVIDER_MODE=live && DATA_GO_KR_API_KEY 설정 && 아파트.
// (RTMSDataSvcAptTradeDev는 아파트 매매만 제공 — 다른 물건종류는 아직 live
// Provider가 없어 항상 Mock을 사용한다.)
export function isLiveRealTransactionEnabled(propertyType: PropertyType): boolean {
  return (
    process.env.PROVIDER_MODE === "live" &&
    !!process.env.DATA_GO_KR_API_KEY &&
    propertyType === "apartment"
  );
}
