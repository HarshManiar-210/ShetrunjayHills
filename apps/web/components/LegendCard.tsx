"use client";

import { useState } from "react";
import { ListTree, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayerSwatch } from "@/components/LayerSwatch";
import type { LayerFeature } from "@/lib/layers-api";

export function LegendCard({
  layers,
  className,
}: {
  layers: LayerFeature[];
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (layers.length === 0) return null;

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
            <div key={feature.properties.id} className="flex items-center gap-2 text-sm">
              <LayerSwatch feature={feature} />
              <span className="capitalize">{feature.properties.name.replace(/_/g, " ")}</span>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
