"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceTypeBadge, MockBadge } from "@/components/ui/badge";
import { formatDateKST, formatDateRange } from "@/lib/utils";
import { sampleSizeWarning, type EvidenceType } from "@/lib/enums";
import type { EvidenceCardData } from "./EvidenceCard";

export function EvidenceTab({
  evidences,
  highlightId,
}: {
  evidences: EvidenceCardData[];
  highlightId?: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(highlightId ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>⑮ 데이터 근거 — 분석 항목별 출처/기간/N/조회일/신뢰도</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-2">분석항목</th>
                <th className="p-2">결과</th>
                <th className="p-2">출처기관</th>
                <th className="p-2">데이터셋</th>
                <th className="p-2">기준시점</th>
                <th className="p-2">기간</th>
                <th className="p-2">N</th>
                <th className="p-2">조회일</th>
                <th className="p-2">데이터종류</th>
                <th className="p-2">신뢰도</th>
                <th className="p-2">원자료</th>
              </tr>
            </thead>
            <tbody>
              {evidences.map((e) => {
                const n = e.usedSampleCount ?? e.rawSampleCount ?? 0;
                const isOpen = expanded === e.id;
                return (
                  <>
                    <tr
                      key={e.id}
                      className={`border-t border-slate-100 dark:border-slate-800 ${
                        highlightId === e.id ? "bg-violet-50 dark:bg-violet-950/40" : ""
                      }`}
                    >
                      <td className="p-2 font-medium">{e.metricLabel}</td>
                      <td className="p-2">{e.displayValue}</td>
                      <td className="p-2">{e.sourceOrganization}</td>
                      <td className="p-2">
                        {e.sourceDataset} {e.isMock && <MockBadge />}
                      </td>
                      <td className="p-2">{formatDateKST(e.asOfDate)}</td>
                      <td className="p-2">{formatDateRange(e.dataPeriodStart, e.dataPeriodEnd)}</td>
                      <td className="p-2">
                        {n} <span className="text-slate-400">({sampleSizeWarning(n)})</span>
                      </td>
                      <td className="p-2">{formatDateKST(e.retrievedAt)}</td>
                      <td className="p-2">
                        <EvidenceTypeBadge type={e.evidenceType as EvidenceType} />
                      </td>
                      <td className="p-2">{e.confidenceScore ?? "-"}</td>
                      <td className="p-2">
                        <button
                          className="text-sky-600 underline"
                          onClick={() => setExpanded(isOpen ? null : e.id)}
                        >
                          [{isOpen ? "닫기" : "보기"}]
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                        <td colSpan={11} className="p-3">
                          <p className="mb-1">
                            <b>필터:</b> {e.filterDescription ?? "-"} &nbsp; <b>계산방법:</b>{" "}
                            {e.calculationMethod ?? "-"}
                          </p>
                          <p className="mb-1">
                            <b>신뢰도 근거:</b> {e.confidenceReason ?? "-"}
                          </p>
                          <p className="mb-2">
                            <b>한계:</b> {e.limitations ?? "-"}
                          </p>
                          <ul className="max-h-40 space-y-0.5 overflow-y-auto">
                            {(e.rawDataRecords ?? []).slice(0, 30).map((r) => (
                              <li key={r.id} className="text-slate-500">
                                {r.label}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
