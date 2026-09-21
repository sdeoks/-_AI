"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { DASHBOARD_TABS, PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/enums";
import { formatWon } from "@/lib/utils";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";
import { MapTab } from "./MapTab";
import { ComparableTab, type ComparableCaseRow } from "./ComparableTab";
import { TransactionTab } from "./TransactionTab";
import { AIReportTab, type AISection } from "./AIReportTab";
import { EvidenceTab } from "./EvidenceTab";
import { NotImplementedTab } from "./NotImplementedTab";

interface PropertyLike {
  id: string;
  name: string;
  address: string;
  propertyType: string;
  exclusiveArea: number | null;
  floor: number | null;
  builtYear: number | null;
  appraisalPrice: number | null;
  askingPrice: number | null;
  lat: number | null;
  lng: number | null;
  isAuction: boolean;
  auctionInfo: {
    caseNumber: string;
    court: string;
    minimumSalePrice: number | null;
    failedBidCount: number | null;
  } | null;
}

interface EvidenceRaw {
  id: string;
  analysisCategory: string;
  metricLabel: string;
  metricValue: string;
  metricUnit: string | null;
  sourceOrganization: string;
  sourceDataset: string;
  sourceUrl: string | null;
  dataPeriodStart: Date | string | null;
  dataPeriodEnd: Date | string | null;
  asOfDate: Date | string | null;
  retrievedAt: Date | string;
  radiusMeters: number | null;
  rawSampleCount: number | null;
  excludedSampleCount: number | null;
  usedSampleCount: number | null;
  filterDescription: string | null;
  calculationMethod: string | null;
  evidenceType: string;
  confidenceScore: number | null;
  confidenceReason: string | null;
  limitations: string | null;
  isMock: boolean;
  rawDataRecords: { id: string; label: string; payload: string; isOutlierCandidate: boolean }[];
}

