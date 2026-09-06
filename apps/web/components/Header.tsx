"use client";

import { Menu, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex items-center gap-2 border-b border-border bg-card p-3">
      <Button
        variant="ghost"
        size="icon"
        className="xl:hidden"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Menu />
      </Button>

      <div className="flex min-w-0 items-center gap-2">
        <Mountain className="size-6 shrink-0 text-primary" strokeWidth={1.75} />
        <p className="truncate text-sm font-semibold leading-tight">
          Shetrunjay Hills
        </p>
      </div>
    </header>
  );
}
