import { mockResidentialBackupProvider } from "@/lib/providers/mock/residentialBackup";
import { createEvidence } from "@/lib/evidence/build";
import { ANALYSIS_RADIUS_DEFAULTS_METERS } from "@/lib/enums";
import type { DomainContext, DomainResult } from "./types";
import { unavailableResult } from "./types";

export async function runResidentialBackupDomain(
  ctx: DomainContext,
): Promise<DomainResult> {
  const radiusMeters = ANALYSIS_RADIUS_DEFAULTS_METERS.residentialBackup;
  const result = await mockResidentialBackupProvider.fetch({
    seed: ctx.seed,
    radiusMeters,
  });
  if (!result.ok || !result.data) {
    return unavailableResult("RESIDENTIAL_BACKUP", result.error?.message ?? "unknown");
  }
  const d = result.data;

  const evidence = await createEvidence({
    propertyId: ctx.propertyId,
    analysisCategory: "RESIDENTIAL_BACKUP_HOUSEHOLDS",
    metricLabel: "배후 공동주택 확인세대수",
    metricValue: String(d.confirmedHouseholds),
    metricUnit: "세대",
    input: {
      ...result.evidence!,
      limitations: `${result.evidence!.limitations ?? ""} 세대수 미확인 단지 ${d.unconfirmedComplexCount}개.`,
    },
    rawRecords: d.complexes.map((c) => ({
      label: `${c.name} · ${c.distanceMeters}m · ${c.households != null ? `${c.households.toLocaleString()}세대` : "세대수 미확인"}`,
      payload: c,
    })),
  });

  return {
    tabKey: "RESIDENTIAL_BACKUP",
    status: "OK",
    completionRate: 100,
    evidenceIds: [evidence.id],
    headlineEvidenceId: evidence.id,
    summary: d,
  };
}
