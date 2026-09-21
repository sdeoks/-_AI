"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceTypeBadge, MockBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateRange, formatDateKST } from "@/lib/utils";
import { sampleSizeWarning } from "@/lib/enums";
import type { EvidenceType } from "@/lib/enums";

export interface EvidenceCardData {
  id: string;
  analysisCategory: string;
  metricLabel: string;
  displayValue: string;
  metricUnit?: string | null;
  sourceOrganization: string;
  sourceDataset: string;
  sourceUrl?: string | null;
  dataPeriodStart?: Date | string | null;
  dataPeriodEnd?: Date | string | null;
  asOfDate?: Date | string | null;
  retrievedAt: Date | string;
  radiusMeters?: number | null;
  rawSampleCount?: number | null;
  excludedSampleCount?: number | null;
  usedSampleCount?: number | null;
  filterDescription?: string | null;
  calculationMethod?: string | null;
  evidenceType: string;
  confidenceScore?: number | null;
  confidenceReason?: string | null;
  limitations?: string | null;
  isMock: boolean;
  rawDataRecords?: { id: string; label: string; payload: string; isOutlierCandidate: boolean }[];
}

export function EvidenceCard({ evidence }: { evidence: EvidenceCardData }) {
  const [open, setOpen] = useState(false);
  const n = evidence.usedSampleCount ?? evidence.rawSampleCount ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle>{evidence.metricLabel}</CardTitle>
        <div className="flex gap-1">
          <EvidenceTypeBadge type={evidence.evidenceType as EvidenceType} />
          {evidence.isMock && <MockBadge />}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{evidence.displayValue}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {evidence.sourceOrganization} · {formatDateRange(evidence.dataPeriodStart, evidence.dataPeriodEnd)} · N=
          {n} ({sampleSizeWarning(n)})
        </p>
        {evidence.confidenceScore != null && (
          <p className="mt-1 text-xs text-slate-400">신뢰도 {evidence.confidenceScore}/100</p>
        )}
        <Button variant="outline" className="mt-3 text-xs" onClick={() => setOpen((v) => !v)}>
          {open ? "근거 접기" : "근거 보기"}
        </Button>

        {open && (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
            <Row label="출처 기관" value={evidence.sourceOrganization} />
            <Row label="데이터셋" value={evidence.sourceDataset} />
            <Row label="자료 기준시점" value={formatDateKST(evidence.asOfDate)} />
            <Row
              label="분석 기간"
              value={formatDateRange(evidence.dataPeriodStart, evidence.dataPeriodEnd)}
            />
            <Row label="조회일" value={formatDateKST(evidence.retrievedAt)} />
            <Row label="공간범위" value={evidence.radiusMeters ? `반경 ${evidence.radiusMeters}m` : "-"} />
            <Row
              label="표본 (원표본/제외/최종)"
              value={`${evidence.rawSampleCount ?? "-"} / ${evidence.excludedSampleCount ?? "-"} / ${evidence.usedSampleCount ?? "-"}`}
            />
            <Row label="적용 필터" value={evidence.filterDescription ?? "-"} />
            <Row label="계산방법" value={evidence.calculationMethod ?? "-"} />
            <Row label="신뢰도 근거" value={evidence.confidenceReason ?? "-"} />
            <Row label="한계" value={evidence.limitations ?? "-"} />
            {evidence.sourceUrl && <Row label="원문" value={evidence.sourceUrl} />}

            {evidence.rawDataRecords && evidence.rawDataRecords.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 font-semibold text-slate-600 dark:text-slate-300">
                  원자료 {evidence.rawDataRecords.length}건 (최대 10건 표시)
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {evidence.rawDataRecords.slice(0, 10).map((r) => (
                    <li
                      key={r.id}
                      className={
                        r.isOutlierCandidate
                          ? "text-amber-600 line-through decoration-amber-400"
                          : "text-slate-500 dark:text-slate-400"
                      }
                    >
                      {r.label}
                      {r.isOutlierCandidate && " (이상치 후보)"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}
