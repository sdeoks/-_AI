import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";

export interface TransportSummary {
  nearestSubway: { name: string; distanceMeters: number; lineNames: string[] } | null;
  nearestBusStops: { name: string; distanceMeters: number }[];
  poiList: { category: string; name: string; distanceMeters: number }[];
}

export function TransportTab({
  evidence,
  summary,
}: {
  evidence: EvidenceCardData | null;
  summary: TransportSummary | null;
}) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">
          교통·생활인프라 자료 부족
        </CardContent>
      </Card>
    );
  }

  const byCategory = groupBy(summary.poiList, (p) => p.category);

  return (
    <div className="space-y-4">
      {evidence && <EvidenceCard evidence={evidence} />}

      <Card>
        <CardHeader>
          <CardTitle>교통</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">가장 가까운 지하철역 (직선거리)</p>
            <p className="font-medium">
              {summary.nearestSubway
                ? `${summary.nearestSubway.name} (${summary.nearestSubway.lineNames.join(", ")}) · ${summary.nearestSubway.distanceMeters}m`
                : "반경 내 확인되지 않음"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">가장 가까운 버스정류장 (직선거리)</p>
            <ul className="mt-1 space-y-0.5">
              {summary.nearestBusStops.map((b) => (
                <li key={b.name}>
                  {b.name} · {b.distanceMeters}m
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>생활 인프라 (직선거리순)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category}>
                <p className="mb-1 text-xs font-semibold text-slate-500">{category}</p>
                <ul className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {items.map((p) => (
                    <li key={p.name}>
                      {p.name} · {p.distanceMeters}m
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = keyFn(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}
