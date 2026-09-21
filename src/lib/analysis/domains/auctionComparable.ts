import { prisma } from "@/lib/db";
import { mockAuctionComparableProvider } from "@/lib/providers/mock/auctionComparable";
import { createEvidence } from "@/lib/evidence/build";
import { defaultAnalysisMonths } from "../periods";
import { scoreToSimilarityGrade } from "@/lib/enums";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runAuctionComparableDomain(
  ctx: DomainContext,
): Promise<DomainResult> {
  if (!ctx.property.isAuction) {
    return {
      tabKey: "COMPARABLE",
      status: "UNAVAILABLE",
      completionRate: 0,
      evidenceIds: [],
      summary: { skipped: "일반 매매물건은 경매 낙찰사례 분석 대상이 아닙니다." },
    };
  }

  const radiusMeters = 2000;
  const monthsBack = defaultAnalysisMonths(ctx.propertyType);

  const result = await mockAuctionComparableProvider.fetch({
    propertyType: ctx.propertyType,
    radiusMeters,
    monthsBack,
    targetExclusiveArea: ctx.property.exclusiveArea ?? undefined,
    seed: ctx.seed,
  });
  if (!result.ok || !result.data) {
    return unavailableResult("COMPARABLE", result.error?.message ?? "unknown");
  }
  const { cases } = result.data;

  const ratios = cases.map((c) => c.winningBidRatio).sort((a, b) => a - b);
  const medianRatio = ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)] : 0;

  const evidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "AUCTION_WINNING_RATIO",
    metricLabel: "유사 경매 낙찰가율 중앙값",
    metricValue: String(Math.round(medianRatio * 1000) / 10),
    metricUnit: "%",
    input: result.evidence!,
    rawRecords: cases.map((c) => ({
      label: `${c.caseNumber}(${c.court}) · ${c.saleDate} · 낙찰가율 ${(c.winningBidRatio * 100).toFixed(1)}% · 유찰 ${c.failedBidCount}회 · 입찰 ${c.bidderCount}명`,
      payload: c,
    })),
  });

  const targetArea = ctx.property.exclusiveArea ?? 84;
  await prisma.comparableCase.createMany({
    data: cases.map((c) => {
      const areaDiff = Math.abs(c.exclusiveArea - targetArea) / targetArea;
      const distanceScore = Math.max(0, 1 - c.distanceMeters / radiusMeters);
      const areaScore = Math.max(0, 1 - areaDiff);
      const score = Math.round((distanceScore * 0.5 + areaScore * 0.5) * 100);
      return {
        propertyId: ctx.propertyId,
        caseType: "AUCTION",
        address: c.address,
        distanceMeters: c.distanceMeters,
        floor: c.floor,
        exclusiveArea: c.exclusiveArea,
        transactionDate: new Date(c.saleDate),
        priceAmount: c.winningBidPrice,
        pricePerArea: c.pricePerAreaWinning,
        caseNumber: c.caseNumber,
        court: c.court,
        minimumSalePrice: c.minimumSalePrice,
        failedBidCount: c.failedBidCount,
        bidderCount: c.bidderCount,
        winningBidRatio: c.winningBidRatio,
        similarityScore: score,
        similarityReasons: JSON.stringify([
          `거리 ${c.distanceMeters}m`,
          `면적 ${c.exclusiveArea}㎡`,
        ]),
        similarityGrade: scoreToSimilarityGrade(score),
        dataSourceType: "OFFICIAL",
      };
    }),
  });

  return {
    tabKey: "COMPARABLE",
    status: "OK",
    completionRate: 100,
    evidenceIds: [evidence.id],
    headlineEvidenceId: evidence.id,
    summary: { radiusMeters, cases, medianRatio },
  };
}
