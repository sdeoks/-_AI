import type { EvidenceType } from "@/lib/enums";

export interface ConfidenceInput {
  evidenceType: EvidenceType;
  asOfDate?: Date | null;
  dataPeriodEnd?: Date | null;
  usedSampleCount?: number | null;
  avgSimilarity?: number | null; // 0~100
  isMock: boolean;
  geographicUnitBroad?: boolean;
}

export interface ConfidenceResult {
  score: number;
  reason: string;
}

// 규칙 기반 신뢰도 산정 (§53). AI가 임의로 점수를 매기지 않고,
// 아래 가산/감산 규칙만으로 결정한다. 가중치는 향후 설정으로 분리 가능하게
// 상수로 관리한다.
const RULES = {
  base: 50,
  officialBonus: 20,
  recentDataBonus: 15,
  recentDataMonths: 12,
  sampleBonusHigh: 10, // N >= 16
  sampleBonusMid: 5, // N 6~15
  samplePenaltyLow: -15, // N 0~2
  similarityBonus: 10, // 평균 유사도 >= 85
  estimatedOrProxyPenalty: -15,
  mockPenalty: -10,
  broadGeoPenalty: -10,
};

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  let score = RULES.base;
  const reasons: string[] = [];

  if (
    input.evidenceType === "OFFICIAL" ||
    input.evidenceType === "REAL_TRANSACTION" ||
    input.evidenceType === "PUBLIC_STATISTICS"
  ) {
    score += RULES.officialBonus;
    reasons.push(`공식원자료(+${RULES.officialBonus})`);
  }

  const referenceDate = input.asOfDate ?? input.dataPeriodEnd;
  if (referenceDate) {
    const months =
      (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (months <= RULES.recentDataMonths) {
      score += RULES.recentDataBonus;
      reasons.push(`최근자료(+${RULES.recentDataBonus})`);
    } else {
      reasons.push(`자료 오래됨(기준일로부터 ${Math.round(months)}개월)`);
    }
  }

  const n = input.usedSampleCount ?? 0;
  if (n >= 16) {
    score += RULES.sampleBonusHigh;
    reasons.push(`N 충분(+${RULES.sampleBonusHigh})`);
  } else if (n >= 6) {
    score += RULES.sampleBonusMid;
    reasons.push(`N 참고가능(+${RULES.sampleBonusMid})`);
  } else if (n <= 2) {
    score += RULES.samplePenaltyLow;
    reasons.push(`표본 부족(${RULES.samplePenaltyLow})`);
  }

  if (input.avgSimilarity != null && input.avgSimilarity >= 85) {
    score += RULES.similarityBonus;
    reasons.push(`평균유사도 높음(+${RULES.similarityBonus})`);
  }

  if (input.evidenceType === "ESTIMATED" || input.evidenceType === "PROXY") {
    score += RULES.estimatedOrProxyPenalty;
    reasons.push(`추정/Proxy 사용(${RULES.estimatedOrProxyPenalty})`);
  }
  if (input.evidenceType === "UNVERIFIED") {
    score = Math.min(score, 20);
    reasons.push("신뢰할 만한 자료 미확보");
  }

  if (input.geographicUnitBroad) {
    score += RULES.broadGeoPenalty;
    reasons.push(`넓은 지역단위(${RULES.broadGeoPenalty})`);
  }

  if (input.isMock) {
    score += RULES.mockPenalty;
    reasons.push(
      `[MOCK] 데이터 — 실제 공식 API 연동 전 임시 생성 데이터(${RULES.mockPenalty})`,
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, reason: reasons.join(" · ") };
}
