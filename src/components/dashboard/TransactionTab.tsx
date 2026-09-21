"use client";

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceCard, type EvidenceCardData } from "./EvidenceCard";
import { formatWon } from "@/lib/utils";

export function TransactionTab({
  evidence,
  points,
}: {
  evidence: EvidenceCardData | null;
  points: { date: string; priceAmount: number; exclusiveArea: number }[];
}) {
  const chartData = points.map((p) => ({
    x: new Date(p.date).getTime(),
    y: p.priceAmount,
    area: p.exclusiveArea,
  }));

  return (
    <div className="space-y-4">
      {evidence && <EvidenceCard evidence={evidence} />}
      <Card>
        <CardHeader>
          <CardTitle>거래 시점별 가격 분포</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500">거래 자료 부족</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => new Date(v).toISOString().slice(0, 7)}
                  name="거래일"
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  tickFormatter={(v) => formatWon(v)}
                  name="거래금액"
                  width={80}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === "y" ? formatWon(Number(value)) : String(value)
                  }
                  labelFormatter={(v) => new Date(Number(v)).toISOString().slice(0, 10)}
                />
                <Scatter data={chartData} fill="#0ea5e9" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
