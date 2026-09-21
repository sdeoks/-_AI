import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { runAnalysisForProperty } from "@/lib/analysis/runAnalysis";
import { formatDateKST, formatDateRange, formatWon } from "@/lib/utils";
import { sampleSizeWarning, EVIDENCE_TYPE_BADGE, type EvidenceType, PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/enums";
import { PrintButton } from "./PrintButton";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "사백나나 입지랩 AI";

export default async function PropertyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: { auctionInfo: true },
  });
  if (!property) notFound();

  const existingEvidence = await prisma.evidence.count({ where: { propertyId: id } });
  if (existingEvidence === 0) {
    try {
      await runAnalysisForProperty(id);
    } catch {
      // 분석 실패 시에도 리포트 페이지는 빈 상태로 렌더링 (아래에서 안내)
    }
  }

  const [evidences, aiReport] = await Promise.all([
    prisma.evidence.findMany({ where: { propertyId: id }, orderBy: { createdAt: "asc" } }),
    prisma.aIReport.findFirst({ where: { propertyId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  const evidenceById = new Map(evidences.map((e) => [e.id, e]));
  const sections: {
    key: string;
    title: string;
    status: "OK" | "NO_DATA";
    paragraphs: { text: string; evidenceIds: string[] }[];
  }[] = aiReport ? JSON.parse(aiReport.sectionsJson) : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 print:px-0 print:py-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <a href={`/properties/${id}`} className="text-sm text-sky-600 underline">
          ← 대시보드로 돌아가기
        </a>
        <PrintButton />
      </div>

      <header className="mb-8 border-b border-slate-300 pb-4">
        <p className="text-xs text-slate-500">{APP_NAME} · AI 입지 리포트</p>
        <h1 className="text-2xl font-bold">{property.name}</h1>
        <p className="text-sm text-slate-600">{property.address}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>{PROPERTY_TYPE_LABELS[property.propertyType as PropertyType]}</span>
          {property.exclusiveArea && <span>전용 {property.exclusiveArea}㎡</span>}
          {property.floor && <span>{property.floor}층</span>}
          {property.askingPrice && <span>희망가 {formatWon(property.askingPrice)}</span>}
          {property.isAuction && property.auctionInfo && (
            <span>
              경매 {property.auctionInfo.caseNumber} ({property.auctionInfo.court})
            </span>
          )}
          <span>리포트 생성일 {formatDateKST(new Date())}</span>
        </div>
      </header>

      {sections.length === 0 ? (
        <p className="text-sm text-slate-500">AI 리포트를 생성하지 못했습니다.</p>
      ) : (
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.key} className="break-inside-avoid">
              <h2 className="mb-1 text-base font-semibold">{s.title}</h2>
              {s.paragraphs.length === 0 ? (
                <p className="text-sm text-slate-400">현재 데이터로는 이 항목을 다루지 않습니다.</p>
              ) : (
                s.paragraphs.map((p, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-sm text-slate-800">{p.text}</p>
                    {p.evidenceIds.length > 0 && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {p.evidenceIds
                          .map((eid) => {
                            const e = evidenceById.get(eid);
                            if (!e) return null;
                            const n = e.usedSampleCount ?? e.rawSampleCount ?? 0;
                            return `[출처] ${e.sourceOrganization} · ${formatDateRange(e.dataPeriodStart, e.dataPeriodEnd)} · N=${n}`;
                          })
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </section>
          ))}
        </div>
      )}

      <section className="mt-10 border-t border-slate-300 pt-4 break-inside-avoid">
        <h2 className="mb-3 text-lg font-bold">부록: 데이터 출처 및 분석 기준</h2>
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="p-1.5">분석항목</th>
              <th className="p-1.5">결과</th>
              <th className="p-1.5">출처기관</th>
              <th className="p-1.5">데이터셋</th>
              <th className="p-1.5">기간</th>
              <th className="p-1.5">N</th>
              <th className="p-1.5">조회일</th>
              <th className="p-1.5">데이터종류</th>
              <th className="p-1.5">신뢰도</th>
            </tr>
          </thead>
          <tbody>
            {evidences.map((e) => {
              const n = e.usedSampleCount ?? e.rawSampleCount ?? 0;
              return (
                <tr key={e.id} className="border-b border-slate-200">
                  <td className="p-1.5">{e.metricLabel}</td>
                  <td className="p-1.5">{e.metricValue}{e.metricUnit ?? ""}</td>
                  <td className="p-1.5">{e.sourceOrganization}</td>
                  <td className="p-1.5">{e.sourceDataset}</td>
                  <td className="p-1.5">{formatDateRange(e.dataPeriodStart, e.dataPeriodEnd)}</td>
                  <td className="p-1.5">
                    {n} ({sampleSizeWarning(n)})
                  </td>
                  <td className="p-1.5">{formatDateKST(e.retrievedAt)}</td>
                  <td className="p-1.5">[{EVIDENCE_TYPE_BADGE[e.evidenceType as EvidenceType]}]</td>
                  <td className="p-1.5">{e.confidenceScore ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">
          본 리포트는 {APP_NAME}이(가) Mock 데이터([DEMO]/[MOCK] 표기 항목)를 포함해 자동
          생성했습니다. 모든 수치는 위 표의 출처·기간·N을 함께 확인해 사용자가 직접
          검증해야 합니다.
        </p>
      </section>
    </div>
  );
}
