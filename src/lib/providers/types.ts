import type { EvidenceType } from "@/lib/enums";

// Evidence 레코드를 만들기 위한 최소 정보. propertyId/analysisCategory/metricLabel/
// metricValue 등은 호출부(오케스트레이터)가 채워 넣는다.
export interface EvidenceInput {
  sourceOrganization: string;
  sourceDataset: string;
  sourceUrl?: string;
  dataPeriodStart?: Date;
  dataPeriodEnd?: Date;
  asOfDate?: Date;
  geographicUnit?: string;
  radiusMeters?: number;
  rawSampleCount?: number;
  excludedSampleCount?: number;
  usedSampleCount?: number;
  filterDescription?: string;
  calculationMethod?: string;
  evidenceType: EvidenceType;
  limitations?: string;
  isMock: boolean;
}

export interface ProviderError {
  code: string;
  message: string;
}

export interface ProviderResult<T> {
  ok: boolean;
  data?: T;
  evidence?: EvidenceInput;
  error?: ProviderError;
}

export interface DataProvider<Input, Output> {
  readonly key: string;
  readonly mode: "mock" | "live";
  fetch(input: Input): Promise<ProviderResult<Output>>;
}

export function notConnectedResult<T>(providerKey: string): ProviderResult<T> {
  return {
    ok: false,
    error: {
      code: "PROVIDER_NOT_CONNECTED",
      message: `${providerKey}: 데이터 연결 안 됨 (미구현 — 추후 공식 API 연동 예정)`,
    },
  };
}
