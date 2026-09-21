import { prisma } from "@/lib/db";
import { mockRealTransactionProvider } from "@/lib/providers/mock/realTransaction";
import { runComparableEngine } from "@/lib/comparable/engine";
import { createEvidence } from "@/lib/evidence/build";
import { defaultAnalysisMonths, defaultMaxRadiusMeters } from "./periods";
import { sampleSizeWarning, type PropertyType } from "@/lib/enums";
import { formatWon } from "@/lib/utils";

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

  // 4) AI 입지 리포트 생성 (Mock AI Provider — Evidence만 인용, 새 숫자 생성 금지)
  const sections = buildAIReportSections({
    property,
    propertyType,
    overallStats,
    engineResult,
    transactionEvidenceId: transactionEvidence.id,
    comparableEvidenceId: comparableEvidence.id,
  });

  await prisma.aIReport.create({
    data: {
      propertyId,
      providerKey: "mock",
      sectionsJson: JSON.stringify(sections),
    },
  });

  // 5) 탭별 손품 완료도 스냅샷 (§55)
  const snapshots = [
    { tabKey: "SUMMARY", completionRate: 100, status: "OK" },
    { tabKey: "MAP", completionRate: 100, status: "OK" },
    {
      tabKey: "COMPARABLE",
      completionRate: engineResult.usedSampleCount >= 6 ? 100 : 60,
      status: engineResult.usedSampleCount > 0 ? "OK" : "PARTIAL",
    },
    { tabKey: "TRANSACTION", completionRate: 100, status: "OK" },
    { tabKey: "RENTAL", completionRate: 0, status: "UNAVAILABLE" },
    { tabKey: "RESIDENTIAL_BACKUP", completionRate: 0, status: "UNAVAILABLE" },
    { tabKey: "POPULATION", completionRate: 0, status: "UNAVAILABLE" },
    { tabKey: "BUSINESS", completionRate: 0, status: "UNAVAILABLE" },
    { tabKey: "COMMERCIAL_DISTRICT", completionRate: 0, status: "UNAVAILABLE" },
    { tabKey: "TRANSPORT", completionRate: 0, status: "UNAVAILABLE" },
    { tabKey: "DEVELOPMENT", completionRate: 0, status: "UNAVAILABLE" },
    { tabKey: "SUPPLY_VACANCY", completionRate: 0, status: "UNAVAILABLE" },
    { tabKey: "LAND_BUILDING", completionRate: 0, status: "UNAVAILABLE" },
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
}): AISection[] {
  const { property, engineResult, transactionEvidenceId, comparableEvidenceId } = args;
  const top5 = engineResult.candidates.slice(0, 5);

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
          text: "인구·가구, 사업체·구매력, 상권·유동인구, 교통·생활인프라, 개발계획, 공급·공실, 임대시장, 경매 낙찰사례는 이번 분석에서 공식 데이터 연동이 아직 구현되지 않아 다루지 않았습니다 (§ 데이터 근거 탭 참고).",
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
