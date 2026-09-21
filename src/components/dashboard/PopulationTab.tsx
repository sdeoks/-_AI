import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";

export interface PopulationSummary {
  administrativeDongName: string;
  totalPopulation: number;
  households: number;
  singlePersonHouseholds: number;
  ageBrackets: { label: string; ratio: number }[];
  trend: { year: number; totalPopulation: number }[];
}

export function PopulationTab({
  evidence,
  summary,
}: {
  evidence: EvidenceCardData | null;
  summary: PopulationSummary | null;
}) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">
          인구·가구 자료 부족
        </CardContent>
      </Card>
    );
  }

  const trendStart = summary.trend[0]?.totalPopulation ?? 0;
  const trendEnd = summary.trend[summary.trend.length - 1]?.totalPopulation ?? 0;
  const trendChangePct = trendStart > 0 ? ((trendEnd - trendStart) / trendStart) * 100 : 0;

  return (
    <div className="space-y-4">
      {evidence && <EvidenceCard evidence={evidence} />}

      <Card>
        <CardHeader>
          <CardTitle>세대 구성</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="세대수" value={`${summary.households.toLocaleString()}세대`} />
          <Stat
            label="1인가구"
            value={`${summary.singlePersonHouseholds.toLocaleString()}세대`}
          />
          <Stat
            label={`최근 ${summary.trend.length}년 인구 변화`}
            value={`${trendChangePct >= 0 ? "+" : ""}${trendChangePct.toFixed(1)}%`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>연령대 구성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.ageBrackets.map((a) => (
            <div key={a.label} className="flex items-center gap-2 text-sm">
              <span className="w-32 shrink-0 text-slate-500">{a.label}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${Math.min(100, a.ratio * 100)}%` }}
                />
              </div>
              <span className="w-14 text-right font-medium">{(a.ratio * 100).toFixed(1)}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>인구 추세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 text-xs">
            {summary.trend.map((t) => (
              <div key={t.year} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-slate-500">{(t.totalPopulation / 1000).toFixed(1)}천</span>
                <div
                  className="w-full rounded-t bg-sky-400"
                  style={{
                    height: `${Math.max(
                      8,
                      (t.totalPopulation / Math.max(...summary.trend.map((p) => p.totalPopulation))) * 80,
                    )}px`,
                  }}
                />
                <span className="text-slate-400">{t.year}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
