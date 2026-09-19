"use client";

import { cn } from "@/lib/utils";
import { LayerSwatch, type SwatchGeometryKind } from "@/components/LayerSwatch";
import { legendFor } from "@/lib/legend-config";
import { geometryKindOf } from "@/lib/sections";
import type { LayerFeature } from "@/lib/layers-api";

// Many features can share one layer, so the legend lists one row per layer,
// not per feature.
function uniqueLayers(features: LayerFeature[]): LayerFeature[] {
  const seen = new Map<number, LayerFeature>();
  for (const feature of features) {
    if (!seen.has(feature.properties.id)) seen.set(feature.properties.id, feature);
  }
  return [...seen.values()];
}

// Above this many classes a single column gets too tall for the card.
const TWO_COLUMN_THRESHOLD = 8;

function isLong(legend: { classes: unknown[] }): boolean {
  return legend.classes.length > TWO_COLUMN_THRESHOLD;
}

export interface LegendRasterLayer {
  id: string;
  name: string;
  isPhotographic?: boolean;
}

/** A switched-on static overlay — it has a colour but no loaded geometry here. */
export interface LegendOverlay {
  key: string;
  label: string;
  color: string;
  geometryKind: SwatchGeometryKind;
}

/**
 * Legend body — swatch rows for the switched-on vector layers and overlays,
 * then a class list per switched-on raster section. Card chrome (header, tabs,
 * collapse) lives in components/MapInfoPanel.tsx, which is the only place this
 * renders.
 */
export function LegendContent({
  layers,
  overlays = [],
  rasterLayers = [],
  className,
}: {
  layers: LayerFeature[];
  overlays?: LegendOverlay[];
  rasterLayers?: LegendRasterLayer[];
  className?: string;
}) {
  const rows = uniqueLayers(layers);

  if (rows.length === 0 && overlays.length === 0 && rasterLayers.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No layers switched on yet — turn one on to see its legend.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {(rows.length > 0 || overlays.length > 0) && (
        <div className="flex flex-col gap-1.5">
          {rows.map((feature) => (
            <div key={feature.properties.id} className="flex items-center gap-2 text-sm">
              <LayerSwatch
                color={feature.properties.color}
                geometryKind={geometryKindOf(feature.geometry.type)}
              />
              <span>{feature.properties.name}</span>
            </div>
          ))}
          {overlays.map((overlay) => (
            <div key={overlay.key} className="flex items-center gap-2 text-sm">
              <LayerSwatch color={overlay.color} geometryKind={overlay.geometryKind} />
              <span>{overlay.label}</span>
            </div>
          ))}
        </div>
      )}

      {rasterLayers.map((raster) => {
        const legend = legendFor(raster.id);
        return (
          <div key={raster.id} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{raster.name}</span>
            {raster.isPhotographic ? (
              <span className="text-xs text-muted-foreground/70 italic">
                Photographic image — no class legend
              </span>
            ) : (
              legend && (
                <div className="flex flex-col gap-1">
                  {/* Long class lists go two-up with their compact labels, so
                      the legend still fits without scrolling. */}
                  <div
                    className={cn(
                      "gap-x-2 gap-y-1",
                      isLong(legend) ? "grid grid-cols-2" : "flex flex-col",
                    )}
                  >
                    {legend.classes.map((cls) => (
                      <div key={cls.value} className="flex items-center gap-1.5 text-xs">
                        {/* A raster class is a solid block, per the brief —
                            the same shape LayerSwatch gives a filled polygon,
                            and deliberately not the dot a point layer gets. */}
                        <LayerSwatch color={cls.color} geometryKind="raster" />
                        <span className="truncate" title={cls.label}>
                          {isLong(legend) ? (cls.shortLabel ?? cls.label) : cls.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {legend.note && (
                    <span className="text-[10px] text-muted-foreground/70 italic">{legend.note}</span>
                  )}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
