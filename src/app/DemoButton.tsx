"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/demo", { method: "POST" });
    const { property } = await res.json();
    router.push(`/properties/${property.id}`);
  }

  return (
    <Button variant="secondary" onClick={handleClick} disabled={loading}>
      {loading ? "생성 중..." : "[DEMO] 광교 물건 불러오기"}
    </Button>
  );
}
