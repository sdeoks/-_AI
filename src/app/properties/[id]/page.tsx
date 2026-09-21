import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { runAnalysisForProperty } from "@/lib/analysis/runAnalysis";
import { PropertyDashboard } from "@/components/dashboard/PropertyDashboard";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: { auctionInfo: true },
  });
  if (!property) notFound();

  const existingEvidence = await prisma.evidence.count({ where: { propertyId: id } });
  let analysisError: string | null = null;
  if (existingEvidence === 0) {
    try {
      await runAnalysisForProperty(id);
    } catch (err) {
      analysisError = (err as Error).message;
    }
  }

  const [evidences, comparableCases, snapshots, aiReport] = await Promise.all([
    prisma.evidence.findMany({
      where: { propertyId: id },
      include: { rawDataRecords: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.comparableCase.findMany({
      where: { propertyId: id },
      orderBy: { similarityScore: "desc" },
    }),
    prisma.analysisSnapshot.findMany({ where: { propertyId: id } }),
    prisma.aIReport.findFirst({
      where: { propertyId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PropertyDashboard
      property={property}
      evidences={evidences}
      comparableCases={comparableCases}
      snapshots={snapshots}
      aiReport={aiReport ? { ...aiReport, sections: JSON.parse(aiReport.sectionsJson) } : null}
      analysisError={analysisError}
    />
  );
}
