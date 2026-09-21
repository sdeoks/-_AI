import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceTypeBadge } from "@/components/ui/badge";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";

export interface BusinessSummary {
  businessCount: number;
  employeeCount: number;
  industryBreakdown: { industry: string; ratio: number }[];
  purchasingPowerIndex: number;
  purchasingPowerBasis: string[];
}

export function BusinessTab({
  countEvidence,
  purchasingPowerEvidence,
  summary,
}: {
  countEvidence: EvidenceCardData | null;
  purchasingPowerEvidence: EvidenceCardData | null;
  summary: BusinessSummary | null;
}) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">
          직장·사업체 자료 부족
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {countEvidence && <EvidenceCard evidence={countEvidence} />}
        {purchasingPowerEvidence && <EvidenceCard evidence={purchasingPowerEvidence} />}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>산업 구성</CardTitle>
          <EvidenceTypeBadge type="ESTIMATED" />
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.industryBreakdown.map((i) => (
            <div key={i.industry} className="flex items-center gap-2 text-sm">
              <span className="w-32 shrink-0 text-slate-500">{i.industry}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, i.ratio * 100)}%` }}
                />
              </div>
              <span className="w-14 text-right font-medium">{(i.ratio * 100).toFixed(1)}%</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-slate-400">
            구매력 추정지수 근거: {summary.purchasingPowerBasis.join(" · ")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
