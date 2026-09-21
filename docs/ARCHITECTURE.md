# 사백나나 입지랩 AI — Product & Technical Architecture

> 프로그램 이름은 `APP_NAME` 환경변수로 관리한다 (기본값: "사백나나 입지랩 AI").
> 본 문서는 STEP 1~9 산출물(A~H)을 요약하고, 구현 상태를 근거와 함께 기록한다.

## 0. 제품 원칙 요약

- **EVIDENCE FIRST**: 모든 숫자/AI 판단에는 출처, 기간(dataPeriodStart/End), 기준시점(asOfDate),
  조회일(retrievedAt), 공간범위, 표본수(N), 필터, 계산방법, 데이터 성격(Badge), 신뢰도, 한계,
  원자료 링크가 따라붙는다.
- **날짜 3분리**: `dataPeriodStart/End`(분석기간) / `asOfDate`(데이터 기준시점) / `retrievedAt`(조회일)
  을 절대 혼용하지 않는다.
- **데이터 유형 Badge**: `[공식] [실거래] [공공통계] [민간] [사용자자료] [계산] [AI분석] [추정] [Proxy] [미확인]`
- **없으면 없다고 한다.** 추정치는 반드시 `[추정]`, Proxy는 반드시 `[Proxy]`로 표시하고 공식 데이터처럼
  보이게 하지 않는다.
- Mock/Demo 데이터는 항상 `[DEMO]`/`[MOCK]` 배지를 달고 실제 공공데이터와 시각적으로 구분한다.

---

## A. 제품 아키텍처 (Product Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js App Router (TypeScript strict)                              │
│                                                                        │
│  app/                                                                  │
│   ├─ (dashboard)/properties/[id]/page.tsx   메인 Dashboard (탭 15개) │
│   ├─ (dashboard)/properties/new             물건 등록 (직접입력/캡처 │
│   │                                          /텍스트/PDF/URL)         │
│   ├─ api/analysis/[propertyId]/route.ts     분석 오케스트레이션 API   │
│   └─ api/evidence/[id]/route.ts             근거 Drill-down API       │
│                                                                        │
│  lib/                                                                  │
│   ├─ providers/            Provider Adapter 계층 (§E)                │
│   ├─ comparable/           Comparable Engine (§F)                    │
│   ├─ evidence/             Evidence 생성·저장 (§E)                   │
│   ├─ confidence/           신뢰도 규칙 엔진 (§53)                    │
│   ├─ importer/             Screenshot/PDF/CSV/Text/HTML Importer     │
│   └─ geocode/              주소→좌표 변환 Adapter                    │
│                                                                        │
│  prisma/schema.prisma      DB Schema (§G, SQLite dev / Postgres prod)│
└─────────────────────────────────────────────────────────────────────┘
```

**요청 흐름 (물건 조회 1건 기준)**
1. 사용자가 물건 등록 (주소 필수, 나머지 선택) → 지오코딩 → `Property` + 좌표 저장.
2. Dashboard 진입 시 `AnalysisOrchestrator`가 물건종류에 따라 활성화할 Provider 목록을 결정
   (아파트면 ApartmentProvider 우선, 상가면 CommercialDistrictProvider 우선 등, §71).
3. 각 Provider는 독립적으로 호출되고, 실패해도 해당 카드만 "데이터 연결 안 됨"으로 표시되며
   전체 요청은 죽지 않는다 (Promise.allSettled 기반 오케스트레이션).
4. Provider가 반환한 raw 데이터는 `Evidence` 레코드로 정규화되어 저장되고, 화면은 Evidence를
   통해서만 숫자를 렌더링한다 (숫자 → Evidence → RawData 3단 구조, §30).
5. Comparable Engine이 유사사례를 물건종류별 가중치로 점수화하고, 결과 역시 Evidence로 감싼다.
6. AI Provider는 Evidence 묶음을 컨텍스트로 받아 리포트를 생성하며, 모든 핵심 문장에
   `evidenceIds[]`를 첨부한다 ("근거 보기" 클릭 시 해당 Evidence를 그대로 보여준다 — AI가 숫자를
   재생성하지 않는다).

---

## B. 화면 구조 (Screen / Tab Structure)

- **물건 등록**: 직접입력 / 화면 캡처(Vision 추출 후 "추출결과 확인" 승인 필수) / 텍스트 붙여넣기 /
  PDF 업로드 / URL. 자동 저장 없음 — 항상 사용자 승인 단계를 거친다.
- **메인 Dashboard** (`/properties/[id]`)
  - 상단: 대상물건 요약 카드 + 지도 미니뷰
  - "AI 입지 한눈에 보기" KPI 그리드 (각 카드 하단에 출처·기간·N 고정 표시 + `[근거 보기]`)
  - 탭: ① 종합 ② 지도 ③ 유사사례 ④ 실거래·가격 ⑤ 임대시장 ⑥ 배후주거 ⑦ 인구·세대
    ⑧ 직장·사업체·구매력 ⑨ 상권·유동인구 ⑩ 교통·생활인프라 ⑪ 개발계획 ⑫ 공급·공실·경쟁
    ⑬ 환경·토지·건물 ⑭ AI 입지리포트 ⑮ 데이터 근거
- **데이터 부족 시**: 카드를 숨기지 않고 "자료 부족 · N=k · [검색범위 확대]" 형태로 표시 (§64).

물건종류(`propertyType`)에 따라 탭 내부 위젯의 **표시 순서**가 바뀐다 (§71):
아파트 → 동일단지/동일평형 최우선, 상가 → 동일건물/1층여부/상권, 주택류 → 대지지분/도로/연식.

---

## C. 데이터 확보 가능성 Matrix

`docs/DATA_MATRIX.md` 참조 (분석항목/원하는데이터/후보기관/정확한데이터셋명/공식API여부/
최신기준시점/공간단위/자동수집가능/무료유료/구현난이도/대체Proxy/주의사항 12개 컬럼).

---

## D. 데이터 Provider 설계

인터페이스는 `lib/providers/types.ts`에 정의된 공통 계약을 따른다.

```ts
interface ProviderResult<T> {
  ok: boolean;
  data?: T;
  evidence?: EvidenceInput;   // Evidence DB에 즉시 저장 가능한 형태
  error?: { code: string; message: string };
}

