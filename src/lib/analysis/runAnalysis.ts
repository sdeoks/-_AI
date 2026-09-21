import { prisma } from "@/lib/db";
import { mockRealTransactionProvider } from "@/lib/providers/mock/realTransaction";
import { runComparableEngine } from "@/lib/comparable/engine";
import { createEvidence } from "@/lib/evidence/build";
import { defaultAnalysisMonths, defaultMaxRadiusMeters } from "./periods";
import { sampleSizeWarning, type PropertyType, type DashboardTabKey } from "@/lib/enums";
import { formatWon } from "@/lib/utils";
import { runPopulationDomain } from "./domains/population";
import { runBusinessDomain } from "./domains/business";
import { runCommercialDistrictDomain } from "./domains/commercialDistrict";
import { runTransportDomain } from "./domains/transport";
import { runResidentialBackupDomain } from "./domains/residentialBackup";
import { runRentalDomain } from "./domains/rental";
import { runAuctionComparableDomain } from "./domains/auctionComparable";
import { runDevelopmentDomain } from "./domains/development";
import { runSupplyVacancyDomain } from "./domains/supplyVacancy";
import { runLandBuildingDomain } from "./domains/landBuilding";
import type { DomainContext, DomainResult } from "./domains/types";

export async function runAnalysisForProperty(propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new Error("PROPERTY_NOT_FOUND");
  if (property.lat == null || property.lng == null) {
    throw new Error("GEOCODE_MISSING");
  }

  const propertyType = property.propertyType as PropertyType;
  const monthsBack = defaultAnalysisMonths(propertyType);
  const maxRadius = defaultMaxRadiusMeters(propertyType);

  // 이전 분석 결과 초기화 (재분석 시 중복 방지)
  await prisma.$transaction([
    prisma.evidence.deleteMany({ where: { propertyId } }),
    prisma.comparableCase.deleteMany({ where: { propertyId } }),
    prisma.analysisSnapshot.deleteMany({ where: { propertyId } }),
    prisma.aIReport.deleteMany({ where: { propertyId } }),
  ]);

  // 1) Mock 실거래 Provider 호출 (Provider 격리: 실패해도 아래 catch에서 처리)
  const txResult = await mockRealTransactionProvider.fetch({
    lat: property.lat,
    lng: property.lng,
    propertyType,
    radiusMeters: maxRadius,
    monthsBack,
    targetExclusiveArea: property.exclusiveArea ?? undefined,
    seed: `${property.id}:${property.address}`,
  });

  if (!txResult.ok || !txResult.data) {
    await prisma.analysisSnapshot.create({
      data: {
        propertyId,
        tabKey: "TRANSACTION",
        completionRate: 0,
        status: "UNAVAILABLE",
        summaryJson: JSON.stringify({ error: txResult.error }),
      },
    });
    return { ok: false as const, error: txResult.error };
  }

  const records = txResult.data.records;

  // 가격 추세 참고용: 분석기간을 절반으로 나눠 전반기/후반기 ㎡당 단가 중앙값 비교
  // (§7, §31 — 별도 가격지수 없이 원자료로 계산한 [계산] 값)
  const priceTrend = computeSimpleTrend(records, monthsBack);

  // 2) 실거래 전체 통계 Evidence (탭 ④)
  const allPrices = records.map((r) => ({ value: r.priceAmount, weight: 1 }));
  const { computePriceStats } = await import("@/lib/comparable/stats");
  const overallStats = computePriceStats(allPrices);

  const transactionEvidence = await createEvidence({
    propertyId,
    analysisCategory: "REAL_TRANSACTION_OVERALL",
    metricLabel: `${propertyLabel(propertyType)} 실거래 중앙값`,
    metricValue: String(overallStats.median),
    metricUnit: "원",
    input: {
      ...txResult.evidence!,
      radiusMeters: maxRadius,
      usedSampleCount: records.length,
      rawSampleCount: records.length,
      filterDescription: `반경 ${maxRadius}m, 최근 ${monthsBack}개월`,
    },
    rawRecords: records.slice(0, 100).map((r) => ({
      label: `${r.transactionDate} · ${r.complexName ?? ""} ${r.exclusiveArea}㎡`,
      payload: r,
    })),
  });

  // 3) Comparable Engine 실행 (탭 ③)
  const engineResult = runComparableEngine({
    target: {
      propertyType,
      exclusiveArea: property.exclusiveArea,
      floor: property.floor,
      builtYear: property.builtYear,
      complexName: property.buildingName,
    },
    records,
    maxRadiusMeters: maxRadius,
  });

  const avgSimilarity =
    engineResult.candidates.length > 0
      ? Math.round(
          engineResult.candidates.reduce((a, c) => a + c.score, 0) /
            engineResult.candidates.length,
        )
      : undefined;

  const comparableEvidence = await createEvidence({
    propertyId,
    analysisCategory: "COMPARABLE_SUMMARY",
    metricLabel: "유사 실거래 기준가격 (유사도 가중 중앙값)",
    metricValue: String(engineResult.statsExcludingOutliers.weightedMedian),
    metricUnit: "원",
    avgSimilarity,
    input: {
      sourceOrganization: "국토교통부",
      sourceDataset: `${propertyLabel(propertyType)} 실거래가 자료 [MOCK]`,
      dataPeriodStart: monthsAgoDate(monthsBack),
      dataPeriodEnd: new Date(),
      geographicUnit: "반경",
      radiusMeters: engineResult.stageUsedMeters,
      rawSampleCount: engineResult.rawSampleCount,
      excludedSampleCount: engineResult.excludedSampleCount,
      usedSampleCount: engineResult.usedSampleCount,
      filterDescription: engineResult.cutoffRelaxed
        ? `유사사례 부족으로 기준을 70 → ${engineResult.cutoffUsed}로 완화함`
        : `유사도 ${engineResult.cutoffUsed} 이상`,
      calculationMethod: "유사도 가중 중앙값 (이상치 제외)",
      evidenceType: "REAL_TRANSACTION",
      limitations:
        "본 데이터는 실제 국토교통부 API가 아직 연결되지 않아 생성된 [MOCK] 데이터입니다.",
      isMock: true,
    },
    rawRecords: engineResult.candidates.map((c) => ({
      label: `${c.record.transactionDate} · ${c.record.complexName ?? ""} ${c.record.exclusiveArea}㎡ · 유사도 ${c.score}`,
      payload: { ...c.record, similarityScore: c.score, reasons: c.reasons },
      isOutlierCandidate: c.isOutlierCandidate,
    })),
  });

  // ComparableCase 테이블에 상위 사례 저장 (지도 핀, 유사사례 탭용)
  await prisma.comparableCase.createMany({
    data: engineResult.candidates.slice(0, 30).map((c) => ({
      propertyId,
      caseType: "REAL_TRANSACTION",
      address: c.record.address,
      buildingName: c.record.complexName,
      distanceMeters: c.record.distanceMeters,
      floor: c.record.floor,
      exclusiveArea: c.record.exclusiveArea,
      transactionDate: new Date(c.record.transactionDate),
      priceAmount: c.record.priceAmount,
      pricePerArea: c.pricePerArea,
      similarityScore: c.score,
      similarityReasons: JSON.stringify(c.reasons),
      similarityGrade: c.grade,
      dataSourceType: "OFFICIAL",
    })),
  });

  // 4) Phase 2 도메인 Provider 병렬 실행 — 하나가 실패해도 나머지는 계속 진행 (§58)
  const domainCtx: DomainContext = {
    propertyId,
    property,
    propertyType,
    seed: `${property.id}:${property.address}`,
  };

  const domainKeys = [
    "POPULATION",
    "BUSINESS",
    "COMMERCIAL_DISTRICT",
    "TRANSPORT",
    "RESIDENTIAL_BACKUP",
    "RENTAL",
    "DEVELOPMENT",
    "LAND_BUILDING",
  ] as const;
  const domainSettled = await Promise.allSettled([
    runPopulationDomain(domainCtx),
    runBusinessDomain(domainCtx),
    runCommercialDistrictDomain(domainCtx),
    runTransportDomain(domainCtx),
    runResidentialBackupDomain(domainCtx),
    runRentalDomain(domainCtx),
    runDevelopmentDomain(domainCtx),
    runLandBuildingDomain(domainCtx),
  ]);
  const domainResults: DomainResult[] = domainSettled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          tabKey: domainKeys[i],
          status: "UNAVAILABLE" as const,
          completionRate: 0,
          evidenceIds: [],
          summary: { error: String(r.reason) },
        },
  );

  // 공실위험 Proxy는 상권 도메인의 유동인구 지수를 참고하므로 위 배치 완료 후 실행
  const commercialForVacancy = domainResults.find((d) => d.tabKey === "COMMERCIAL_DISTRICT");
  const footfallProxyIndex =
    commercialForVacancy?.status === "OK"
      ? (commercialForVacancy.summary as { footfallProxyIndex: number }).footfallProxyIndex
      : undefined;
  const supplyVacancySettled = await Promise.allSettled([
    runSupplyVacancyDomain(domainCtx, footfallProxyIndex),
  ]);
  const supplyVacancyResult: DomainResult =
    supplyVacancySettled[0].status === "fulfilled"
      ? supplyVacancySettled[0].value
      : {
          tabKey: "SUPPLY_VACANCY",
          status: "UNAVAILABLE",
          completionRate: 0,
          evidenceIds: [],
          summary: { error: String(supplyVacancySettled[0].reason) },
        };
  domainResults.push(supplyVacancyResult);

  // 경매 낙찰사례는 ③ 유사사례 탭에 속하므로(§13) 별도 AnalysisSnapshot을 만들지 않고
  // Evidence/ComparableCase만 기존 COMPARABLE 스냅샷에 얹는다.
  const auctionResultSettled = await Promise.allSettled([
    runAuctionComparableDomain(domainCtx),
  ]);
  const auctionResult: DomainResult =
    auctionResultSettled[0].status === "fulfilled"
      ? auctionResultSettled[0].value
      : {
          tabKey: "COMPARABLE",
          status: "UNAVAILABLE",
          completionRate: 0,
          evidenceIds: [],
          summary: { error: String(auctionResultSettled[0].reason) },
        };

  await prisma.analysisSnapshot.createMany({
    data: domainResults.map((d) => ({
      propertyId,
      tabKey: d.tabKey,
      completionRate: d.completionRate,
      status: d.status,
      summaryJson: JSON.stringify(d.summary),
    })),
  });

  const domainByTab = Object.fromEntries(
    domainResults.map((d) => [d.tabKey, d]),
  ) as Partial<Record<DashboardTabKey, DomainResult>>;

  // 5) AI 입지 리포트 생성 (Mock AI Provider — Evidence만 인용, 새 숫자 생성 금지)
  const sections = buildAIReportSections({
    property,
    propertyType,
    overallStats,
    engineResult,
    transactionEvidenceId: transactionEvidence.id,
    comparableEvidenceId: comparableEvidence.id,
    domainByTab,
    auctionResult,
    isAuction: property.isAuction,
    priceTrend,
  });

  await prisma.aIReport.create({
    data: {
      propertyId,
      providerKey: "mock",
      sectionsJson: JSON.stringify(sections),
    },
  });

  // 6) 나머지 탭별 손품 완료도 스냅샷 (§55) — Phase 2 도메인은 위에서 이미 저장됨
  const snapshots = [
    { tabKey: "SUMMARY", completionRate: 100, status: "OK" },
    { tabKey: "MAP", completionRate: 100, status: "OK" },
    {
      tabKey: "COMPARABLE",
      completionRate: engineResult.usedSampleCount >= 6 ? 100 : 60,
      status: engineResult.usedSampleCount > 0 ? "OK" : "PARTIAL",
    },
    { tabKey: "TRANSACTION", completionRate: 100, status: "OK" },
    { tabKey: "AI_REPORT", completionRate: 100, status: "OK" },
    { tabKey: "EVIDENCE", completionRate: 100, status: "OK" },
  ] as const;

  await prisma.analysisSnapshot.createMany({
    data: snapshots.map((s) => ({
      propertyId,
      tabKey: s.tabKey,
      completionRate: s.completionRate,
      status: s.status,
      summaryJson: "{}",
    })),
  });

  return { ok: true as const };
}

