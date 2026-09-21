import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";

export interface CommercialDistrictSummary {
  radiusMeters: number;
  totalStoreCount: number;
  byCategory: { category: string; count: number }[];
  footfallProxyIndex: number;
}

export function CommercialDistrictTab({
  storeEvidence,
  footfallEvidence,
  summary,
}: {
  storeEvidence: EvidenceCardData | null;
  footfallEvidence: EvidenceCardData | null;
  summary: CommercialDistrictSummary | null;
}) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">상권 자료 부족</CardContent>
      </Card>
    );
  }

  const max = Math.max(...summary.byCategory.map((c) => c.count), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {storeEvidence && <EvidenceCard evidence={storeEvidence} />}
        {footfallEvidence && <EvidenceCard evidence={footfallEvidence} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>업종별 점포수 (반경 {summary.radiusMeters}m)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.byCategory.map((c) => (
            <div key={c.category} className="flex items-center gap-2 text-sm">
              <span className="w-20 shrink-0 text-slate-500">{c.category}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-amber-500"
                  style={{ width: `${(c.count / max) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right font-medium">{c.count}개</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