interface DataProvider<Input, Output> {
  readonly key: string;              // 'REAL_TRANSACTION' 등
  readonly mode: 'mock' | 'live';
  fetch(input: Input): Promise<ProviderResult<Output>>;
}
```

Provider 목록: RealTransactionProvider, ApartmentProvider, CommercialMarketProvider,
RentalProvider, ComparableProvider, AuctionComparableProvider, PopulationProvider,
BusinessProvider, CommercialDistrictProvider, TransportProvider, BuildingProvider,
LandProvider, DevelopmentProvider, POIProvider, MapProvider, AIProvider.

각 Provider는 `mock` 구현(고정 seed, `[DEMO]/[MOCK]` 배지 포함)과 `live` 구현(실제 공식 API,
`docs/DATA_MATRIX.md`에서 검증된 것만)을 갖고, 환경변수로 전환한다
(`PROVIDER_MODE=mock|live`, Provider별 override 가능).

Provider 실패 격리: `ProviderRegistry.fetchAll()`은 `Promise.allSettled`를 사용하여 한 Provider의
예외가 다른 Provider나 페이지 전체에 전파되지 않게 한다.

---

## E. Evidence 구조

`Evidence` 모델(§52)을 단일 진실 소스로 사용한다. 모든 Provider 결과와 Comparable 계산,
AI 문장은 Evidence를 생성/참조해야 하며, UI는 숫자를 직접 하드코딩하지 않고 항상
`evidenceId`를 통해 렌더링한다. 신뢰도(`confidenceScore`)는 §53의 규칙 기반 엔진
(`lib/confidence/score.ts`)으로 계산하고 AI가 임의로 매기지 않는다.

---

## F. Comparable Algorithm

`lib/comparable/`에 물건종류별 가중치 프로파일(§15~20)을 정의하고, 공통 파이프라인은:

1. **후보 수집**: 동일건물/단지 → 300m → 500m → 1km → 2km → 동일생활권 순으로 단계적 확대,
   충분한 표본이 가까이 있으면 확대를 중단한다 (§22).
2. **기간 필터**: 물건종류별 기본 분석기간 적용 (§23), 사용자가 조정 가능.
3. **유사도 채점**: 물건종류별 가중치 테이블로 0~100점 Similarity Score 계산, 각 사례에
   "왜 유사한가" 사유 배열을 함께 생성 (§14).
4. **등급 분류**: 90~100/80~89/70~79/60~69/60미만 (§21). 기본 컷오프 70, 표본 부족 시 60으로
   완화하며 이 사실을 UI에 명시.
5. **통계 산출**: 평균/중앙값/가중평균/가중중앙값/P25/P50/P75/최소/최대, 대표값은
   유사도 가중 중앙값 우선 (§27~28). 이상치는 제거하지 않고 원표본N/이상치후보N/최종N을
   모두 노출하며 포함/제외 토글 제공 (§29).
6. **Evidence 포장**: 최종 결과 + 표본 리스트(Raw Data)를 Evidence로 저장.

---

## G. DB Schema

`prisma/schema.prisma` 참조. 핵심 모델: `Property`, `AuctionInfo`, `Evidence`, `RawDataRecord`,
`ComparableCase`, `AnalysisSnapshot`, `AIReport`, `ImportedDocument`, `ProviderCache`.

---

## H. MVP 구현 계획 (Phase 1)

물건등록 → 좌표 변환(geocode) → 지도 → Comparable Engine(Mock 실거래) → Evidence UI →
종합 Dashboard 까지 Mock 데이터로 완전히 동작하는 흐름을 우선 구현한다. 이후 Phase 2~4는
README의 "미구현 데이터" 섹션에 기록하고 순차 확장한다.
