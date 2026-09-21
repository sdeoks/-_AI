import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NotImplementedTab({
  title,
  candidateSources,
}: {
  title: string;
  candidateSources: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          아직 이 분석 항목의 공식 데이터 Provider가 연결되지 않았습니다. 카드를 숨기지 않고
          상태를 정직하게 표시합니다.
        </p>
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          데이터 연결 안 됨 · Phase 2~4 구현 예정
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-500">검토 중인 후보 출처</p>
          <ul className="list-inside list-disc text-xs text-slate-500 dark:text-slate-400">
            {candidateSources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-400">
          자세한 데이터 확보 가능성은 <code>docs/DATA_MATRIX.md</code> 참고.
        </p>
      </CardContent>
    </Card>
  );
}
