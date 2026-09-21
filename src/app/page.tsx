import Link from "next/link";
import { prisma } from "@/lib/db";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatWon, formatDateKST } from "@/lib/utils";
import { DemoButton } from "./DemoButton";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "사백나나 입지랩 AI";

export const dynamic = "force-dynamic";

export default async function Home() {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          현장 가기 전, 손품으로 보는 부동산의 모든 것 — 모든 숫자에는 출처·기간·N이 따라붙습니다.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/properties/new">
            <Button>+ 새 물건 등록</Button>
          </Link>
          <DemoButton />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">등록된 물건</h2>
        {properties.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              등록된 물건이 없습니다. 위 버튼으로 새 물건을 등록하거나 데모 물건을 불러오세요.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {properties.map((p) => (
              <Link key={p.id} href={`/properties/${p.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle>{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500">{p.address}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{PROPERTY_TYPE_LABELS[p.propertyType as PropertyType]}</span>
                      {p.exclusiveArea && <span>· 전용 {p.exclusiveArea}㎡</span>}
                      {p.askingPrice && <span>· {formatWon(p.askingPrice)}</span>}
                      <span>· 등록 {formatDateKST(p.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
