import { prisma } from "@/lib/db";
import { computeConfidence } from "@/lib/confidence/score";
import type { EvidenceInput } from "@/lib/providers/types";

export interface RawRecordInput {
  label: string;
  payload: unknown;
  includedInCalculation?: boolean;
  isOutlierCandidate?: boolean;
}

export interface CreateEvidenceParams {
  propertyId: string;
  analysisCategory: string;
  metricLabel: string;
  metricValue: string;
  metricUnit?: string;
  input: EvidenceInput;
  avgSimilarity?: number;
  geographicUnitBroad?: boolean;
  rawRecords?: RawRecordInput[];
}

export async function createEvidence(params: CreateEvidenceParams) {
  const retrievedAt = new Date();
  const confidence = computeConfidence({
    evidenceType: params.input.evidenceType,
    asOfDate: params.input.asOfDate ?? null,
    dataPeriodEnd: params.input.dataPeriodEnd ?? null,
    usedSampleCount: params.input.usedSampleCount ?? null,
    avgSimilarity: params.avgSimilarity ?? null,
    isMock: params.input.isMock,
    geographicUnitBroad: params.geographicUnitBroad ?? false,
  });

  return prisma.evidence.create({
    data: {
      propertyId: params.propertyId,
      analysisCategory: params.analysisCategory,
      metricLabel: params.metricLabel,
      metricValue: params.metricValue,
      metricUnit: params.metricUnit,
      sourceOrganization: params.input.sourceOrganization,
      sourceDataset: params.input.sourceDataset,
      sourceUrl: params.input.sourceUrl,
      dataPeriodStart: params.input.dataPeriodStart,
      dataPeriodEnd: params.input.dataPeriodEnd,
      asOfDate: params.input.asOfDate,
      retrievedAt,
      geographicUnit: params.input.geographicUnit,
      radiusMeters: params.input.radiusMeters,
      rawSampleCount: params.input.rawSampleCount,
      excludedSampleCount: params.input.excludedSampleCount,
      usedSampleCount: params.input.usedSampleCount,
      filterDescription: params.input.filterDescription,
      calculationMethod: params.input.calculationMethod,
      evidenceType: params.input.evidenceType,
      confidenceScore: confidence.score,
      confidenceReason: confidence.reason,
      limitations: params.input.limitations,
      isMock: params.input.isMock,
      rawDataRecords: params.rawRecords
        ? {
            create: params.rawRecords.map((r) => ({
              label: r.label,
              payload: JSON.stringify(r.payload),
              includedInCalculation: r.includedInCalculation ?? true,
              isOutlierCandidate: r.isOutlierCandidate ?? false,
            })),
          }
        : undefined,
    },
    include: { rawDataRecords: true },
  });
}