function propertyLabel(type: PropertyType): string {
  switch (type) {
    case "apartment":
      return "아파트";
    case "officetel":
      return "오피스텔";
    default:
      return "부동산";
  }
}

function monthsAgoDate(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

interface PriceTrend {
  earlierMedianPerArea: number;
  recentMedianPerArea: number;
  changePct: number;
  earlierCount: number;
  recentCount: number;
}

function computeSimpleTrend(
  records: { transactionDate: string; priceAmount: number; exclusiveArea: number }[],
  monthsBack: number,
): PriceTrend | null {
  if (records.length < 6) return null;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack / 2);

  const earlier = records.filter((r) => new Date(r.transactionDate) < cutoff);
  const recent = records.filter((r) => new Date(r.transactionDate) >= cutoff);
  if (earlier.length < 2 || recent.length < 2) return null;

  const medianPerArea = (arr: typeof records) => {
    const sorted = [...arr].map((r) => r.priceAmount / r.exclusiveArea).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const earlierMedianPerArea = Math.round(medianPerArea(earlier));
  const recentMedianPerArea = Math.round(medianPerArea(recent));
  const changePct =
    earlierMedianPerArea > 0
      ? Math.round(((recentMedianPerArea - earlierMedianPerArea) / earlierMedianPerArea) * 1000) / 10
      : 0;

  return { earlierMedianPerArea, recentMedianPerArea, changePct, earlierCount: earlier.length, recentCount: recent.length };
}

interface AIParagraph {
  text: string;
  evidenceIds: string[];
}
interface AISection {
  key: string;
  title: string;
  status: "OK" | "NO_DATA";
  paragraphs: AIParagraph[];
}

function buildAIReportSections(args: {
  property: { name: string; address: string; propertyType: string };
  propertyType: PropertyType;
  overallStats: { median: number; count: number };
  engineResult: ReturnType<typeof runComparableEngine>;
  transactionEvidenceId: string;
  comparableEvidenceId: string;
  domainByTab: Partial<Record<DashboardTabKey, DomainResult>>;
  auctionResult: DomainResult;
  isAuction: boolean;
  priceTrend: PriceTrend | null;
}): AISection[] {
  const {
    property,
    engineResult,
    transactionEvidenceId,
    comparableEvidenceId,
    domainByTab,
    auctionResult,
    isAuction,
    priceTrend,
  } = args;
  const top5 = engineResult.candidates.slice(0, 5);
  const rental = domainByTab.RENTAL;
  const rentalSummary =
    rental?.status === "OK"
      ? (rental.summary as { medianMonthlyRent: number; actualCount: number; hoGaCount: number })
      : null;
  const auctionSummary =
    auctionResult.status === "OK"
      ? (auctionResult.summary as { cases: unknown[]; medianRatio: number })
      : null;

  const population = domainByTab.POPULATION;
  const business = domainByTab.BUSINESS;
  const commercial = domainByTab.COMMERCIAL_DISTRICT;
  const transport = domainByTab.TRANSPORT;
  const residential = domainByTab.RESIDENTIAL_BACKUP;

  const popSummary = population?.status === "OK" ? (population.summary as { totalPopulation: number; ageBrackets: { label: string; ratio: number }[] }) : null;
  const bizSummary = business?.status === "OK" ? (business.summary as { businessCount: number; employeeCount: number; purchasingPowerIndex: number }) : null;
  const commSummary = commercial?.status === "OK" ? (commercial.summary as { totalStoreCount: number; radiusMeters: number; footfallProxyIndex: number }) : null;
  const transportSummary = transport?.status === "OK" ? (transport.summary as { nearestSubway: { name: string; distanceMeters: number } | null; poiList: { category: string }[] }) : null;
  const residentialSummary = residential?.status === "OK" ? (residential.summary as { confirmedHouseholds: number; totalComplexes: number; unconfirmedComplexCount: number }) : null;
  const development = domainByTab.DEVELOPMENT;
  const supplyVacancy = domainByTab.SUPPLY_VACANCY;
  const devSummary = development?.status === "OK" ? (development.summary as { items: { sourceType: string }[] }) : null;
  const supplySummary = supplyVacancy?.status === "OK" ? (supplyVacancy.summary as { supplyItems: unknown[]; vacancyLevel: string; vacancyProxyFactors: string[] }) : null;

  const sections: AISection[] = [
    {
      key: "SUMMARY_ONE_LINE",
      title: "1. 대상물건 한줄요약",
      status: "OK",
      paragraphs: [
        {
          text: `${property.name} (${property.address})는 유사사례 ${engineResult.usedSampleCount}건(${sampleSizeWarning(engineResult.usedSampleCount)}) 기준 유사도 가중 중앙값 ${formatWon(engineResult.statsExcludingOutliers.weightedMedian)} 수준으로 분석됩니다.`,
          evidenceIds: [comparableEvidenceId],
        },
      ],
    },
    {
      key: "LOCATION_CHARACTERISTICS",
      title: "2. 입지 특성",
      status: residentialSummary || transportSummary || commSummary ? "OK" : "NO_DATA",
      paragraphs:
        residentialSummary || transportSummary || commSummary
          ? [
              {
                text: [
                  residentialSummary
                    ? `반경 내 공동주택 ${residentialSummary.totalComplexes}개 단지`
                    : null,
                  transportSummary?.nearestSubway
                    ? `${transportSummary.nearestSubway.name}까지 직선거리 약 ${transportSummary.nearestSubway.distanceMeters}m`
                    : null,
                  commSummary ? `반경 내 점포 ${commSummary.totalStoreCount}개` : null,
                ]
                  .filter(Boolean)
                  .join(", ") + "를 종합하면 해당 물건은 주거·상권 인프라가 일정 수준 형성된 입지로 판단됩니다.",
                evidenceIds: [
                  residential?.headlineEvidenceId,
                  transport?.headlineEvidenceId,
                  commercial?.evidenceIds?.[0],
                ].filter((id): id is string => !!id),
              },
            ]
          : [],
    },
    {
      key: "TOP5_COMPARABLE",
      title: "3. 가장 유사한 사례 TOP 5",
      status: top5.length > 0 ? "OK" : "NO_DATA",
      paragraphs: top5.map((c) => ({
        text: `유사도 ${c.score} · ${c.record.complexName ?? "-"} · ${c.record.exclusiveArea}㎡ · ${c.record.transactionDate} · ${formatWon(c.record.priceAmount)} — ${c.reasons.join(", ")}`,
        evidenceIds: [comparableEvidenceId],
      })),
    },
    {
      key: "COMPARABLE_TRANSACTION_ANALYSIS",
      title: "4. 유사 실거래 분석",
      status: "OK",
      paragraphs: [
        {
          text: engineResult.cutoffRelaxed
            ? `유사사례가 충분하지 않아 유사도 기준을 70 → ${engineResult.cutoffUsed}로 완화하여 총 ${engineResult.usedSampleCount}건을 사용했습니다. P25 ${formatWon(engineResult.statsExcludingOutliers.p25)} · 중앙값 ${formatWon(engineResult.statsExcludingOutliers.p50)} · P75 ${formatWon(engineResult.statsExcludingOutliers.p75)}.`
            : `유사도 ${engineResult.cutoffUsed} 이상 ${engineResult.usedSampleCount}건을 사용했습니다. P25 ${formatWon(engineResult.statsExcludingOutliers.p25)} · 중앙값 ${formatWon(engineResult.statsExcludingOutliers.p50)} · P75 ${formatWon(engineResult.statsExcludingOutliers.p75)}.`,
          evidenceIds: [comparableEvidenceId],
        },
      ],
    },
    {
      key: "AUCTION_ANALYSIS",
      title: "5. 유사 경매 분석",
      status: isAuction && auctionSummary ? "OK" : "NO_DATA",
      paragraphs:
        isAuction && auctionSummary
          ? [
              {
                text: `반경 내 유사 경매 낙찰사례 ${auctionSummary.cases.length}건의 낙찰가율 중앙값은 ${(auctionSummary.medianRatio * 100).toFixed(1)}%입니다.`,
                evidenceIds: auctionResult.headlineEvidenceId ? [auctionResult.headlineEvidenceId] : [],
              },
            ]
          : !isAuction
            ? [{ text: "일반 매매물건은 경매 낙찰사례 분석 대상이 아닙니다.", evidenceIds: [] }]
            : [],
    },
    {
      key: "RENTAL_ANALYSIS",
      title: "6. 임대시장 분석",
      status: rentalSummary ? "OK" : "NO_DATA",
      paragraphs: rentalSummary
        ? [
            {
              text: `예상 월세는 ${formatWon(rentalSummary.medianMonthlyRent)} 수준입니다 (실제계약 ${rentalSummary.actualCount}건, 호가 ${rentalSummary.hoGaCount}건 기준). ${rentalSummary.actualCount < 3 ? "실제계약 표본이 적어 호가 비중이 높은 추정치입니다." : ""}`,
              evidenceIds: rental?.headlineEvidenceId ? [rental.headlineEvidenceId] : [],
            },
          ]
        : [],
    },
    {
      key: "PRICE_TREND",
      title: "7. 가격 추세",
      status: priceTrend ? "OK" : "NO_DATA",
      paragraphs: priceTrend
        ? [
            {
              text: `분석기간을 전/후반으로 나누면 ㎡당 단가 중앙값이 ${formatWon(priceTrend.earlierMedianPerArea)}(전반기 N=${priceTrend.earlierCount}) → ${formatWon(priceTrend.recentMedianPerArea)}(후반기 N=${priceTrend.recentCount})로 ${priceTrend.changePct >= 0 ? "+" : ""}${priceTrend.changePct}% 변화했습니다. 공식 가격지수가 아닌 원자료 직접 계산값입니다.`,
              evidenceIds: [transactionEvidenceId],
            },
          ]
        : [
            {
              text: "표본이 부족해 신뢰할 수 있는 가격 추세를 계산하지 못했습니다.",
              evidenceIds: [],
            },
          ],
    },
    {
      key: "TRADING_VOLUME_LIQUIDITY",
      title: "8. 거래량과 환금성",
      status: "OK",
      paragraphs: [
        {
          text: `반경 내 원표본 ${engineResult.rawSampleCount}건 중 최종 유사사례 ${engineResult.usedSampleCount}건이 사용되었습니다. 표본 수만으로 유동성을 단정하기는 어려우며, 실제 환금성은 현장 확인이 필요합니다.`,
          evidenceIds: [transactionEvidenceId],
        },
      ],
    },
    {
      key: "RESIDENTIAL_BACKUP",
      title: "9. 배후주거",
      status: residentialSummary ? "OK" : "NO_DATA",
      paragraphs: residentialSummary
        ? [
            {
              text: `반경 내 공동주택 ${residentialSummary.totalComplexes}개 단지 중 확인세대수는 ${residentialSummary.confirmedHouseholds.toLocaleString()}세대이며, ${residentialSummary.unconfirmedComplexCount}개 단지는 세대수가 확인되지 않았습니다.`,
              evidenceIds: residential?.headlineEvidenceId ? [residential.headlineEvidenceId] : [],
            },
          ]
        : [],
    },
    {
      key: "POPULATION_HOUSEHOLDS",
      title: "10. 인구·가구",
      status: popSummary ? "OK" : "NO_DATA",
      paragraphs: popSummary
        ? [
            {
              text: `인근 행정동 인구는 ${popSummary.totalPopulation.toLocaleString()}명이며, 연령대 구성은 ${popSummary.ageBrackets.map((a) => `${a.label} ${(a.ratio * 100).toFixed(1)}%`).join(", ")} 입니다.`,
              evidenceIds: population?.headlineEvidenceId ? [population.headlineEvidenceId] : [],
            },
          ]
        : [],
    },
    {
      key: "BUSINESS_WORKPLACE",
      title: "11. 직장·사업체",
      status: bizSummary ? "OK" : "NO_DATA",
      paragraphs: bizSummary
        ? [
            {
              text: `인근 사업체 ${bizSummary.businessCount.toLocaleString()}개, 종사자 ${bizSummary.employeeCount.toLocaleString()}명이 확인됩니다.`,
              evidenceIds: business?.evidenceIds.slice(0, 1) ?? [],
            },
          ]
        : [],
    },
    {
      key: "PURCHASING_POWER",
      title: "12. 구매력",
      status: bizSummary ? "OK" : "NO_DATA",
      paragraphs: bizSummary
        ? [
            {
              text: `사업체·종사자 구성을 종합한 구매력 추정지수는 ${bizSummary.purchasingPowerIndex}/100입니다. 직접적인 임금 데이터가 아닌 산업구성 기반 추정치입니다.`,
              evidenceIds: business?.evidenceIds.slice(1, 2) ?? [],
            },
          ]
        : [],
    },
    {
      key: "COMMERCIAL_DISTRICT",
      title: "13. 상권",
      status: commSummary ? "OK" : "NO_DATA",
      paragraphs: commSummary
        ? [
            {
              text: `반경 ${commSummary.radiusMeters}m 내 점포수는 ${commSummary.totalStoreCount.toLocaleString()}개입니다.`,
              evidenceIds: commercial?.evidenceIds.slice(0, 1) ?? [],
            },
          ]
        : [],
    },
    {
      key: "FOOTFALL",
      title: "14. 유동",
      status: commSummary ? "OK" : "NO_DATA",
      paragraphs: commSummary
        ? [
            {
              text: `유동인구 추정지수는 ${(commercial!.summary as { footfallProxyIndex: number }).footfallProxyIndex}/100입니다. 실제 유동인구 계측 자료가 아닌 점포밀도 기반 Proxy입니다.`,
              evidenceIds: commercial?.evidenceIds.slice(1, 2) ?? [],
            },
          ]
        : [],
    },
    {
      key: "TRANSPORT",
      title: "15. 교통",
      status: transportSummary ? "OK" : "NO_DATA",
      paragraphs: transportSummary
        ? [
            {
              text: transportSummary.nearestSubway
                ? `가장 가까운 지하철역은 ${transportSummary.nearestSubway.name}으로 직선거리 약 ${transportSummary.nearestSubway.distanceMeters}m입니다.`
                : "반경 내 지하철역이 확인되지 않았습니다.",
              evidenceIds: transport?.headlineEvidenceId ? [transport.headlineEvidenceId] : [],
            },
          ]
        : [],
    },
    {
      key: "LIVING_INFRA",
      title: "16. 생활인프라",
      status: transportSummary ? "OK" : "NO_DATA",
      paragraphs: transportSummary
        ? [
            {
              text: `학교·병원·마트 등 생활인프라 POI ${transportSummary.poiList.length}건이 반경 내에서 확인됩니다 (직선거리 기반).`,
              evidenceIds: transport?.headlineEvidenceId ? [transport.headlineEvidenceId] : [],
            },
          ]
        : [],
    },
    {
      key: "DEVELOPMENT_PLAN",
      title: "17. 개발계획",
      status: devSummary ? "OK" : "NO_DATA",
      paragraphs: devSummary
        ? [
            {
              text: `반경 내 개발계획 관련 항목 ${devSummary.items.length}건이 확인됩니다 (공식계획 ${devSummary.items.filter((it) => it.sourceType === "OFFICIAL_PLAN").length}건, 언론보도 ${devSummary.items.filter((it) => it.sourceType === "NEWS").length}건). 이 항목들은 데모용 [MOCK] 예시이며 실제 확정 사업 정보가 아닙니다.`,
              evidenceIds: development?.headlineEvidenceId ? [development.headlineEvidenceId] : [],
            },
          ]
        : [],
    },
    {
      key: "SUPPLY_RISK",
      title: "18. 공급위험",
      status: supplySummary ? "OK" : "NO_DATA",
      paragraphs: supplySummary
        ? [
            {
              text: `반경 내 신규 공급 예정 ${supplySummary.supplyItems.length}건이 확인됩니다. 개발호재가 수요증가와 경쟁공급 증가를 동시에 의미할 수 있어 양면으로 검토가 필요합니다.`,
              evidenceIds: supplyVacancy?.headlineEvidenceId ? [supplyVacancy.headlineEvidenceId] : [],
            },
          ]
        : [],
    },
    {
      key: "VACANCY_RISK",
      title: "19. 공실위험",
      status: supplySummary ? "OK" : "NO_DATA",
      paragraphs: supplySummary
        ? [
            {
              text: `공실위험은 "${supplySummary.vacancyLevel}" 수준으로 추정됩니다. 실제 공실률 통계가 아닌 Proxy 기반 추정치입니다 (근거: ${supplySummary.vacancyProxyFactors.join(", ")}).`,
              evidenceIds: supplyVacancy?.headlineEvidenceId ? [supplyVacancy.headlineEvidenceId] : [],
            },
          ]
        : [],
    },
    {
      key: "STRENGTHS",
      title: "20. 대상물건의 강점",
      status: engineResult.usedSampleCount > 0 ? "OK" : "NO_DATA",
      paragraphs:
        engineResult.usedSampleCount > 0
          ? [
              {
                text: `유사사례 평균 유사도가 확보되어 있어 가격 비교의 근거가 상대적으로 명확합니다 (근거 보기 참고).`,
                evidenceIds: [comparableEvidenceId],
              },
            ]
          : [],
    },
    {
      key: "WEAKNESSES",
      title: "21. 약점",
      status: "OK",
      paragraphs: [
        {
          text: engineResult.cutoffRelaxed
            ? "동일 조건의 유사사례가 부족하여 유사도 기준을 완화했습니다. 가격 신뢰구간이 넓을 수 있습니다."
            : "현재 반경/기간 조건에서 유사사례가 확인되었으나, 인구·상권·교통 등 다른 입지 데이터는 아직 연동되지 않았습니다.",
          evidenceIds: [comparableEvidenceId],
        },
      ],
    },
    {
      key: "NOT_VERIFIED",
      title: "22. 데이터로 확인되지 않은 사항",
      status: "OK",
      paragraphs: [
        {
          text: "토지·건물 상세정보(건축물대장, 토지이용계획)와 환경·위험 정보는 이번 분석에서 공식 데이터 연동이 아직 구현되지 않아 다루지 않았습니다. 인구·사업체·상권·교통·배후주거·임대·경매·개발계획·공급공실은 모두 [MOCK] 데이터 기반입니다 (§ 데이터 근거 탭 참고).",
          evidenceIds: [],
        },
      ],
    },
    {
      key: "FIELD_VISIT_CHECKLIST",
      title: "23. 현장방문 시 반드시 확인할 사항",
      status: "OK",
      paragraphs: [
        {
          text: "실제 소음, 채광, 향, 전망, 경사, 주차, 건물관리상태, 누수, 악취, 유동동선, 상가 가시성, 간판, 전면폭, 실제 공실, 상인/중개업소 의견은 온라인 자료로 확인할 수 없어 현장에서 직접 확인이 필요합니다.",
          evidenceIds: [],
        },
      ],
    },
  ];

  return sections;
}
