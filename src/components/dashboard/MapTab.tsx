"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MockBadge } from "@/components/ui/badge";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  similarityScore: number;
}

export function MapTab({
  centerLat,
  centerLng,
  pins,
}: {
  centerLat: number;
  centerLng: number;
  pins: MapPin[];
}) {
  const size = 480;
  const scale = 6000; // px per degree 근사 (실제 지도 타일 아님)

  function project(lat: number, lng: number) {
    const x = size / 2 + (lng - centerLng) * scale;
    const y = size / 2 - (lat - centerLat) * scale;
    return { x: clamp(x, 10, size - 10), y: clamp(y, 10, size - 10) };
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>지도 (대상물건 중심 상대위치)</CardTitle>
        <MockBadge />
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-amber-600">
          실제 지도 타일 Provider(VWorld/Kakao/Naver) API 키가 연결되지 않아, 좌표 기반 상대위치를
          단순화한 산점도로 표시합니다. 실서비스에서는 MapProvider Adapter로 교체됩니다.
        </p>
        <svg width={size} height={size} className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          {[100, 200, 300, 400].map((r) => (
            <circle
              key={r}
              cx={size / 2}
              cy={size / 2}
              r={r / 2}
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
            />
          ))}
          {pins.map((p) => {
            const { x, y } = project(p.lat, p.lng);
            const color =
              p.similarityScore >= 90
                ? "#059669"
                : p.similarityScore >= 80
                  ? "#0ea5e9"
                  : p.similarityScore >= 70
                    ? "#f59e0b"
                    : "#94a3b8";
            return (
              <g key={p.id}>
                <circle cx={x} cy={y} r={5} fill={color} />
                <title>{`${p.label} (유사도 ${p.similarityScore})`}</title>
              </g>
            );
          })}
          <circle cx={size / 2} cy={size / 2} r={8} fill="#111827" stroke="white" strokeWidth={2} />
        </svg>
        <p className="mt-2 text-xs text-slate-400">
          검정 점 = 대상물건 · 색상은 유사도(초록 90+, 파랑 80+, 주황 70+, 회색 그 외)
        </p>
      </CardContent>
    </Card>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
