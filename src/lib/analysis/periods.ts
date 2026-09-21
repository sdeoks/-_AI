import type { PropertyType } from "@/lib/enums";

// 유사사례 분석기간 기본값 (§23)
export function defaultAnalysisMonths(type: PropertyType): number {
  switch (type) {
    case "apartment":
      return 12;
    case "officetel":
      return 24;
    case "row_house":
    case "multiplex_house":
    case "detached_house":
    case "multi_household_house":
      return 36;
    case "retail":
    case "sectional_retail":
    case "neighborhood_facility":
    case "commercial_building":
    case "office":
      return 36;
    case "land":
      return 48;
    default:
      return 24;
  }
}

// 유사사례 검색 최대 반경 기본값 (§10, §22)
export function defaultMaxRadiusMeters(type: PropertyType): number {
  switch (type) {
    case "apartment":
    case "officetel":
      return 1000;
    case "land":
      return 3000;
    default:
      return 2000;
  }
}
