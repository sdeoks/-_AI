import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";
import { formatDateKST } from "@/lib/utils";

export interface DevelopmentItemSummary {
  id: string;
  name: string;
  category: string;
  distanceMeters: number;
  proposingBody: string;
  announcingOrg: string;
  announcedDate: string;
  stage: string;
  expectedDate: string | null;
  lastCheckedDate: string;
  sourceType: "OFFICIAL_PLAN" | "NEWS";
}

export interface DevelopmentSummary {
  radiusMeters: number;
  items: DevelopmentItemSummary[];
}

export function DevelopmentTab({
  evidence,
  summary,
}: {
  evidence: EvidenceCardData | null;
  summary: DevelopmentSummary | null;
}) {
  if (!summary || summary.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">
          반경 내 확인된 개발계획이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {evidence && <EvidenceCard evidence={evidence} />}

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardContent className="py-3 text-xs text-amber-800 dark:text-amber-300">
          아래 항목은 [MOCK][DEMO] 예시 데이터이며 실제 확정 개발계획이 아닙니다. 공식계획과
          언론보도를 구분해서 표시합니다.
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {summary.items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <CardTitle>{item.name}</CardTitle>
              <Badge
                className={
                  item.sourceType === "OFFICIAL_PLAN"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }
              >
                {item.sourceType === "OFFICIAL_PLAN" ? "[공식계획]" : "[언론보도]"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <p>구분: {item.category}</p>
              <p>거리: {item.distanceMeters}m</p>
              <p>사업주체: {item.proposingBody}</p>
              <p>발표기관: {item.announcingOrg}</p>
              <p>발표일: {formatDateKST(item.announcedDate)}</p>
              <p>현재 단계: {item.stage}</p>
              {item.expectedDate && <p>예정시기: {item.expectedDate}</p>}
              <p>최근 확인일: {formatDateKST(item.lastCheckedDate)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
