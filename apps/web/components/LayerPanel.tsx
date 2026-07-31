"use client";

import { Lock, MoreVertical, RotateCcw, Maximize2 } from "lucide-react";
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
import type { LayerFeature } from "@/lib/layers-api";

export function LayerPanel({
  layers,
  loading,
  error,
  locked,
  visibility,
  onToggle,
  onZoomTo,
  onRetry,
  onLoginClick,
  className,
}: {
  layers: LayerFeature[] | null;
  loading: boolean;
  error: boolean;
  locked: boolean;
  visibility: Record<number, boolean>;
  onToggle: (id: number) => void;
  onZoomTo: (feature: LayerFeature) => void;
  onRetry: () => void;
  onLoginClick: () => void;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Layers</CardTitle>
        <CardAction>
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
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {locked && (
          <div className="flex flex-col items-start gap-2 py-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" strokeWidth={1.75} />
              Log in to view available layers.
            </p>
            <Button size="sm" onClick={onLoginClick}>
              Log in
            </Button>
          </div>
        )}

        {!locked && loading && (
          <div className="flex flex-col gap-2 py-1" aria-label="Loading layers">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-6 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {!locked && !loading && error && (
          <div className="flex flex-col items-start gap-2 py-2">
            <p className="text-sm text-destructive">Could not load layers.</p>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!locked &&
          !loading &&
          !error &&
          layers?.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">
              No layers are available for your role.
            </p>
          )}

        {!locked &&
          !loading &&
          !error &&
          layers?.map((feature) => {
            const { id, name } = feature.properties;
            return (
              <div
                key={id}
                className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-muted"
              >
                <Switch
                  size="sm"
                  checked={visibility[id] ?? true}
                  onCheckedChange={() => onToggle(id)}
                  aria-label={`Toggle ${name} layer`}
                />
                <LayerSwatch feature={feature} />
                <span className="flex-1 truncate text-sm capitalize">
                  {name.replace(/_/g, " ")}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${name} layer options`}
                    >
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onZoomTo(feature)}>
                      <Maximize2 />
                      Zoom to layer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
