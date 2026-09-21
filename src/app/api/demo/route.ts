import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getGeocodeAdapter } from "@/lib/geocode";

// 광교 실무 데모 물건 (§65~66). 모든 값은 [DEMO]로, 실제 시세와 무관하다.
export async function POST() {
  const address = "경기 수원시 영통구 광교중앙로 100 (광교 데모)";
  const geocoder = getGeocodeAdapter();
  const geo = await geocoder.geocode(address);

  const property = await prisma.property.create({
    data: {
      name: "[DEMO] 광교 힐스테이트 광교산 84㎡",
      address,
      lat: geo.lat,
      lng: geo.lng,
      geocodeSourceProvider: geo.provider,
      geocodeConfidence: geo.confidence,
      buildingName: "힐스테이트 광교산(가상)",
      dongHo: "103동 1204호",
      propertyType: "apartment",
      floor: 12,
      exclusiveArea: 84.93,
      contractArea: 109.5,
      builtYear: 2018,
      direction: "남동향",
      parking: "세대당 1.2대",
      appraisalPrice: 1_250_000_000,
      askingPrice: 1_230_000_000,
      memo: "MVP 데모용 가상 물건입니다. 실제 매물이 아닙니다.",
      isAuction: false,
    },
  });

  return NextResponse.json({ property }, { status: 201 });
}
