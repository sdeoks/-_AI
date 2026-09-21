import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EvidenceTypeBadge } from "@/components/ui/badge";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";

export interface SupplyItemSummary {
  id: string;
  name: string;
  category: string;
  distanceMeters: number;
  expectedCompletionYear: number;
  scale: string;
  stage: string;
}

export interface SupplyVacancySummary {
  radiusMeters: number;
  supplyItems: SupplyItemSummary[];
  vacancyLevel: "낮음" | "보통" | "높음" | "데이터 부족";
  vacancyProxyFactors: string[];
}

export interface CommercialCategorySummary {
  category: string;
  count: number;
}

const VACANCY_COLOR: Record<string, string> = {
  낮음: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  보통: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  높음: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  "데이터 부족": "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function SupplyVacancyTab({
  evidence,
  summary,
  competitionByCategory,
}: {
  evidence: EvidenceCardData | null;
  summary: SupplyVacancySummary | null;
  competitionByCategory: CommercialCategorySummary[] | null;
}) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">
          공급·공실 자료 부족
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {evidence && <EvidenceCard evidence={evidence} />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>공실위험</CardTitle>
          <div className="flex gap-1">
            <Badge className={VACANCY_COLOR[summary.vacancyLevel]}>{summary.vacancyLevel}</Badge>
            <EvidenceTypeBadge type="PROXY" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">근거: {summary.vacancyProxyFactors.join(" · ")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>신규 공급 예정 ({summary.supplyItems.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.supplyItems.length === 0 ? (
            <p className="text-sm text-slate-500">반경 내 확인된 신규 공급 계획이 없습니다.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.supplyItems.map((s) => (
                <li key={s.id} className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.category} · {s.distanceMeters}m · {s.expectedCompletionYear}년 완공예정 ·{" "}
                    {s.scale} · {s.stage}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {competitionByCategory && (
        <Card>
          <CardHeader>
            <CardTitle>경쟁업종 밀집도 (반경 내 업종별 점포수)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-slate-400">
              ⑨ 상권 탭의 점포수 데이터를 재사용한 참고값입니다. 특정 업종 선택 필터는 아직
              미구현입니다.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {competitionByCategory.slice(0, 6).map((c) => (
                <div key={c.category} className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-900">
                  <p className="text-slate-500">{c.category}</p>
                  <p className="font-bold">{c.count}개</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
