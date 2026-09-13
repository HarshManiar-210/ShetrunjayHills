"use client";

import { useState } from "react";
import { ChevronDown, ListTree, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LegendContent, type LegendOverlay, type LegendRasterLayer } from "@/components/LegendCard";
import { StatsPanel, type StatsRasterLayer } from "@/components/StatsPanel";
import { cn } from "@/lib/utils";
import type { LayerFeature } from "@/lib/layers-api";

/**
 * The map's floating info card: Legend and Statistics for whatever is
 * currently switched on, as two tabs of one panel rather than two competing
 * overlays. Rendered floating over the map on desktop and inside the bottom
 * sheet on mobile — the caller supplies the positioning and the height cap.
 *
 * It stays on screen even with nothing switched on: each tab then shows its
 * own empty state, so the panel is a stable, discoverable part of the UI (and
 * a stable target for the walkthrough) rather than something that only
 * materialises once you happen to toggle a layer.
 */
export function MapInfoPanel({
  layers,
  overlays = [],
  rasterLayers = [],
  statsRasterLayers = [],
  className,
}: {
  layers: LayerFeature[];
  overlays?: LegendOverlay[];
  rasterLayers?: LegendRasterLayer[];
  statsRasterLayers?: StatsRasterLayer[];
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card className={cn("shadow-e3", className)} size="sm" data-tour="info-panel">
      <Tabs defaultValue="legend" className="min-h-0 gap-(--card-spacing)">
        <div className="flex shrink-0 items-center gap-2 px-(--card-spacing)">
          <TabsList className="min-w-0 flex-1">
            <TabsTrigger value="legend">
              <ListTree strokeWidth={1.75} />
              Legend
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 strokeWidth={1.75} />
              Statistics
            </TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label={collapsed ? "Expand panel" : "Collapse panel"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
          </Button>
        </div>

        {/* Only the tab bodies scroll, so the tabs themselves stay reachable
            behind a long legend (Vegetation Change's 25-class matrix). */}
        {!collapsed && (
          <div className="min-h-0 flex-1 overflow-y-auto px-(--card-spacing) scrollbar-thin">
            <TabsContent value="legend">
              <LegendContent layers={layers} overlays={overlays} rasterLayers={rasterLayers} />
            </TabsContent>
            <TabsContent value="stats">
              <StatsPanel rasterLayers={statsRasterLayers} vectorFeatures={layers} />
            </TabsContent>
          </div>
        )}
      </Tabs>
    </Card>
  );
}
