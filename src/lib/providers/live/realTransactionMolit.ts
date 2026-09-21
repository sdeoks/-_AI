import { XMLParser } from "fast-xml-parser";
import { findLawdCode } from "@/lib/reference/lawdCode";
import type { DataProvider, ProviderResult } from "../types";
import type {
  RawTransactionRecord,
  RealTransactionOutput,
} from "../mock/realTransaction";

// 국토교통부_아파트 매매 실거래가 상세 자료 (공공데이터포털, 서비스명 RTMSDataSvcAptTradeDev)
// https://www.data.go.kr/data/15126468/openapi.do
//
// ⚠️ 이 Provider는 이 개발 세션(샌드박스)에서 실제로 호출/검증하지 못했다.
// data.go.kr / apis.data.go.kr 도메인이 이 세션의 네트워크 정책으로 차단되어
// 공식 문서를 직접 열람하거나 실제 요청·응답을 확인할 수 없었기 때문이다
// (배포된 앱 자체는 이 제약과 무관하다). 아래 구현은 수년간 안정적으로 알려진
// 요청/응답 스펙(§6 참고)을 기반으로 작성했으며, 실제 서비스키로 최초 실행 시
// 반드시 응답을 확인하고 아래 필드 매핑을 검증해야 한다.
//
// 알려진 한계:
// 1) 이 API는 좌표를 제공하지 않는다. 대상물건과의 거리는 "동일 법정동 여부"만으로
//    근사(Proxy)하며, 각 거래건의 지도 좌표는 대상물건 좌표를 그대로 재사용한다.
// 2) 지역 매핑은 src/lib/reference/lawdCode.ts의 커버리지 제한 테이블을 사용한다.
//    표에 없는 지역은 실패로 처리하며 임의로 추측하지 않는다.
// 3) 이 API는 아파트 매매만 제공한다. 다른 물건종류는 별도 서비스가 필요하며
//    아직 미구현이다(Mock으로 유지).
// 4) data.go.kr 서비스키는 "Decoding(원본)" 키를 사용해야 한다. "Encoding" 키를
//    쓰면 URLSearchParams가 이중 인코딩해 인증 오류가 날 수 있다.

const ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

export interface LiveRealTransactionInput {
  address: string;
  lat: number;
  lng: number;
  monthsBack: number;
  targetExclusiveArea?: number;
  seed: string;
}

const MAX_MONTHS_QUERIED = 12; // API가 월 단위 조회만 지원 — 과도한 호출을 막기 위한 상한

export class MolitRealTransactionProvider
  implements DataProvider<LiveRealTransactionInput, RealTransactionOutput>
{
  readonly key = "REAL_TRANSACTION_MOLIT";
  readonly mode = "live" as const;

  async fetch(
    input: LiveRealTransactionInput,
  ): Promise<ProviderResult<RealTransactionOutput>> {
    const apiKey = process.env.DATA_GO_KR_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: {
          code: "NO_API_KEY",
          message: "DATA_GO_KR_API_KEY가 설정되지 않았습니다.",
        },
      };
    }

    const lawd = findLawdCode(input.address);
    if (!lawd) {
      return {
        ok: false,
        error: {
          code: "LAWD_CODE_NOT_FOUND",
          message: `주소 "${input.address}"에 대한 법정동코드를 찾지 못했습니다. src/lib/reference/lawdCode.ts 테이블을 확장해야 합니다.`,
        },
      };
    }

    const months = buildMonthList(Math.min(input.monthsBack, MAX_MONTHS_QUERIED));
    const records: RawTransactionRecord[] = [];
    const monthErrors: string[] = [];
    const dongHint = extractDongHint(input.address);

    for (const yyyymm of months) {
      try {
        const monthRecords = await fetchOneMonth({
          apiKey,
          lawdCode: lawd.code,
          dealYmd: yyyymm,
          seed: input.seed,
          lat: input.lat,
          lng: input.lng,
          dongHint,
        });
        records.push(...monthRecords);
      } catch (err) {
        monthErrors.push(`${yyyymm}: ${(err as Error).message}`);
      }
    }

    if (records.length === 0 && monthErrors.length === months.length) {
      return {
        ok: false,
        error: {
          code: "FETCH_FAILED",
          message: `모든 월 조회가 실패했습니다: ${monthErrors.join("; ")}`,
        },
      };
    }

    const periodStart = monthsAgoDate(months.length);
    const periodEnd = new Date();

    return {
      ok: true,
      data: { records },
      evidence: {
        sourceOrganization: "국토교통부",
        sourceDataset: "아파트 매매 실거래가 상세 자료 (RTMSDataSvcAptTradeDev)",
        sourceUrl: "https://www.data.go.kr/data/15126468/openapi.do",
        dataPeriodStart: periodStart,
        dataPeriodEnd: periodEnd,
        geographicUnit: `법정동코드 ${lawd.code} (${lawd.matchedRegionLabel})`,
        rawSampleCount: records.length,
        calculationMethod: "실거래금액 중앙값 · 유사도 가중 중앙값",
        evidenceType: "REAL_TRANSACTION",
        limitations:
          "실제 국토교통부 API 응답입니다. 단, 원자료에 좌표가 없어 지도상 위치와 거리는 대상물건 좌표 및 동일 법정동 여부 기반 근사치입니다." +
          (monthErrors.length > 0
            ? ` 일부 월 조회 실패: ${monthErrors.join("; ")}`
            : ""),
        isMock: false,
      },
    };
  }
}

