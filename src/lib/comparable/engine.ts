import type { RawTransactionRecord } from "@/lib/providers/mock/realTransaction";
import { scoreToSimilarityGrade } from "@/lib/enums";
import { scoreCandidate, type ScoreTarget, type ScoredCandidate } from "./score";
import { computePriceStats, flagOutliers, type PriceStats } from "./stats";
import {
  RADIUS_STAGES_METERS,
  DEFAULT_SIMILARITY_CUTOFF,
  RELAXED_SIMILARITY_CUTOFF,
  MIN_SAMPLE_FOR_STAGE_STOP,
} from "./weights";

export interface ComparableEngineInput {
  target: ScoreTarget;
  records: RawTransactionRecord[];
  maxRadiusMeters: number;
}

export interface ComparableCandidateResult extends ScoredCandidate {
  pricePerArea: number;
  isOutlierCandidate: boolean;
  grade: ReturnType<typeof scoreToSimilarityGrade>;
}

export interface ComparableEngineResult {
  rawSampleCount: number;
  stageUsedMeters: number;
  cutoffUsed: number;
  cutoffRelaxed: boolean;
  candidates: ComparableCandidateResult[];
  excludedSampleCount: number;
  usedSampleCount: number;
  statsIncludingOutliers: PriceStats;
  statsExcludingOutliers: PriceStats;
}

export function runComparableEngine(
  input: ComparableEngineInput,
): ComparableEngineResult {
  const stages = RADIUS_STAGES_METERS.filter((r) => r <= input.maxRadiusMeters);
  if (stages[stages.length - 1] !== input.maxRadiusMeters) {
    stages.push(input.maxRadiusMeters);
  }

  let stageUsed = stages[stages.length - 1];
  let scoredAtStage: ScoredCandidate[] = [];

  for (const stage of stages) {
    const withinStage = input.records.filter((r) => r.distanceMeters <= stage);
    scoredAtStage = withinStage.map((r) =>
      scoreCandidate(input.target, r, stage),
    );
    const passing = scoredAtStage.filter(
      (c) => c.score >= DEFAULT_SIMILARITY_CUTOFF,
    );
    stageUsed = stage;
    if (passing.length >= MIN_SAMPLE_FOR_STAGE_STOP) break;
  }

  let cutoffUsed = DEFAULT_SIMILARITY_CUTOFF;
  let cutoffRelaxed = false;
  let passing = scoredAtStage.filter((c) => c.score >= cutoffUsed);

  if (passing.length < MIN_SAMPLE_FOR_STAGE_STOP) {
    const relaxedPassing = scoredAtStage.filter(
      (c) => c.score >= RELAXED_SIMILARITY_CUTOFF,
    );
    if (relaxedPassing.length > passing.length) {
      cutoffUsed = RELAXED_SIMILARITY_CUTOFF;
      cutoffRelaxed = true;
      passing = relaxedPassing;
    }
  }

  passing.sort((a, b) => b.score - a.score);

  const pricePerAreaList = passing.map(
    (c) => c.record.priceAmount / c.record.exclusiveArea,
  );
  const outlierFlags = flagOutliers(pricePerAreaList);

  const candidates: ComparableCandidateResult[] = passing.map((c, i) => ({
    ...c,
    pricePerArea: Math.round(pricePerAreaList[i]),
    isOutlierCandidate: outlierFlags[i],
    grade: scoreToSimilarityGrade(c.score),
  }));

  const allValues = candidates.map((c) => ({
    value: c.record.priceAmount,
    weight: c.score,
  }));
  const nonOutlierValues = candidates
    .filter((c) => !c.isOutlierCandidate)
    .map((c) => ({ value: c.record.priceAmount, weight: c.score }));

  return {
    rawSampleCount: input.records.length,
    stageUsedMeters: stageUsed,
    cutoffUsed,
    cutoffRelaxed,
    candidates,
    excludedSampleCount: input.records.length - candidates.length,
    usedSampleCount: candidates.length,
    statsIncludingOutliers: computePriceStats(allValues),
    statsExcludingOutliers: computePriceStats(nonOutlierValues),
  };
}
