"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PropertyForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuction, setIsAuction] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: form.get("name"),
      address: form.get("address"),
      propertyType: form.get("propertyType"),
      buildingName: form.get("buildingName") || undefined,
      dongHo: form.get("dongHo") || undefined,
      floor: form.get("floor") || undefined,
      exclusiveArea: form.get("exclusiveArea") || undefined,
      contractArea: form.get("contractArea") || undefined,
      landArea: form.get("landArea") || undefined,
      builtYear: form.get("builtYear") || undefined,
      direction: form.get("direction") || undefined,
      parking: form.get("parking") || undefined,
      appraisalPrice: toWon(form.get("appraisalPriceEok")),
      askingPrice: toWon(form.get("askingPriceEok")),
      memo: form.get("memo") || undefined,
      isAuction,
    };

    if (isAuction) {
      payload.auction = {
        caseNumber: form.get("caseNumber"),
        court: form.get("court"),
        appraisalPrice: toWon(form.get("auctionAppraisalPriceEok")),
        minimumSalePrice: toWon(form.get("minimumSalePriceEok")),
        failedBidCount: form.get("failedBidCount") || undefined,
        saleDate: form.get("saleDate") || undefined,
      };
    }

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "등록에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    const { property } = await res.json();
    router.push(`/properties/${property.id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>직접입력</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="관리용 물건명 *">
                  <input name="name" required className={inputCls} placeholder="예: 광교 아파트 A" />
                </Field>
                <Field label="물건종류 *">
                  <select name="propertyType" required className={inputCls} defaultValue="apartment">
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PROPERTY_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="주소 *">
                <input
                  name="address"
                  required
                  className={inputCls}
                  placeholder="예: 경기 수원시 영통구 광교중앙로 100"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="건물명">
                  <input name="buildingName" className={inputCls} />
                </Field>
                <Field label="동/호">
                  <input name="dongHo" className={inputCls} />
                </Field>
                <Field label="층">
                  <input name="floor" type="number" className={inputCls} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="전용면적(㎡)">
                  <input name="exclusiveArea" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="계약면적(㎡)">
                  <input name="contractArea" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="대지면적(㎡)">
                  <input name="landArea" type="number" step="0.01" className={inputCls} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="준공연도">
                  <input name="builtYear" type="number" className={inputCls} />
                </Field>
                <Field label="방향">
                  <input name="direction" className={inputCls} placeholder="남향" />
                </Field>
                <Field label="주차">
                  <input name="parking" className={inputCls} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="감정가(억원)">
                  <input name="appraisalPriceEok" type="number" step="0.01" className={inputCls} />
                </Field>
                <Field label="매매/희망가(억원)">
                  <input name="askingPriceEok" type="number" step="0.01" className={inputCls} />
                </Field>
              </div>

              <Field label="메모">
                <textarea name="memo" rows={2} className={inputCls} />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isAuction}
                  onChange={(e) => setIsAuction(e.target.checked)}
                />
                경매물건입니다
              </label>

              {isAuction && (
                <div className="space-y-4 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="사건번호 *">
                      <input name="caseNumber" required={isAuction} className={inputCls} />
                    </Field>
                    <Field label="법원 *">
                      <input name="court" required={isAuction} className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="감정가(억원)">
                      <input name="auctionAppraisalPriceEok" type="number" step="0.01" className={inputCls} />
                    </Field>
                    <Field label="최저매각가격(억원)">
                      <input name="minimumSalePriceEok" type="number" step="0.01" className={inputCls} />
                    </Field>
                    <Field label="유찰횟수">
                      <input name="failedBidCount" type="number" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="매각기일">
                    <input name="saleDate" type="date" className={inputCls} />
                  </Field>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" disabled={submitting}>
                {submitting ? "등록 중..." : "물건 등록하고 분석 시작"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <PlaceholderInputMethod
          title="화면 캡처 (AI Vision)"
          description="경매/부동산 사이트 캡처에서 주소·면적·감정가 등을 후보로 추출 후 사용자 승인 화면에서 확인합니다."
        />
        <PlaceholderInputMethod
          title="텍스트 붙여넣기"
          description="매물 설명 텍스트를 붙여넣으면 후보 필드를 추출합니다."
        />
        <PlaceholderInputMethod
          title="PDF 업로드"
          description="감정평가서 등에서 입지 관련 정보를 후보로 추출합니다."
        />
        <PlaceholderInputMethod
          title="URL"
          description="공개 접근 가능한 범위에서만 사용합니다."
        />
      </div>
    </div>
  );
}

function PlaceholderInputMethod({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="opacity-70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        <p className="mt-2 text-xs font-semibold text-amber-600">Phase 2+ 구현 예정 (현재 미구현)</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800";

function toWon(eokValue: FormDataEntryValue | null): number | undefined {
  if (!eokValue) return undefined;
  const n = Number(eokValue);
  if (Number.isNaN(n)) return undefined;
  return Math.round(n * 100_000_000);
}
