"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button className="no-print" onClick={() => window.print()}>
      인쇄 / PDF로 저장
    </Button>
  );
}
