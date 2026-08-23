"use client";

import { useState } from "react";
import { MoreVertical, RotateCcw, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayerSwatch } from "@/components/LayerSwatch";
import { cn } from "@/lib/utils";
import type { LayerFeature } from "@/lib/layers-api";

export function LayerPanel({
  layers,
  loading,
  error,
  visibility,
  onToggle,
  onRetry,
  bare = false,
  className,
}: {
  layers: LayerFeature[] | null;
  loading: boolean;
  error: boolean;
  visibility: Record<number, boolean>;
  onToggle: (id: number) => void;
  onRetry: () => void;
  bare?: boolean;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const rows = (
    <>
      {loading && (
        <div className="flex flex-col gap-2 py-1" aria-label="Loading layers">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-2 py-2">
          <p className="text-sm text-destructive">Could not load layers.</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && layers?.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          No layers are available for your role.
        </p>
      )}

      {!loading &&
        !error &&
        layers?.map((feature) => {
          const { id, name } = feature.properties;
          return (
            <div
              key={id}
              className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-muted"
            >
              <LayerSwatch feature={feature} />
              <span className="flex-1 truncate text-sm capitalize">
                {name.replace(/_/g, " ")}
              </span>
              <Switch
                size="sm"
                checked={visibility[id] ?? true}
                onCheckedChange={() => onToggle(id)}
                aria-label={`Toggle ${name} layer`}
              />
            </div>
          );
        })}
    </>
  );

  if (bare) {
    return (
      <div className={cn("flex shrink-0 flex-col", className)}>
        <div className="flex items-center justify-between p-4 pb-2">
          <span className="font-heading text-base font-medium">Layers</span>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Layer panel options">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onRetry}>
                  <RotateCcw />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={collapsed ? "Expand layers panel" : "Collapse layers panel"}
              onClick={() => setCollapsed((c) => !c)}
            >
              <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
            </Button>
          </div>
        </div>
        {!collapsed && (
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto scrollbar-thin px-4 pb-4">{rows}</div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Layers</CardTitle>
        <CardAction className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Layer panel options"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onRetry}>
                <RotateCcw />
                Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand layers panel" : "Collapse layers panel"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
          </Button>
        </CardAction>
      </CardHeader>
      {!collapsed && (
        <CardContent className="flex max-h-64 flex-col gap-1 overflow-y-auto scrollbar-thin">{rows}</CardContent>
      )}
    </Card>
  );
}
