import type { PropertyType } from "@/lib/enums";
import type { RawTransactionRecord } from "@/lib/providers/mock/realTransaction";
import { getWeightProfile, type SimilarityFactors } from "./weights";

export interface ScoreTarget {
  propertyType: PropertyType;
  exclusiveArea?: number | null;
  floor?: number | null;
  builtYear?: number | null;
  complexName?: string | null;
}

export interface ScoredCandidate {
  record: RawTransactionRecord;
  score: number;
  reasons: string[];
}

function closeness(diffRatio: number): number {
  // diffRatio 0 -> 100점, diffRatio >= 1 -> 0점 (선형 감쇠)
  return Math.max(0, Math.round((1 - Math.min(1, diffRatio)) * 100));
}

export function scoreCandidate(
  target: ScoreTarget,
  record: RawTransactionRecord,
  radiusMeters: number,
): ScoredCandidate {
  const weights = getWeightProfile(target.propertyType);
  const reasons: string[] = [];
  const factorScores: Partial<Record<keyof SimilarityFactors, number>> = {};

  // 동일단지/동일건물
  if (weights.sameComplexOrBuilding) {
    const same =
      !!target.complexName &&
      !!record.complexName &&
      target.complexName === record.complexName;
    factorScores.sameComplexOrBuilding = same ? 100 : 30;
    if (same) reasons.push(`동일 단지/건물 (${record.complexName})`);
  }

  // 면적 유사도
  if (weights.areaCloseness && target.exclusiveArea) {
    const diffRatio =
      Math.abs(record.exclusiveArea - target.exclusiveArea) / target.exclusiveArea;
    factorScores.areaCloseness = closeness(diffRatio);
    if (diffRatio < 0.05) reasons.push(`동일/유사 전용면적 (${record.exclusiveArea}㎡)`);
  }

  // 거래 최근성 (24개월 기준 감쇠)
  if (weights.recency) {
    const months = monthsSince(record.transactionDate);
    factorScores.recency = closeness(months / 24);
    if (months <= 3) reasons.push(`최근 ${months}개월 이내 거래`);
  }

  // 층 유사도
  if (weights.floorCloseness && target.floor != null && record.floor != null) {
    const diff = Math.abs(record.floor - target.floor);
    factorScores.floorCloseness = closeness(diff / 15);
    if (diff <= 2) reasons.push(`유사 층 (${record.floor}층, 차이 ${diff}층)`);
  }

  // 준공연도 유사도
  if (weights.builtYearCloseness && target.builtYear && record.builtYear) {
    const diff = Math.abs(record.builtYear - target.builtYear);
    factorScores.builtYearCloseness = closeness(diff / 20);
    if (diff <= 2) reasons.push(`준공연도 유사 (${record.builtYear}년)`);
  }

  // 거리
  if (weights.distance) {
    factorScores.distance = closeness(record.distanceMeters / radiusMeters);
    if (record.distanceMeters <= 300) reasons.push(`거리 ${record.distanceMeters}m 이내`);
  }

  // 생활권/교통 — Proxy: 거리 기반 근사치 (실제 생활권/역세권 데이터 미연결)
  if (weights.livingSphere) {
    factorScores.livingSphere = closeness(record.distanceMeters / (radiusMeters * 1.5));
  }
  if (weights.transport) {
    factorScores.transport = closeness(record.distanceMeters / (radiusMeters * 2));
  }

  let weightedSum = 0;
  let weightTotal = 0;
  for (const key of Object.keys(weights) as (keyof SimilarityFactors)[]) {
    const w = weights[key] ?? 0;
    if (w <= 0) continue;
    const s = factorScores[key];
    if (s == null) continue;
    weightedSum += w * s;
    weightTotal += w;
  }
  const score = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  if (reasons.length === 0) {
    reasons.push(`거리 ${record.distanceMeters}m, 면적 ${record.exclusiveArea}㎡`);
  }

  return { record, score, reasons };
}

function monthsSince(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth()),
  );
}
