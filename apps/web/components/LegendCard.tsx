"use client";

import { useState } from "react";
import { ListTree, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayerSwatch } from "@/components/LayerSwatch";
import type { LayerFeature } from "@/lib/layers-api";
import type { OverlayDef } from "@/lib/static-overlays";

function OverlaySwatch({ kind, color }: { kind: OverlayDef["kind"]; color: string }) {
  if (kind === "fill") {
    return <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
  }
  return <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}

export function LegendCard({
  layers,
  sectionLegend,
  className,
}: {
  layers: LayerFeature[];
  sectionLegend?: { title: string; items: OverlayDef[] } | null;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (layers.length === 0 && !sectionLegend) return null;

  return (
    <Card className={className} size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTree className="size-4 text-muted-foreground" strokeWidth={1.75} />
          Legend
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand legend" : "Collapse legend"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
          </Button>
        </CardAction>
      </CardHeader>
      {!collapsed && (
        <CardContent className="flex max-h-40 flex-col gap-1.5 overflow-y-auto scrollbar-thin">
          {layers.map((feature) => (
            <div key={feature.properties.id} className="flex items-center gap-3 text-sm">
              <LayerSwatch feature={feature} />
              <span className="capitalize">{feature.properties.name.replace(/_/g, " ")}</span>
            </div>
          ))}
          {sectionLegend && (
            <div className={layers.length > 0 ? "mt-1.5 border-t border-border pt-1.5 " : undefined}>
              <p className="px-0 pb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {sectionLegend.title}
              </p>

              <div className="space-y-2">
                {sectionLegend.items.map((item) => (
                  <div key={item.key} className="flex items-center gap-3 text-sm">
                    <OverlaySwatch kind={item.kind} color={item.color} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
