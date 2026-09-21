"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  disabled?: boolean;
  content: ReactNode;
}

export function Tabs({
  items,
  defaultKey,
  activeKey,
  onChange,
}: {
  items: TabItem[];
  defaultKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
}) {
  const [internalActive, setInternalActive] = useState(defaultKey ?? items[0]?.key);
  const active = activeKey ?? internalActive;
  const activeItem = items.find((i) => i.key === active) ?? items[0];

  function setActive(key: string) {
    setInternalActive(key);
    onChange?.(key);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={cn(
              "rounded-t-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
              active === item.key
                ? "border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeItem?.content}</div>
    </div>
  );
}
