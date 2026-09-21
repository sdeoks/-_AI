import type { PropertyType } from "@/lib/enums";

// 유사도 채점 요소 (물건종류별로 다름, §15~20)
export interface SimilarityFactors {
  sameComplexOrBuilding: number;
  areaCloseness: number;
  recency: number;
  floorCloseness: number;
  builtYearCloseness: number;
  distance: number;
  livingSphere: number;
  transport: number;
}

export type WeightProfile = Partial<Record<keyof SimilarityFactors, number>>;

// 각 프로파일 가중치 합은 100.
const APARTMENT_WEIGHTS: WeightProfile = {
  sameComplexOrBuilding: 25,
  areaCloseness: 20,
  recency: 15,
  floorCloseness: 10,
  builtYearCloseness: 10,
  distance: 10,
  livingSphere: 5,
  transport: 5,
};

const ROW_MULTIPLEX_WEIGHTS: WeightProfile = {
  distance: 20,
  areaCloseness: 20,
  builtYearCloseness: 15, // 대지지분 근사치로 준공연도+면적을 함께 사용
  floorCloseness: 10,
  recency: 15,
  transport: 5,
  livingSphere: 5,
  sameComplexOrBuilding: 10,
};

const DETACHED_MULTIHOUSEHOLD_WEIGHTS: WeightProfile = {
  areaCloseness: 20, // 대지면적/연면적 근사
  builtYearCloseness: 20,
  distance: 20,
  recency: 20,
  sameComplexOrBuilding: 10,
  livingSphere: 10,
};

const RETAIL_WEIGHTS: WeightProfile = {
  sameComplexOrBuilding: 20,
  distance: 15,
  floorCloseness: 15,
  areaCloseness: 15,
  livingSphere: 10,
  recency: 10,
  transport: 5,
  builtYearCloseness: 5,
};

const OFFICETEL_WEIGHTS: WeightProfile = {
  sameComplexOrBuilding: 20,
  areaCloseness: 20,
  builtYearCloseness: 15,
  floorCloseness: 15,
  transport: 10,
  recency: 15,
  livingSphere: 5,
};

const LAND_WEIGHTS: WeightProfile = {
  distance: 25,
  areaCloseness: 20,
  livingSphere: 15, // 용도지역 근사 Proxy
  recency: 20,
  sameComplexOrBuilding: 0,
  builtYearCloseness: 0,
  floorCloseness: 0,
  transport: 20,
};

const GENERIC_WEIGHTS: WeightProfile = {
  distance: 25,
  areaCloseness: 25,
  recency: 20,
  floorCloseness: 10,
  builtYearCloseness: 10,
  sameComplexOrBuilding: 10,
};

export function getWeightProfile(propertyType: PropertyType): WeightProfile {
  switch (propertyType) {
    case "apartment":
      return APARTMENT_WEIGHTS;
    case "row_house":
    case "multiplex_house":
      return ROW_MULTIPLEX_WEIGHTS;
    case "detached_house":
    case "multi_household_house":
      return DETACHED_MULTIHOUSEHOLD_WEIGHTS;
    case "retail":
    case "sectional_retail":
    case "neighborhood_facility":
    case "commercial_building":
      return RETAIL_WEIGHTS;
    case "officetel":
    case "office":
      return OFFICETEL_WEIGHTS;
    case "land":
      return LAND_WEIGHTS;
    default:
      return GENERIC_WEIGHTS;
  }
}

export const RADIUS_STAGES_METERS = [300, 500, 1000, 2000, 5000];
export const DEFAULT_SIMILARITY_CUTOFF = 70;
export const RELAXED_SIMILARITY_CUTOFF = 60;
export const MIN_SAMPLE_FOR_STAGE_STOP = 6;
