import type { SwatchGeometryKind } from "@/components/LayerSwatch";
import { layerIdOf, sectionLayers, type SectionDef, type SectionLayer } from "@/lib/sections";

/**
 * Draw priority for the layers panel: the order its rows are listed in, top
 * to bottom, is the order the map stacks them in, top to bottom. Dragging a
 * row is how that order changes.
 *
 * Nothing here names a layer. A row's starting place comes from how it
 * draws, and after that only from where the user has dragged it.
 */

/** One selected layer, with the top-level group it was picked from. */
export interface PanelRow {
  layer: SectionLayer;
  /** The top-level group's label, shown as the row's caption. */
  group: string;
}

/** Every selected layer, in tree order. */
export function selectedRows(
  sections: SectionDef[],
  selected: Record<string, boolean>,
): PanelRow[] {
  return sections.flatMap((section) =>
    sectionLayers(section)
      .filter((layer) => selected[layer.key])
      .map((layer) => ({ layer, group: section.label })),
  );
}

// Lower draws higher. Small, sharp geometry goes above broad geometry that
// would otherwise bury it, and imagery — opaque over its whole extent —
// goes under all of it.
const KIND_RANK: Record<SwatchGeometryKind, number> = {
  point: 0,
  line: 1,
  "dotted-line": 1,
  "polygon-outline": 2,
  polygon: 3,
  raster: 4,
};
const RASTER_RANK = 5;
const RASTER_BELOW_RANK = 6;

function defaultRank(layer: SectionLayer): number {
  // A draw_below theme (the Toposheet) is a backdrop for other imagery.
  if (layer.raster) return layer.raster.drawBelow ? RASTER_BELOW_RANK : RASTER_RANK;
  if (layer.options) {
    const ranks = layer.options.filter((o) => !o.pending).map((o) => KIND_RANK[o.geometryKind]);
    return ranks.length > 0 ? Math.min(...ranks) : KIND_RANK.polygon;
  }
  return layer.geometryKind ? KIND_RANK[layer.geometryKind] : KIND_RANK.polygon;
}

/**
 * The panel's order, top first: the user's own arrangement, with anything
 * selected since slotted in where its kind belongs.
 *
 * Derived rather than stored in full, so selecting or deselecting a layer
 * needs no bookkeeping: `userOrder` is only ever what the last drag left, and
 * whatever it lacks is placed ahead of the first row that would draw beneath
 * it — which keeps a new boundary off the bottom of a stack of imagery
 * without disturbing a single row the user has placed.
 */
export function mergeOrder(rows: PanelRow[], userOrder: string[]): string[] {
  const rank = new Map(rows.map(({ layer }, i) => [layer.key, [defaultRank(layer), i]] as const));
  const before = (a: string, b: string) => {
    const [ra, ia] = rank.get(a)!;
    const [rb, ib] = rank.get(b)!;
    return ra !== rb ? ra < rb : ia < ib;
  };

  const order = userOrder.filter((key) => rank.has(key));
  const placed = new Set(order);
  const fresh = rows
    .map(({ layer }) => layer.key)
    .filter((key) => !placed.has(key))
    .sort((a, b) => (before(a, b) ? -1 : 1));

  for (const key of fresh) {
    const at = order.findIndex((other) => before(key, other));
    if (at === -1) order.push(key);
    else order.splice(at, 0, key);
  }
  return order;
}

/** The id the map gives a raster theme's second, compared year. */
export function compareRasterId(sectionId: string): string {
  return `${sectionId}:compare`;
}

/**
 * What one panel row puts on the map, bottom to top within the row: its
 * raster layers (by RasterOverlay id), then its vector overlays (by overlay
 * key) — a raster theme's own vector rows sit on its imagery.
 */
export interface MapStackEntry {
  rasters: string[];
  overlays: string[];
}

/**
 * The map's stack, top first, one entry per panel row.
 *
 * A permissioned `layers` row contributes nothing: those share one set of
 * MapLibre layers between them, so they cannot be restacked one by one and
 * stay above the ordered overlays.
 */
export function mapStack(order: string[], rows: PanelRow[]): MapStackEntry[] {
  const byKey = new Map(rows.map(({ layer }) => [layer.key, layer]));
  return order.flatMap((key) => {
    const layer = byKey.get(key);
    if (!layer) return [];
    if (layer.raster) {
      const id = layer.raster.id;
      return [
        { rasters: [id, compareRasterId(id)], overlays: layer.raster.items.map((i) => i.key) },
      ];
    }
    if (layer.options) return [{ rasters: [], overlays: layer.options.map((o) => o.key) }];
    if (layerIdOf(key) !== null) return [];
    return [{ rasters: [], overlays: [key] }];
  });
}
