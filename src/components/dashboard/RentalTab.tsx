import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";
import { formatWon, formatDateKST } from "@/lib/utils";

export interface RentalListingSummary {
  id: string;
  distanceMeters: number;
  floor: number | null;
  exclusiveArea: number;
  deposit: number;
  monthlyRent: number;
  managementFee: number | null;
  isActualContract: boolean;
  listingDate: string;
}

export interface RentalSummary {
  radiusMeters: number;
  listings: RentalListingSummary[];
  medianMonthlyRent: number;
  actualCount: number;
  hoGaCount: number;
}

export function RentalTab({
  evidence,
  summary,
}: {
  evidence: EvidenceCardData | null;
  summary: RentalSummary | null;
}) {
  if (!summary || summary.listings.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">
          유사 임대사례 자료 부족
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {evidence && <EvidenceCard evidence={evidence} />}

      <Card>
        <CardHeader>
          <CardTitle>임대 사례 (반경 {summary.radiusMeters}m)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-slate-500">
            실제계약 {summary.actualCount}건 · 호가 {summary.hoGaCount}건
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-2">구분</th>
                  <th className="p-2">거리</th>
                  <th className="p-2">층</th>
                  <th className="p-2">면적</th>
                  <th className="p-2">보증금</th>
                  <th className="p-2">월세</th>
                  <th className="p-2">관리비</th>
                  <th className="p-2">계약/등록시기</th>
                </tr>
              </thead>
              <tbody>
                {summary.listings.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-2">
                      <Badge
                        className={
                          l.isActualContract
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }
                      >
                        {l.isActualContract ? "실제계약" : "호가"}
                      </Badge>
                    </td>
                    <td className="p-2">{Math.round(l.distanceMeters)}m</td>
                    <td className="p-2">{l.floor ?? "-"}</td>
                    <td className="p-2">{l.exclusiveArea}㎡</td>
                    <td className="p-2">{formatWon(l.deposit)}</td>
                    <td className="p-2">{l.monthlyRent > 0 ? formatWon(l.monthlyRent) : "전세"}</td>
                    <td className="p-2">{l.managementFee ? formatWon(l.managementFee) : "-"}</td>
                    <td className="p-2">{formatDateKST(l.listingDate)}</td>
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
