import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAnalysisForProperty } from "@/lib/analysis/runAnalysis";

export async function GET(
  _request: Request,
  context: { params: Promise<{ propertyId: string }> },
) {
  const { propertyId } = await context.params;

  const existing = await prisma.evidence.findFirst({ where: { propertyId } });
  if (!existing) {
    try {
      await runAnalysisForProperty(propertyId);
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(await loadAnalysisPayload(propertyId));
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ propertyId: string }> },
) {
  const { propertyId } = await context.params;
  try {
    await runAnalysisForProperty(propertyId);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  return NextResponse.json(await loadAnalysisPayload(propertyId));
}

async function loadAnalysisPayload(propertyId: string) {
  const [evidences, comparableCases, snapshots, aiReport] = await Promise.all([
    prisma.evidence.findMany({
      where: { propertyId },
      include: { rawDataRecords: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.comparableCase.findMany({
      where: { propertyId },
      orderBy: { similarityScore: "desc" },
    }),
    prisma.analysisSnapshot.findMany({ where: { propertyId } }),
    prisma.aIReport.findFirst({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    evidences,
    comparableCases,
    snapshots,
    aiReport: aiReport
      ? { ...aiReport, sections: JSON.parse(aiReport.sectionsJson) }
      : null,
  };
}
