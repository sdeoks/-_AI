import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceTypeBadge } from "@/components/ui/badge";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";

export interface LandBuildingSummary {
  building: {
    builtYear: number;
    mainUse: string;
    totalFloorArea: number;
    buildingCoverageRatio: number;
    floorAreaRatio: number;
    floors: number;
    parkingSpaces: number;
    elevators: number;
  };
  land: {
    useDistrict: string;
    useZone: string | null;
    landCategory: string;
    landArea: number;
    roadCondition: string;
    landUsePlanNote: string;
  };
  environmentItems: string[];
}

export function LandBuildingTab({
  buildingEvidence,
  environmentEvidence,
  summary,
}: {
  buildingEvidence: EvidenceCardData | null;
  environmentEvidence: EvidenceCardData | null;
  summary: LandBuildingSummary | null;
}) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-500">
          토지·건물 자료 부족
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {buildingEvidence && <EvidenceCard evidence={buildingEvidence} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>건물</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="준공" value={`${summary.building.builtYear}년`} />
            <Row label="주용도" value={summary.building.mainUse} />
            <Row label="연면적" value={`${summary.building.totalFloorArea.toLocaleString()}㎡`} />
            <Row label="건폐율" value={`${summary.building.buildingCoverageRatio}%`} />
            <Row label="용적률" value={`${summary.building.floorAreaRatio}%`} />
            <Row label="층수" value={`${summary.building.floors}층`} />
            <Row label="주차" value={`${summary.building.parkingSpaces}대`} />
            <Row label="승강기" value={`${summary.building.elevators}대`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>토지</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="용도지역" value={summary.land.useDistrict} />
            <Row label="용도지구" value={summary.land.useZone ?? "-"} />
            <Row label="지목" value={summary.land.landCategory} />
            <Row label="대지면적" value={`${summary.land.landArea.toLocaleString()}㎡`} />
            <Row label="도로" value={summary.land.roadCondition} />
            <Row label="토지이용계획" value={summary.land.landUsePlanNote} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>환경·위험</CardTitle>
          <EvidenceTypeBadge type="UNVERIFIED" />
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-slate-500">
            실제 공식 데이터가 없어 임의로 위험도를 추정하지 않고 전부 확인필요로 표시합니다.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summary.environmentItems.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-dashed border-slate-300 p-2 text-center text-xs text-slate-500 dark:border-slate-700"
              >
                <p>{item}</p>
                <p className="font-semibold text-slate-400">확인필요</p>
              </div>
            ))}
          </div>
          {environmentEvidence && (
            <p className="mt-2 text-xs text-slate-400">{environmentEvidence.limitations}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}
