"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EvidenceTypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AIParagraph {
  text: string;
  evidenceIds: string[];
}
export interface AISection {
  key: string;
  title: string;
  status: "OK" | "NO_DATA";
  paragraphs: AIParagraph[];
}

export function AIReportTab({
  sections,
  onShowEvidence,
}: {
  sections: AISection[];
  onShowEvidence: (evidenceId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30">
        <CardContent className="flex items-center gap-2 py-3 text-sm text-violet-800 dark:text-violet-300">
          <EvidenceTypeBadge type="AI_ANALYSIS" />
          <span>
            아래 문장은 AI가 저장된 Evidence만 인용하여 구성했습니다. 새로운 숫자를 생성하지
            않으며, 각 문장의 [근거] 버튼을 누르면 원본 데이터로 이동합니다.
          </span>
        </CardContent>
      </Card>

      {sections.map((s) => (
        <Card key={s.key}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{s.title}</CardTitle>
            {s.status === "NO_DATA" && <Badge className="bg-slate-200 text-slate-600">데이터 없음</Badge>}
          </CardHeader>
          <CardContent className="space-y-2">
            {s.paragraphs.length === 0 ? (
              <p className="text-sm text-slate-500">현재 데이터로는 이 항목을 다루지 않습니다.</p>
            ) : (
              s.paragraphs.map((p, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2 text-sm">
                  <p className="flex-1 text-slate-700 dark:text-slate-200">{p.text}</p>
                  {p.evidenceIds.map((id) => (
                    <Button
                      key={id}
                      variant="outline"
                      className="px-2 py-1 text-xs"
                      onClick={() => onShowEvidence(id)}
                    >
                      근거 보기
                    </Button>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
