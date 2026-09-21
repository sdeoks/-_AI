import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getGeocodeAdapter } from "@/lib/geocode";
import { createPropertySchema } from "@/lib/validation/property";

export async function GET() {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "desc" },
    include: { auctionInfo: true },
  });
  return NextResponse.json({ properties });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const geocoder = getGeocodeAdapter();
  const geo = await geocoder.geocode(input.address);

  const property = await prisma.property.create({
    data: {
      name: input.name,
      address: input.address,
      lat: geo.confidence === "failed" ? null : geo.lat,
      lng: geo.confidence === "failed" ? null : geo.lng,
      geocodeSourceProvider: geo.provider,
      geocodeConfidence: geo.confidence,
      buildingName: input.buildingName,
      dongHo: input.dongHo,
      propertyType: input.propertyType,
      floor: input.floor,
      exclusiveArea: input.exclusiveArea,
      contractArea: input.contractArea,
      landArea: input.landArea,
      builtYear: input.builtYear,
      direction: input.direction,
      parking: input.parking,
      appraisalPrice: input.appraisalPrice,
      askingPrice: input.askingPrice,
      memo: input.memo,
      isAuction: input.isAuction ?? false,
      auctionInfo: input.auction
        ? {
            create: {
              caseNumber: input.auction.caseNumber,
              court: input.auction.court,
              appraisalPrice: input.auction.appraisalPrice,
              minimumSalePrice: input.auction.minimumSalePrice,
              failedBidCount: input.auction.failedBidCount,
              saleDate: input.auction.saleDate
                ? new Date(input.auction.saleDate)
                : undefined,
            },
          }
        : undefined,
    },
    include: { auctionInfo: true },
  });

  return NextResponse.json({ property }, { status: 201 });
}
