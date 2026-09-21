import { mockTransportProvider } from "@/lib/providers/mock/transport";
import { createEvidence } from "@/lib/evidence/build";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runTransportDomain(ctx: DomainContext): Promise<DomainResult> {
  const result = await mockTransportProvider.fetch({
    seed: ctx.seed,
    addressLabel: ctx.property.address,
  });
  if (!result.ok || !result.data) {
    return unavailableResult("TRANSPORT", result.error?.message ?? "unknown");
  }
  const d = result.data;

  const evidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "TRANSPORT_NEAREST",
    metricLabel: "가장 가까운 지하철역",
    metricValue: d.nearestSubway ? String(d.nearestSubway.distanceMeters) : "미확인",
    metricUnit: d.nearestSubway ? "m" : undefined,
    input: result.evidence!,
    rawRecords: [
      ...(d.nearestSubway
        ? [
            {
              label: `${d.nearestSubway.name}(${d.nearestSubway.lineNames.join(",")}) ${d.nearestSubway.distanceMeters}m`,
              payload: d.nearestSubway,
            },
          ]
        : []),
      ...d.nearestBusStops.map((b) => ({
        label: `${b.name} ${b.distanceMeters}m`,
        payload: b,
      })),
      ...d.poiList.map((p) => ({
        label: `[${p.category}] ${p.name} ${p.distanceMeters}m`,
        payload: p,
      })),
    ],
  });

  return {
    tabKey: "TRANSPORT",
    status: "OK",
    completionRate: 100,
    evidenceIds: [evidence.id],
    headlineEvidenceId: evidence.id,
    summary: d,
  };
}