async function fetchOneMonth(args: {
  apiKey: string;
  lawdCode: string;
  dealYmd: string;
  seed: string;
  lat: number;
  lng: number;
  dongHint: string | null;
}): Promise<RawTransactionRecord[]> {
  // data.go.kr 서비스키는 특수문자가 포함된 "Decoding" 키를 그대로 쿼리스트링에
  // 붙이는 방식이 일반적이다. 이미 %가 포함돼 있으면(Encoding 키) 그대로 사용하고,
  // 아니면 encodeURIComponent로 인코딩한다.
  const encodedKey = args.apiKey.includes("%")
    ? args.apiKey
    : encodeURIComponent(args.apiKey);

  const qs = new URLSearchParams({
    LAWD_CD: args.lawdCode,
    DEAL_YMD: args.dealYmd,
    numOfRows: "200",
    pageNo: "1",
  });
  const url = `${ENDPOINT}?serviceKey=${encodedKey}&${qs.toString()}`;

  const res = await fetch(url, { headers: { Accept: "application/xml" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const xmlText = await res.text();

  const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
  const parsed = parser.parse(xmlText);

  // data.go.kr는 인증 실패 등 일부 오류에서 <response> 대신
  // <OpenAPI_ServiceResponse><cmmMsgHeader>... 형태의 별도 오류 포맷을 반환하는
  // 것으로 널리 알려져 있다 (이 세션에서 실제 확인은 못 했다).
  const serviceErrorMsg = parsed?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;
  if (serviceErrorMsg) {
    throw new Error(`API 서비스 오류: ${serviceErrorMsg}`);
  }

  const header = parsed?.response?.header;
  if (header) {
    const resultCode = String(header.resultCode ?? "").trim();
    if (resultCode !== "00" && resultCode !== "000") {
      throw new Error(`API 오류 resultCode=${resultCode} (${header.resultMsg ?? "알 수 없는 오류"})`);
    }
  }

  const itemsRaw = parsed?.response?.body?.items?.item;
  const items: Record<string, unknown>[] = Array.isArray(itemsRaw)
    ? itemsRaw
    : itemsRaw
      ? [itemsRaw]
      : [];

  const records: RawTransactionRecord[] = [];
  items.forEach((item, i) => {
    const record = mapItemToRecord(item, {
      seed: args.seed,
      dealYmd: args.dealYmd,
      index: i,
      lat: args.lat,
      lng: args.lng,
      dongHint: args.dongHint,
    });
    if (record) records.push(record);
  });
  return records;
}

function mapItemToRecord(
  item: Record<string, unknown>,
  ctx: {
    seed: string;
    dealYmd: string;
    index: number;
    lat: number;
    lng: number;
    dongHint: string | null;
  },
): RawTransactionRecord | null {
  const priceRaw = pick(item, ["거래금액", "dealAmount"]);
  const areaRaw = pick(item, ["전용면적", "excluUseAr"]);
  const dayRaw = pick(item, ["일", "dealDay"]);
  if (priceRaw == null || areaRaw == null || dayRaw == null) return null;

  const priceAmount = parseAmountToWon(priceRaw);
  const exclusiveArea = toNumber(areaRaw);
  if (!priceAmount || !exclusiveArea) return null;

  const year = ctx.dealYmd.slice(0, 4);
  const month = ctx.dealYmd.slice(4, 6);
  const day = String(toNumber(dayRaw)).padStart(2, "0");
  const transactionDate = `${year}-${month}-${day}`;

  const complexName = String(pick(item, ["아파트", "aptNm"]) ?? "").trim() || undefined;
  const jibun = String(pick(item, ["지번", "jibun"]) ?? "").trim();
  const dong = String(pick(item, ["법정동", "umdNm"]) ?? "").trim();
  const builtYearRaw = pick(item, ["건축년도", "buildYear"]);
  const floorRaw = pick(item, ["층", "floor"]);

  const sameDong = ctx.dongHint != null && dong.length > 0 && ctx.dongHint === dong;
  // 원자료에 좌표가 없어 거리(m)를 직접 계산할 수 없다. 동일 법정동이면 0m,
  // 아니면 "같은 시군구, 정확한 거리 불명"의 의미로 800m를 근사치로 사용한다.
  const distanceMeters = sameDong ? 0 : 800;

  return {
    id: `${ctx.seed}-molit-${ctx.dealYmd}-${ctx.index}`,
    transactionDate,
    address: [dong, jibun].filter(Boolean).join(" ") || "주소 미상",
    complexName,
    distanceMeters,
    exclusiveArea,
    floor: floorRaw != null ? toNumber(floorRaw) : null,
    priceAmount,
    builtYear: builtYearRaw != null ? toNumber(builtYearRaw) : undefined,
    lat: ctx.lat,
    lng: ctx.lng,
  };
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
}

function toNumber(v: unknown): number {
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isNaN(n) ? 0 : n;
}

// 거래금액은 "만원" 단위(콤마 포함 문자열)로 내려온다 → 원 단위로 변환
function parseAmountToWon(v: unknown): number {
  return Math.round(toNumber(v) * 10_000);
}

function buildMonthList(count: number): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}${m}`);
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

function monthsAgoDate(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

// 주소 문자열에서 "OO동/읍/면" 형태의 마지막 토큰을 느슨하게 추출한다.
// LAWD_CD 매핑과 마찬가지로 완벽하지 않은 휴리스틱이며, 매칭 실패 시 null.
function extractDongHint(address: string): string | null {
  const match = address.match(/([가-힣0-9]+(동|읍|면))(?:\s|$)/);
  return match ? match[1] : null;
}

export const molitRealTransactionProvider = new MolitRealTransactionProvider();
