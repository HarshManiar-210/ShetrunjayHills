"use client";

import { useState } from "react";
import { TreePine, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { THEMES } from "@/lib/themes";

export function ThemeFilterPanel({
  selectedTheme,
  onSelectTheme,
  bare = false,
  className,
}: {
  selectedTheme: string | null;
  onSelectTheme: (key: string | null) => void;
  bare?: boolean;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const list = (
    <div className="flex flex-col gap-1">
      {THEMES.map((theme) => {
        const active = selectedTheme === theme.key;
        return (
          <button
            key={theme.key}
            type="button"
            disabled={!theme.enabled}
            onClick={() => onSelectTheme(active ? null : theme.key)}
            className={cn(
              "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
              theme.enabled ? "hover:bg-muted" : "cursor-not-allowed text-muted-foreground/60",
              active && "bg-primary/10 font-medium text-primary",
            )}
          >
            {theme.label}
            {!theme.enabled && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Soon
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );

  if (bare) {
    return (
      <div className={cn("flex shrink-0 flex-col", className)}>
        <div className="flex items-center justify-between p-4 pb-2">
          <span className="flex items-center gap-2 font-heading text-base font-medium">
            <TreePine className="size-4 text-muted-foreground" strokeWidth={1.75} />
            Themes
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand themes panel" : "Collapse themes panel"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
          </Button>
        </div>
        {!collapsed && (
          <div className="max-h-64 overflow-y-auto scrollbar-thin px-4 pb-4">{list}</div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TreePine className="size-4 text-muted-foreground" strokeWidth={1.75} />
          Themes
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand themes panel" : "Collapse themes panel"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
          </Button>
        </CardAction>
      </CardHeader>

      {!collapsed && (
        <CardContent className="flex max-h-64 flex-col gap-1 overflow-y-auto scrollbar-thin">{list}</CardContent>
      )}
    </Card>
  );
}