export function PropertyDashboard({
  property,
  evidences,
  comparableCases,
  aiReport,
  analysisError,
}: {
  property: PropertyLike;
  evidences: EvidenceRaw[];
  comparableCases: ComparableCaseRow[];
  snapshots: { tabKey: string; completionRate: number; status: string }[];
  aiReport: { sections: AISection[] } | null;
  analysisError: string | null;
}) {
  const router = useRouter();
  const [tabKey, setTabKey] = useState<string>("SUMMARY");
  const [highlightEvidenceId, setHighlightEvidenceId] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  const evidenceCards: EvidenceCardData[] = useMemo(
    () =>
      evidences.map((e) => ({
        ...e,
        displayValue: formatMetric(e.metricValue, e.metricUnit),
      })),
    [evidences],
  );

  const overallEvidence = evidenceCards.find((e) => e.analysisCategory === "REAL_TRANSACTION_OVERALL") ?? null;
  const comparableEvidence = evidenceCards.find((e) => e.analysisCategory === "COMPARABLE_SUMMARY") ?? null;

  const transactionPoints = (overallEvidence?.rawDataRecords ?? []).map((r) => {
    const payload = JSON.parse(r.payload);
    return { date: payload.transactionDate, priceAmount: payload.priceAmount, exclusiveArea: payload.exclusiveArea };
  });

  function goToEvidence(id: string) {
    setHighlightEvidenceId(id);
    setTabKey("EVIDENCE");
  }

  async function handleReanalyze() {
    setReanalyzing(true);
    await fetch(`/api/analysis/${property.id}`, { method: "POST" });
    setReanalyzing(false);
    router.refresh();
  }

  const items: TabItem[] = DASHBOARD_TABS.map((t) => ({
    key: t.key,
    label: t.label,
    content: renderTabContent(t.key),
  }));

  function renderTabContent(key: string) {
    switch (key) {
      case "SUMMARY":
        return (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {overallEvidence && <EvidenceCard evidence={overallEvidence} />}
            {comparableEvidence && <EvidenceCard evidence={comparableEvidence} />}
            <KpiPlaceholder label="배후세대" />
            <KpiPlaceholder label="인구" />
            <KpiPlaceholder label="사업체·종사자" />
            <KpiPlaceholder label="교통" />
            <KpiPlaceholder label="상권활력" />
            <KpiPlaceholder label="유동인구(Proxy)" />
            <KpiPlaceholder label="개발계획" />
            <KpiPlaceholder label="공실위험" />
          </div>
        );
      case "MAP":
        return property.lat != null && property.lng != null ? (
          <MapTab
            centerLat={property.lat}
            centerLng={property.lng}
            pins={comparableCases
              .filter((c) => c.address)
              .map((c) => ({
                id: c.id,
                lat: property.lat! + (Math.random() - 0.5) * 0.001,
                lng: property.lng! + (Math.random() - 0.5) * 0.001,
                label: c.buildingName ?? c.address ?? "-",
                similarityScore: c.similarityScore,
              }))}
          />
        ) : (
          <p className="text-sm text-slate-500">좌표 확인 필요 (지오코딩 실패)</p>
        );
      case "COMPARABLE":
        return <ComparableTab cases={comparableCases} />;
      case "TRANSACTION":
        return <TransactionTab evidence={overallEvidence} points={transactionPoints} />;
      case "AI_REPORT":
        return aiReport ? (
          <AIReportTab sections={aiReport.sections} onShowEvidence={goToEvidence} />
        ) : (
          <p className="text-sm text-slate-500">AI 리포트를 생성하지 못했습니다.</p>
        );
      case "EVIDENCE":
        return <EvidenceTab evidences={evidenceCards} highlightId={highlightEvidenceId} />;
      case "RENTAL":
        return (
          <NotImplementedTab
            title="⑤ 임대시장"
            candidateSources={["국토교통부 전월세 실거래가", "사용자 업로드 임대 호가 자료"]}
          />
        );
      case "RESIDENTIAL_BACKUP":
        return (
          <NotImplementedTab
            title="⑥ 배후주거"
            candidateSources={["한국부동산원 공동주택 단지정보", "국토교통부 건축물대장"]}
          />
        );
      case "POPULATION":
        return (
          <NotImplementedTab title="⑦ 인구·세대" candidateSources={["통계청 SGIS", "KOSIS"]} />
        );
      case "BUSINESS":
        return (
          <NotImplementedTab
            title="⑧ 직장·사업체·구매력"
            candidateSources={["통계청 전국사업체조사", "고용노동부 임금통계(KOSIS)"]}
          />
        );
      case "COMMERCIAL_DISTRICT":
        return (
          <NotImplementedTab
            title="⑨ 상권·유동인구"
            candidateSources={["소상공인시장진흥공단 상가(상권)정보"]}
          />
        );
      case "TRANSPORT":
        return (
          <NotImplementedTab
            title="⑩ 교통·생활인프라"
            candidateSources={["국가대중교통정보센터(TAGO)", "지자체 교통공사 승하차 자료"]}
          />
        );
      case "DEVELOPMENT":
        return (
          <NotImplementedTab
            title="⑪ 개발계획"
            candidateSources={["도시계획정보서비스(UPIS)", "지자체 도시계획 공고"]}
          />
        );
      case "SUPPLY_VACANCY":
        return (
          <NotImplementedTab
            title="⑫ 공급·공실·경쟁"
            candidateSources={["한국부동산원 상업용부동산 임대동향조사(공표자료)"]}
          />
        );
      case "LAND_BUILDING":
        return (
          <NotImplementedTab
            title="⑬ 환경·토지·건물"
            candidateSources={["국토교통부 건축HUB", "VWorld 토지이용계획"]}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{property.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{property.address}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>{PROPERTY_TYPE_LABELS[property.propertyType as PropertyType]}</span>
            {property.exclusiveArea && <span>· 전용 {property.exclusiveArea}㎡</span>}
            {property.floor && <span>· {property.floor}층</span>}
            {property.askingPrice && <span>· 희망가 {formatWon(property.askingPrice)}</span>}
            {property.isAuction && property.auctionInfo && (
              <span>
                · 경매 {property.auctionInfo.caseNumber} ({property.auctionInfo.court})
              </span>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={handleReanalyze} disabled={reanalyzing}>
          {reanalyzing ? "재분석 중..." : "재분석 (Mock 재생성)"}
        </Button>
      </div>

      {analysisError && (
        <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="py-3 text-sm text-red-700 dark:text-red-300">
            분석 실행 오류: {analysisError}
          </CardContent>
        </Card>
      )}

      <Tabs items={items} activeKey={tabKey} onChange={setTabKey} />
    </div>
  );
}

function KpiPlaceholder({ label }: { label: string }) {
  return (
    <Card className="opacity-60">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-400">데이터 연결 안 됨</p>
      </CardContent>
    </Card>
  );
}

function formatMetric(rawValue: string, unit: string | null): string {
  const n = Number(rawValue);
  if (Number.isNaN(n)) return rawValue;
  if (unit === "원") return formatWon(n);
  return `${n.toLocaleString()}${unit ?? ""}`;
}
