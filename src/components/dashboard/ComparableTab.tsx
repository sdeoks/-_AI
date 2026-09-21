import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatWon, formatDateKST } from "@/lib/utils";
import { SIMILARITY_GRADE_LABELS, type SimilarityGrade } from "@/lib/enums";

export interface ComparableCaseRow {
  id: string;
  caseType: string;
  buildingName: string | null;
  address: string | null;
  distanceMeters: number | null;
  exclusiveArea: number | null;
  floor: number | null;
  transactionDate: Date | string | null;
  priceAmount: number | null;
  pricePerArea: number | null;
  similarityScore: number;
  similarityReasons: string;
  similarityGrade: string;
  dataSourceType: string;
  caseNumber?: string | null;
  court?: string | null;
  minimumSalePrice?: number | null;
  failedBidCount?: number | null;
  bidderCount?: number | null;
  winningBidRatio?: number | null;
}

const GRADE_COLOR: Record<SimilarityGrade, string> = {
  VERY_HIGH: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  HIGH: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  COMPARABLE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  AUXILIARY: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  REFERENCE: "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-500",
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <Badge className={GRADE_COLOR[grade as SimilarityGrade]}>
      {SIMILARITY_GRADE_LABELS[grade as SimilarityGrade]}
    </Badge>
  );
}

export function ComparableTab({
  cases,
  auctionCases,
}: {
  cases: ComparableCaseRow[];
  auctionCases: ComparableCaseRow[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>유사 실거래 사례 (유사도순)</CardTitle>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <p className="text-sm text-slate-500">유사사례 자료 부족</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-2">유사도</th>
                    <th className="p-2">등급</th>
                    <th className="p-2">단지/건물</th>
                    <th className="p-2">거리</th>
                    <th className="p-2">면적</th>
                    <th className="p-2">층</th>
                    <th className="p-2">거래일</th>
                    <th className="p-2">거래금액</th>
                    <th className="p-2">㎡당</th>
                    <th className="p-2">왜 유사한가</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => {
                    const reasons: string[] = JSON.parse(c.similarityReasons || "[]");
                    return (
                      <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="p-2 font-bold">{c.similarityScore}</td>
                        <td className="p-2">
                          <GradeBadge grade={c.similarityGrade} />
                        </td>
                        <td className="p-2">{c.buildingName ?? "-"}</td>
                        <td className="p-2">{c.distanceMeters ? `${Math.round(c.distanceMeters)}m` : "-"}</td>
                        <td className="p-2">{c.exclusiveArea ?? "-"}㎡</td>
                        <td className="p-2">{c.floor ?? "-"}</td>
                        <td className="p-2">{formatDateKST(c.transactionDate)}</td>
                        <td className="p-2">{formatWon(c.priceAmount)}</td>
                        <td className="p-2">{c.pricePerArea ? Math.round(c.pricePerArea).toLocaleString() : "-"}</td>
                        <td className="p-2 max-w-[240px] text-slate-500">{reasons.join(" · ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {auctionCases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>유사 경매 낙찰 사례</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-2">유사도</th>
                    <th className="p-2">사건번호</th>
                    <th className="p-2">법원</th>
                    <th className="p-2">거리</th>
                    <th className="p-2">면적</th>
                    <th className="p-2">감정가</th>
                    <th className="p-2">최저가</th>
                    <th className="p-2">낙찰가</th>
                    <th className="p-2">낙찰가율</th>
                    <th className="p-2">유찰</th>
                    <th className="p-2">입찰인원</th>
                    <th className="p-2">매각일</th>
                    <th className="p-2">평당낙찰가</th>
                  </tr>
                </thead>
                <tbody>
                  {auctionCases.map((c) => {
                    const appraisalPrice =
                      c.priceAmount != null && c.winningBidRatio
                        ? c.priceAmount / c.winningBidRatio
                        : null;
                    return (
                      <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="p-2 font-bold">{c.similarityScore}</td>
                        <td className="p-2">{c.caseNumber ?? "-"}</td>
                        <td className="p-2">{c.court ?? "-"}</td>
                        <td className="p-2">{c.distanceMeters ? `${Math.round(c.distanceMeters)}m` : "-"}</td>
                        <td className="p-2">{c.exclusiveArea ?? "-"}㎡</td>
                        <td className="p-2">{formatWon(appraisalPrice)}</td>
                        <td className="p-2">{formatWon(c.minimumSalePrice)}</td>
                        <td className="p-2">{formatWon(c.priceAmount)}</td>
                        <td className="p-2">
                          {c.winningBidRatio != null ? `${(c.winningBidRatio * 100).toFixed(1)}%` : "-"}
                        </td>
                        <td className="p-2">{c.failedBidCount ?? 0}회</td>
                        <td className="p-2">{c.bidderCount ?? "-"}명</td>
                        <td className="p-2">{formatDateKST(c.transactionDate)}</td>
                        <td className="p-2">{c.pricePerArea ? Math.round(c.pricePerArea).toLocaleString() : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              출처: 법원경매정보(대법원) [MOCK]. 유료 경매정보 사이트는 무단 크롤링하지
              않으며, 사용자 업로드 Importer는 아직 미구현입니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
