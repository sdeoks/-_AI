import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";
import { formatWon } from "@/lib/utils";

export interface NearbyComplexSummary {
  name: string;
  distanceMeters: number;
  households: number | null;
  builtYear: number | null;
  recentPricePerArea: number | null;
  transactionCount: number;
}

export interface ResidentialBackupSummary {
  radiusMeters: number;
  complexes: NearbyComplexSummary[];
  totalComplexes: number;
  confirmedHouseholds: number;
  unconfirmedComplexCount: number;
}

export function ResidentialBackupTab({
  evidence,
  summary,
}: {
  evidence: EvidenceCardData | null;
  summary: ResidentialBackupSummary | null;
}) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">배후주거 자료 부족</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {evidence && <EvidenceCard evidence={evidence} />}

      <Card>
        <CardHeader>
          <CardTitle>
            반경 {summary.radiusMeters}m 공동주택 {summary.totalComplexes}개 단지
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-slate-500">
            확인세대수 {summary.confirmedHouseholds.toLocaleString()}세대 · 세대수 미확인{" "}
            {summary.unconfirmedComplexCount}개 단지
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-2">단지명</th>
                  <th className="p-2">거리</th>
                  <th className="p-2">세대수</th>
                  <th className="p-2">준공연도</th>
                  <th className="p-2">최근 평당가</th>
                  <th className="p-2">거래량</th>
                </tr>
              </thead>
              <tbody>
                {summary.complexes.map((c) => (
                  <tr key={c.name + c.distanceMeters} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-2">{c.name}</td>
                    <td className="p-2">{Math.round(c.distanceMeters)}m</td>
                    <td className="p-2">
                      {c.households != null ? `${c.households.toLocaleString()}세대` : "미확인"}
                    </td>
                    <td className="p-2">{c.builtYear ?? "미확인"}</td>
                    <td className="p-2">
                      {c.recentPricePerArea != null ? formatWon(c.recentPricePerArea) + "/㎡" : "미확인"}
                    </td>
                    <td className="p-2">{c.transactionCount}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
