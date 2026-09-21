// SQLite는 enum을 지원하지 않으므로, 모든 "enum 성격" 값은 DB에는 String으로 저장하고
// 애플리케이션 레벨에서는 이 파일의 유니온 타입 + 상수 배열로 검증한다.

export const PROPERTY_TYPES = [
  "apartment",
  "officetel",
  "row_house", // 연립주택
  "multiplex_house", // 다세대주택
  "detached_house", // 단독주택
  "multi_household_house", // 다가구주택
  "retail", // 상가
  "sectional_retail", // 집합상가
  "neighborhood_facility", // 근린생활시설
  "commercial_building", // 상가건물
  "office", // 업무시설
  "land", // 토지
  "other",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "아파트",
  officetel: "오피스텔",
  row_house: "연립주택",
  multiplex_house: "다세대주택",
  detached_house: "단독주택",
  multi_household_house: "다가구주택",
  retail: "상가",
  sectional_retail: "집합상가",
  neighborhood_facility: "근린생활시설",
  commercial_building: "상가건물",
  office: "업무시설",
  land: "토지",
  other: "기타",
};

export const EVIDENCE_TYPES = [
  "OFFICIAL",
  "REAL_TRANSACTION",
  "PUBLIC_STATISTICS",
  "PRIVATE",
  "USER_PROVIDED",
  "CALCULATED",
  "AI_ANALYSIS",
  "ESTIMATED",
  "PROXY",
  "UNVERIFIED",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_TYPE_BADGE: Record<EvidenceType, string> = {
  OFFICIAL: "공식",
  REAL_TRANSACTION: "실거래",
  PUBLIC_STATISTICS: "공공통계",
  PRIVATE: "민간",
  USER_PROVIDED: "사용자자료",
  CALCULATED: "계산",
  AI_ANALYSIS: "AI분석",
  ESTIMATED: "추정",
  PROXY: "Proxy",
  UNVERIFIED: "미확인",
};

export const SIMILARITY_GRADES = [
  "VERY_HIGH",
  "HIGH",
  "COMPARABLE",
  "AUXILIARY",
  "REFERENCE",
] as const;
export type SimilarityGrade = (typeof SIMILARITY_GRADES)[number];

export const SIMILARITY_GRADE_LABELS: Record<SimilarityGrade, string> = {
  VERY_HIGH: "매우 높은 유사성",
  HIGH: "높은 유사성",
  COMPARABLE: "비교 가능",
  AUXILIARY: "보조 참고",
  REFERENCE: "참고자료",
};

export function scoreToSimilarityGrade(score: number): SimilarityGrade {
  if (score >= 90) return "VERY_HIGH";
  if (score >= 80) return "HIGH";
  if (score >= 70) return "COMPARABLE";
  if (score >= 60) return "AUXILIARY";
  return "REFERENCE";
}

export const COMPARABLE_CASE_TYPES = [
  "REAL_TRANSACTION",
  "AUCTION",
  "RENTAL",
  "SAME_COMPLEX",
] as const;
export type ComparableCaseType = (typeof COMPARABLE_CASE_TYPES)[number];

export const DATA_SOURCE_TYPES = [
  "OFFICIAL",
  "CONNECTED_DATA",
  "USER_UPLOAD",
] as const;
export type DataSourceType = (typeof DATA_SOURCE_TYPES)[number];

// 메인 Dashboard 탭 (§12)
export const DASHBOARD_TABS = [
  { key: "SUMMARY", label: "① 종합" },
  { key: "MAP", label: "② 지도" },
  { key: "COMPARABLE", label: "③ 유사사례" },
  { key: "TRANSACTION", label: "④ 실거래·가격" },
  { key: "RENTAL", label: "⑤ 임대시장" },
  { key: "RESIDENTIAL_BACKUP", label: "⑥ 배후주거" },
  { key: "POPULATION", label: "⑦ 인구·세대" },
  { key: "BUSINESS", label: "⑧ 직장·사업체·구매력" },
  { key: "COMMERCIAL_DISTRICT", label: "⑨ 상권·유동인구" },
  { key: "TRANSPORT", label: "⑩ 교통·생활인프라" },
  { key: "DEVELOPMENT", label: "⑪ 개발계획" },
  { key: "SUPPLY_VACANCY", label: "⑫ 공급·공실·경쟁" },
  { key: "LAND_BUILDING", label: "⑬ 환경·토지·건물" },
  { key: "AI_REPORT", label: "⑭ AI 입지리포트" },
  { key: "EVIDENCE", label: "⑮ 데이터 근거" },
] as const;
export type DashboardTabKey = (typeof DASHBOARD_TABS)[number]["key"];

// Phase 구현 상태 — 정직하게 구분 (§72)
export const IMPLEMENTED_TABS: DashboardTabKey[] = [
  "SUMMARY",
  "MAP",
  "COMPARABLE",
  "TRANSACTION",
  "AI_REPORT",
  "EVIDENCE",
];

export const ANALYSIS_RADIUS_DEFAULTS_METERS: Record<string, number> = {
  livingConvenience: 500,
  residentialBackup: 1000,
  commercialDistrict: 500,
  comparableTransaction: 1000,
  comparableAuction: 2000,
  development: 5000,
};

export const N_WARNING_THRESHOLDS = {
  none: 0,
  veryLow: 2,
  low: 5,
  reference: 15,
} as const;

export function sampleSizeWarning(n: number): string {
  if (n <= 0) return "자료 없음";
  if (n <= N_WARNING_THRESHOLDS.veryLow) return "표본 매우 부족";
  if (n <= N_WARNING_THRESHOLDS.low) return "표본 적음";
  if (n <= N_WARNING_THRESHOLDS.reference) return "참고 가능";
  return "표본 상대적으로 충분";
}
