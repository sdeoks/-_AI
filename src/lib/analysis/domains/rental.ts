import { prisma } from "@/lib/db";
import { mockRentalProvider } from "@/lib/providers/mock/rental";
import { createEvidence } from "@/lib/evidence/build";
import { defaultAnalysisMonths } from "../periods";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runRentalDomain(ctx: DomainContext): Promise<DomainResult> {
  const radiusMeters = 500;
  const monthsBack = defaultAnalysisMonths(ctx.propertyType);

  const result = await mockRentalProvider.fetch({
    propertyType: ctx.propertyType,
    radiusMeters,
    monthsBack,
    targetExclusiveArea: ctx.property.exclusiveArea ?? undefined,
    targetFloor: ctx.property.floor,
    seed: ctx.seed,
  });
  if (!result.ok || !result.data) {
    return unavailableResult("RENTAL", result.error?.message ?? "unknown");
  }
  const { listings } = result.data;

  const monthlyListings = listings.filter((l) => l.monthlyRent > 0);
  const actualCount = listings.filter((l) => l.isActualContract).length;
  const sameFloorCount =
    ctx.property.floor != null
      ? listings.filter((l) => l.floor === ctx.property.floor).length
      : 0;

  const medianMonthlyRent = median(monthlyListings.map((l) => l.monthlyRent));

  const evidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "RENTAL_EXPECTED_MONTHLY",
    metricLabel: "예상 월세",
    metricValue: String(medianMonthlyRent),
    metricUnit: "원",
    input: {
      ...result.evidence!,
      filterDescription: `실제계약 ${actualCount}건 · 호가 ${listings.length - actualCount}건 · 동일층 ${sameFloorCount}건`,
      calculationMethod: "월세 매물 중앙값 (보증금/전세 매물 제외)",
    },
    rawRecords: listings.map((l) => ({
      label: `${l.listingDate} · ${l.distanceMeters}m · ${l.exclusiveArea}㎡ · ${l.floor}층 · 보증금 ${l.deposit.toLocaleString()}원/월세 ${l.monthlyRent.toLocaleString()}원 · ${l.isActualContract ? "실제계약" : "호가"}`,
      payload: l,
    })),
  });

  await prisma.comparableCase.createMany({
    data: listings.map((l) => ({
      propertyId: ctx.propertyId,
      caseType: "RENTAL",
      distanceMeters: l.distanceMeters,
      floor: l.floor,
      exclusiveArea: l.exclusiveArea,
      transactionDate: new Date(l.listingDate),
      deposit: l.deposit,
      monthlyRent: l.monthlyRent,
      managementFee: l.managementFee,
      isActualContract: l.isActualContract,
      similarityScore: 70,
      similarityReasons: JSON.stringify([`거리 ${l.distanceMeters}m`, `${l.exclusiveArea}㎡`]),
      similarityGrade: "COMPARABLE",
      dataSourceType: l.isActualContract ? "OFFICIAL" : "USER_UPLOAD",
    })),
  });

  return {
    tabKey: "RENTAL",
    status: "OK",
    completionRate: monthlyListings.length >= 6 ? 100 : 60,
    evidenceIds: [evidence.id],
    headlineEvidenceId: evidence.id,
    summary: {
      radiusMeters,
      listings,
      medianMonthlyRent,
      actualCount,
      hoGaCount: listings.length - actualCount,
    },
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}
