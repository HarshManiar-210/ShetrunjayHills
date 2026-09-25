import { API_URL } from "@/lib/layers-api";
import { legendFor, type LegendClass } from "@/lib/legend-config";

/**
 * Real class areas for a raster theme, measured by the API.
 *
 * The server counts pixels and converts them to ground area; it deliberately
 * does not know what any colour means. Naming the classes happens here,
 * because the palettes belong to the legend — which is also what keeps the
 * chart's colours identical to the map's.
 */

export interface RasterClassStat {
  /** Upper-case "#RRGGBB", straight off the imagery. */
  color: string;
  pixels: number;
  area_sq_m: number;
  /** Share of the raster's opaque pixels, 0..1. */
  share: number;
}

export interface RasterStats {
  width: number;
  height: number;
  opaque_pixels: number;
  distinct_colors: number;
  /** Too many colours to be classes — an orthomosaic or FCC composite. */
  photographic: boolean;
  /** Ground area of the opaque pixels: the footprint, not the bounding box. */
  area_sq_m: number;
  classes: RasterClassStat[] | null;
}

export async function fetchRasterStats(overlayKey: string): Promise<RasterStats> {
  const res = await fetch(`${API_URL}/api/overlays/${overlayKey}/stats`);
  if (!res.ok) throw new Error(`failed to load statistics for ${overlayKey}`);
  return res.json();
}

/** A measured colour, named against the theme's legend. */
export interface NamedClassStat {
  key: string;
  label: string;
  /** The colour as it appears on the map — matched, not the legend's nominal value. */
  color: string;
  areaSqM: number;
  share: number;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function squaredDistance(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/**
 * Beyond this a measured colour is not the legend's class, just the nearest
 * one. ~45 per channel — comfortably wider than the rounding between a
 * transcribed palette and the imagery, and far narrower than the gap between
 * any two classes in these themes.
 */
const MATCH_TOLERANCE = 3 * 45 ** 2;

/**
 * Names each measured colour against the theme's legend.
 *
 * Matching is nearest-colour rather than exact: the palettes were transcribed
 * from the client's colour documents and can sit a shade off the imagery.
 * These rasters are cleanly quantised (five colours for Forest Cover, LULC and
 * Fragmentation), so nearest-match is unambiguous. A colour with no class
 * within tolerance is kept and labelled by its hex rather than dropped —
 * silently discarding pixels would make the shares lie.
 */
export function nameClasses(
  themeId: string,
  measured: RasterClassStat[],
  imageKey?: string,
): NamedClassStat[] {
  const legend = legendFor(themeId, imageKey);
  const palette: { cls: LegendClass; rgb: [number, number, number] }[] = [];
  for (const cls of legend?.classes ?? []) {
    const rgb = parseHex(cls.color);
    if (rgb) palette.push({ cls, rgb });
  }

  const named = measured.map((stat): NamedClassStat => {
    const rgb = parseHex(stat.color);
    let best: { cls: LegendClass; distance: number } | null = null;
    if (rgb) {
      for (const entry of palette) {
        const distance = squaredDistance(rgb, entry.rgb);
        if (!best || distance < best.distance) best = { cls: entry.cls, distance };
      }
    }

    if (best && best.distance <= MATCH_TOLERANCE) {
      return {
        key: String(best.cls.value),
        label: best.cls.label,
        // The imagery's own colour, so the chart keys to what is on screen
        // even where the transcribed palette differs by a shade.
        color: stat.color,
        areaSqM: stat.area_sq_m,
        share: stat.share,
      };
    }

    return {
      key: stat.color,
      label: `Unclassified ${stat.color}`,
      color: stat.color,
      areaSqM: stat.area_sq_m,
      share: stat.share,
    };
  });

  // Two measured colours can land on one class (a palette with near-duplicate
  // entries, or a stray anti-aliased shade); fold them together so the table
  // has one row per class and the shares still sum correctly.
  const merged = new globalThis.Map<string, NamedClassStat>();
  for (const stat of named) {
    const existing = merged.get(stat.key);
    if (existing) {
      existing.areaSqM += stat.areaSqM;
      existing.share += stat.share;
    } else {
      merged.set(stat.key, { ...stat });
    }
  }

  return [...merged.values()].sort((a, b) => b.share - a.share);
}
