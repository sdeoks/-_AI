# 사백나나 입지랩 AI

> 부제: "현장 가기 전, 손품으로 보는 부동산의 모든 것"

부동산 물건(아파트/오피스텔/연립다세대/단독·다가구/상가/토지 등, 경매·일반매매 모두)의
입지·시장성을 분석하는 AI 리서치 플랫폼입니다. 앱 이름은 `NEXT_PUBLIC_APP_NAME`
환경변수로 바꿀 수 있습니다.

**제품 원칙 — EVIDENCE FIRST**: 모든 숫자와 AI 판단에는 출처 기관·데이터셋·기간·기준시점·
조회일·표본수(N)·계산방법·신뢰도·한계·원자료가 함께 표시됩니다. 자세한 제품/데이터 설계는
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/DATA_MATRIX.md`](./docs/DATA_MATRIX.md)
참고.

## 지금 무엇이 실제로 동작하는가 (중요)

이 저장소는 **완전히 새로운 프로젝트**로 처음부터 작성되었습니다. 아래 흐름은 Mock 데이터로
**실제로 end-to-end 동작합니다** (공공 API 키 없이도 확인 가능):

```
물건 등록(주소 직접입력) → 지오코딩(Mock) → 지도(좌표 산점도) →
Comparable Engine(유사사례 채점) → Evidence 저장/표시 →
AI 입지 리포트 23섹션(Evidence만 인용) → 웹/인쇄/PDF 리포트
```

**15개 탭 전부 Mock 데이터로 동작합니다** (Phase 1~4 전체). "동작한다"는 것은 실제 화면에서
숫자·표·차트가 나오고 각 숫자에 출처·기간·N·근거보기가 붙는다는 뜻이며, **그 숫자 자체는
실제 공공데이터가 아니라 결정론적으로 생성된 [MOCK] 데이터**입니다 (아래 표 참고).

| 탭/기능 | 상태 |
|---|---|
| 물건 등록 (직접입력) | ✅ 동작 |
| 물건 등록 (캡처/텍스트/PDF/URL) | ❌ 미구현 — 등록 화면에 "Phase 2+ 예정"으로 명시 |
| 지오코딩 | ⚠️ **Mock만** 구현 (결정론적 가짜 좌표, VWorld/Kakao/Naver 미연동) |
| ② 지도 | ⚠️ 실제 지도 타일 대신 좌표 기반 SVG 산점도 (MapProvider 미연동) |
| ③ 유사사례 (실거래+경매) | ✅ Comparable Engine 동작 (물건종류별 가중치, 단계적 반경 확대, 유사도 등급/완화, 이상치 표시) + 경매물건일 때 낙찰사례 표 |
| ④ 실거래·가격 | ⚠️ **아파트만 live 연동 가능** (국토교통부 실거래가 상세 API), 그 외 물건종류/기본값은 Mock — 아래 "국토교통부 실거래가 live 연동" 참고 |
| ⑤ 임대시장 | ✅ Mock, 실제계약/호가 구분 |
| ⑥ 배후주거 | ✅ Mock, 세대수 미확인 단지도 숨기지 않고 표시 |
| ⑦ 인구·세대 | ✅ Mock (연령대 구성, 5년 추세) |
| ⑧ 직장·사업체·구매력 | ✅ Mock (산업구성 + 구매력 추정지수 [추정]) |
| ⑨ 상권·유동인구 | ✅ Mock (업종별 점포수 [공식], 유동인구 추정지수 [Proxy]) |
| ⑩ 교통·생활인프라 | ✅ Mock (직선거리 기반 지하철/버스/POI) |
| ⑪ 개발계획 | ✅ Mock, [공식계획]/[언론보도] 구분, 실제 사업명 아님을 강하게 명시 |
| ⑫ 공급·공실·경쟁 | ✅ Mock (공실위험은 항상 [Proxy], 경쟁분석은 상권 데이터 재사용한 간이 버전) |
| ⑬ 환경·토지·건물 | ✅ 건축물/토지 정보는 Mock, **환경·위험은 실제 데이터가 없어 전부 "확인필요"로 표시** (임의 위험도 생성 안 함) |
| ⑭ AI 입지리포트 | ✅ §49 23개 섹션 전체 구현, Evidence만 인용 (Mock AI Provider — 실제 LLM 미호출) |
| ⑮ 데이터 근거 | ✅ 모든 Evidence를 출처/기간/N/조회일/신뢰도/원자료로 drill-down |
| 신뢰도 점수 | ✅ 규칙 기반 엔진 (`src/lib/confidence/score.ts`), AI가 임의로 매기지 않음 |
| 웹/인쇄/PDF 리포트 | ✅ `/properties/[id]/report`에서 인쇄용 뷰 + 브라우저 "인쇄 → PDF로 저장" (별도 서버사이드 PDF 라이브러리는 미사용) |
| 손품 완료도(AnalysisSnapshot) | ✅ 탭별로 저장되나, 대시보드에 진행률 배지로 집계 표시하는 UI는 아직 없음 (데이터는 존재) |

**Mock 데이터는 항상 `[DEMO]`/`[MOCK]` 배지로 표시되며 실제 공공데이터처럼 보이지 않게
설계했습니다.**

## 국토교통부 실거래가 live 연동 (⚠️ 이 세션에서 미검증)

아파트 실거래 데이터는 공공데이터포털의 **"국토교통부_아파트 매매 실거래가 상세 자료"**
(서비스명 `RTMSDataSvcAptTradeDev`)를 호출하도록 구현했습니다
(`src/lib/providers/live/realTransactionMolit.ts`).

**중요: 이 코드는 실제로 호출/검증되지 않았습니다.** 이 저장소를 만든 Claude Code 세션은
샌드박스 네트워크 정책상 `data.go.kr` / `apis.data.go.kr`를 포함한 모든 한국 공공기관
도메인에 접속할 수 없어서, 공식 API 문서를 직접 열람하거나 실제 요청·응답을 확인하지
못한 채로 작성했습니다 (배포된 앱 자체는 이 제약과 무관하게 정상 동작해야 합니다).
구현은 수년간 커뮤니티에 안정적으로 알려진 스펙을 기반으로 했으나, 다음을 **반드시 직접
검증**해야 합니다:

1. 요청 URL/파라미터명(`LAWD_CD`, `DEAL_YMD`, `serviceKey`, `numOfRows`, `pageNo`)이
   현재도 유효한지
2. 응답 XML의 필드명(`거래금액`, `건축년도`, `년/월/일`, `아파트`, `전용면적`, `지번`,
   `법정동`, `층` 등)과 `resultCode` 성공값("00" 또는 "000")이 맞는지
3. 서비스키는 data.go.kr에서 발급되는 **"Decoding(디코딩)" 키**를 사용해야 함

**활성화 방법**: `.env.local`에 `PROVIDER_MODE=live`와 `DATA_GO_KR_API_KEY=<디코딩 키>`를
설정하면, **아파트 물건**에 한해 이 Provider가 사용됩니다. 그 외 물건종류는 아직 live
Provider가 없어 항상 Mock을 사용합니다.

**알려진 구조적 한계** (API 자체의 한계이지 구현 실수가 아닙니다):

- 이 API는 **좌표를 제공하지 않습니다.** 거래 건의 지도 위치/거리는 대상물건 좌표를
  그대로 재사용하고, "동일 법정동이면 0m, 아니면 800m"라는 근사(Proxy)로 거리를
  추정합니다 — 실제 미터 단위 거리가 아닙니다. Evidence의 `limitations`에 항상 이 사실을
  표시합니다.
- 지역은 **법정동코드(LAWD_CD)** 로 지정해야 하는데, `src/lib/reference/lawdCode.ts`의
  매핑 표가 서울 25개구와 수원·성남(광교 데모 지역)만 채워져 있습니다. 표에 없는 지역은
  임의로 추측하지 않고 조회 실패로 처리합니다 — **실사용 전 전국 표로 확장 필요**
  (공식 목록: 행정표준코드관리시스템, 이 세션에서 접근 불가했음).
- 월 단위 조회만 지원해 `monthsBack`만큼 매월 API를 반복 호출하며, 과도한 호출을 막기
  위해 최대 12개월로 제한합니다.
- 실거래 조회가 실패해도(키 없음/지역 미매핑/API 오류) 전체 분석이 중단되지 않고, 해당
  Evidence가 `[미확인]` 배지와 실패 사유를 담은 채로 표시되며 다른 탭은 정상 진행됩니다
  (Provider 격리 원칙, §58).

## 실행 방법

```bash
npm install
cp .env.example .env.local   # 필요 시 값 채우기 (기본값으로도 Mock 흐름은 동작)
npx prisma migrate deploy    # 최초 1회, SQLite 개발 DB 생성
npm run dev
```

브라우저에서 http://localhost:3000 접속 →

- **"+ 새 물건 등록"**: 주소 등을 직접 입력해 물건을 등록하고 분석을 시작합니다.
- **"[DEMO] 광교 물건 불러오기"**: 광교 아파트 가상 물건을 즉시 생성해 전체 흐름을 확인합니다
  (§65~66 MVP 데모 fixture).

```bash
npm run build   # 프로덕션 빌드 (Turbopack)
npm run lint    # ESLint (flat config)
npx tsc --noEmit  # 타입체크
```

## 환경변수

`.env.example` 참고. 현재 실제로 사용되는 것은 `DATABASE_URL`, `NEXT_PUBLIC_APP_NAME` 뿐이며,
나머지(`DATA_GO_KR_API_KEY`, `SGIS_API_KEY`, `VWORLD_API_KEY`, `KAKAO_MAP_KEY`,
`NAVER_MAP_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` 등)는 **아직 연동되지 않은
Provider를 위한 자리표시자**입니다. 실제 공식 API 문서(공공데이터포털, SGIS, VWorld 등)를
재확인한 뒤 `src/lib/providers/`의 해당 Provider를 `mode: "live"`로 구현하면 됩니다.

## 기술 구조

- Next.js 16 (App Router, TypeScript strict, Turbopack)
- Tailwind CSS 4 + 자체 제작 UI 프리미티브(`src/components/ui`, shadcn/ui 스타일을 CLI 없이
  직접 구현 — sandbox 환경의 네트워크 제약으로 shadcn CLI 대신 동일한 패턴을 손으로 작성)
- Prisma 7 ORM + `@prisma/adapter-better-sqlite3` (개발용 SQLite; `datasource` provider만
  바꾸면 PostgreSQL 등으로 전환 가능하도록 스키마를 설계)
- Recharts (거래가격 차트)
- Zod (입력 검증)

### Provider Architecture (§58)

`src/lib/providers/types.ts`의 공통 인터페이스(`DataProvider<Input, Output>`)를 따르며,
각 도메인은 `src/lib/analysis/domains/*.ts`에서 `Promise.allSettled`로 병렬 실행되어
하나가 실패해도 나머지 탭은 정상 표시됩니다 (§58 격리 원칙).

`src/lib/providers/mock/`에 구현된 Mock Provider 12종 (모두 `mode: "mock"`, 시드 기반
결정론적 데이터, Evidence에 `isMock: true` 부착):

`RealTransactionProvider · PopulationProvider · BusinessProvider ·
CommercialDistrictProvider · TransportProvider(+POI) · ApartmentComplexProvider(배후주거) ·
RentalProvider · AuctionComparableProvider · DevelopmentProvider · SupplyVacancyProvider ·
LandBuildingProvider · MockGeocodeAdapter`

**live 모드(실제 공식 API) Provider는 `src/lib/providers/live/realTransactionMolit.ts`
(국토교통부 아파트 실거래, `PROVIDER_MODE=live` + `DATA_GO_KR_API_KEY` 필요) 1종만
구현되어 있고, 이마저도 이 세션의 네트워크 제약으로 실제 호출 검증은 못 했습니다**
(자세한 내용은 위 "국토교통부 실거래가 live 연동" 섹션 참고). 나머지 11종은 아직
Mock만 존재합니다. `src/lib/providers/stubs.ts`의 `NotConnectedProvider`가 향후 다른
live Provider의 공통 fallback(키 미설정 시 "데이터 연결 안 됨")으로 재사용될 예정입니다.

### Comparable Engine (§13~30)

`src/lib/comparable/` — 물건종류별 가중치 프로파일(`weights.ts`, 아파트 가중치는 §15 스펙을
그대로 반영), 유사도 채점(`score.ts`), 단계적 반경 확대·유사도 컷오프 완화(`engine.ts`),
통계(평균/중앙값/가중중앙값/P25/P75, `stats.ts`), 이상치는 제거하지 않고 플래그만 표시.

### Evidence / 신뢰도

`src/lib/evidence/build.ts`가 모든 Provider/Comparable 결과를 `Evidence` + `RawDataRecord`로
저장하고, `src/lib/confidence/score.ts`의 규칙 기반 엔진이 신뢰도를 계산합니다(AI가 임의로
점수를 매기지 않음).

## 데이터 한계 (반드시 읽어주세요)

- **실거래/유사경매/임대/인구/사업체/상권/교통/개발계획/공급공실/토지건물 등 모든 실제
  공공데이터는 아직 연동되지 않았습니다.** 15개 탭이 전부 "동작"하지만, 화면에 보이는
  가격·통계·목록은 전부 `[MOCK]` 배지가 붙은 결정론적 가짜 데이터입니다.
- 실제 서비스 전환 시 `docs/DATA_MATRIX.md`에 정리된 각 공식 API를 **공식 문서에서
  재검증**한 뒤 연동해야 합니다 (서비스ID, 인증방식, 호출한도가 실제와 다를 수 있음을 문서에
  명시했습니다).
- 지도 탭은 실제 지도 타일이 아니라 좌표 기반 단순 산점도입니다.
- 개발계획(⑪) 항목은 실제 사업명을 전혀 사용하지 않는 완전한 예시이며, 반드시
  [공식계획]/[언론보도] 구분과 함께 "실제 정보 아님"을 표시합니다.
- 환경·위험(⑬) 항목은 실제 데이터가 없어 임의로 위험도를 만들지 않고 전부 "확인필요"로
  남겨둡니다 (§47 원칙을 가장 엄격하게 지킨 부분).
- 공실위험(⑫)은 항상 `[Proxy]`이며 실제 공실률 통계가 아닙니다.
- 상권(⑫)의 경쟁분석은 사용자가 업종을 선택하는 인터랙티브 필터(§39)가 아니라, ⑨ 상권 탭의
  업종별 점포수를 그대로 재사용한 간이 표시입니다.
- AI 리포트는 외부 LLM을 호출하지 않고, 저장된 Evidence 문구만 조합합니다. 실제 LLM 연동 시
  "AI가 Evidence 밖의 숫자를 생성하지 않는다"는 원칙을 유지한 채 프롬프트를 설계해야 합니다.
- PDF는 서버사이드 생성 라이브러리 없이 브라우저 인쇄(Ctrl/Cmd+P → PDF로 저장)로 구현했습니다.
- 손품 완료도는 탭별로 DB(`AnalysisSnapshot`)에 저장되지만, 전체 진행률을 하나의 배지로
  보여주는 "온라인 조사 완료도" 집계 UI는 아직 없습니다.

## 디렉터리 구조 (핵심)

```
src/
  app/
    page.tsx                 홈 (물건 목록 + 데모 버튼)
    properties/new/          물건 등록
    properties/[id]/         메인 Dashboard (15개 탭)
    properties/[id]/report/  웹/인쇄/PDF AI 입지 리포트 (§61)
    api/properties/          물건 CRUD
    api/analysis/[propertyId]/  분석 오케스트레이션 (모든 도메인 Provider + Comparable Engine + AI)
    api/demo/                광교 데모 fixture 생성
  components/
    ui/                      Card/Badge/Button/Tabs (shadcn 스타일, 자체 구현)
    dashboard/               탭별 컴포넌트 15종 (Evidence 카드, 지도, 유사사례, 인구, 사업체,
                              상권, 교통, 배후주거, 임대, 개발계획, 공급공실, 토지건물, AI 리포트 등)
  lib/
    enums.ts                 PropertyType/EvidenceType 등 (SQLite는 enum 미지원 → 문자열+유니온)
    db.ts                    Prisma 싱글턴 (better-sqlite3 adapter)
    geocode/                 지오코딩 Adapter (Mock만 구현)
    providers/mock/          Mock Provider 12종
    providers/stubs.ts       live Provider용 공통 NotConnectedProvider fallback
    comparable/              Comparable Engine
    evidence/                Evidence 생성/저장
    confidence/              신뢰도 규칙 엔진
    analysis/domains/        도메인별 오케스트레이션 (Provider 실패 격리 단위)
    analysis/runAnalysis.ts  분석 파이프라인 전체 오케스트레이션 + AI 리포트 23섹션 생성
prisma/schema.prisma          DB 스키마 (Property/Evidence/RawDataRecord/ComparableCase/…)
docs/ARCHITECTURE.md          제품/기술 아키텍처
docs/DATA_MATRIX.md           데이터 확보 가능성 Matrix
```
