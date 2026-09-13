import {
  Trees,
  Droplets,
  Layers,
  LandPlot,
  Route,
  SquareDashed,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { OverlayMeta } from "@/lib/overlays-api";
import type { SwatchGeometryKind } from "@/components/LayerSwatch";

/**
 * The sidebar's sections, derived entirely from what the API returns — the
 * `section` column on `static_overlays`. Adding a layer or a whole section
 * stays a seed insert, never an edit here (CLAUDE.md's core invariant).
 *
 * The role-permissioned `layers` rows (roads, boundaries, species points,
 * …) aren't surfaced as a sidebar section — layerIdOf below is unreachable
 * dead-code protection kept only because MapDashboard's key-splitting logic
 * still checks for a `layer:` prefix that nothing currently produces.
 */

/** Subject colour for a section, resolved to the --sec-* tokens in globals.css. */
export type SectionAccent =
  | "forest"
  | "canopy"
  | "change"
  | "land"
  | "imagery"
  | "water"
  | "infra"
  | "fauna"
  | "carbon";

/** Toggle keys for the permissioned `layers` rows are prefixed to keep them
 *  apart from overlay keys in one flat per-section visibility map. */
const LAYER_PREFIX = "layer:";

export function layerIdOf(key: string): number | null {
  return key.startsWith(LAYER_PREFIX) ? Number(key.slice(LAYER_PREFIX.length)) : null;
}

export interface SectionItem {
  /** Stable toggle key: an overlay key, or `layer:<id>` for a `layers` row. */
  key: string;
  label: string;
  color: string;
  geometryKind: SwatchGeometryKind;
}

export interface RasterYear {
  /** Sort/selection identity — not always the same text as `label` (e.g. a transition range). */
  year: number;
  /** What the dropdown shows — a bare year for Forest Cover, a "start → end" range for a transition theme. */
  label: string;
  key: string;
  bounds: [[number, number], [number, number]];
}

// Most per-year raster labels are the bare year itself ("1989"). A theme
// whose label is a range ("1980 → 1989") isn't itself a sort key, so fall
// back to the trailing year baked into the row's key (see init.sql's
// vegetation_change_* keys) for ordering and default-year selection.
function yearOf(o: OverlayMeta): number {
  const direct = Number(o.label);
  if (!Number.isNaN(direct)) return direct;
  const trailing = o.key.match(/(\d{4})$/);
  return trailing ? Number(trailing[1]) : NaN;
}

export interface SectionDef {
  label: string;
  /** Slug of the label — the legend/statistics id for a raster section. */
  id: string;
  accent: SectionAccent;
  icon: LucideIcon;
  /**
   * layer — the section *is* one layer: a header switch, plus a year dropdown
   *         when the section's rows are per-year rasters.
   * multi — thin reference geometry meant to be drawn together.
   */
  mode: "layer" | "multi";
  items: SectionItem[];
  years: RasterYear[];
}

/**
 * Presentation only — icon and subject colour per section name. A section the
 * DB grows that isn't listed here still renders, on the fallback below; no
 * behaviour is gated on the name.
 */
const SECTION_STYLE: Record<string, { accent: SectionAccent; icon: LucideIcon }> = {
  "Forest Cover": { accent: "forest", icon: Trees },
  "Watershed Analysis": { accent: "water", icon: Droplets },
  "Base Layers": { accent: "infra", icon: Layers },
  LULC: { accent: "land", icon: LandPlot },
};

const DEFAULT_STYLE: { accent: SectionAccent; icon: LucideIcon } = {
  accent: "infra",
  icon: Layers,
};

const DEFAULT_OVERLAY_COLOR = "#6B7280";

export function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function iconForGeometry(kind: SwatchGeometryKind): LucideIcon {
  if (kind === "point") return MapPin;
  return kind === "line" ? Route : SquareDashed;
}

const POINT_TYPES = new Set(["Point", "MultiPoint"]);
const LINE_TYPES = new Set(["LineString", "MultiLineString"]);

export function geometryKindOf(type: string): SwatchGeometryKind {
  if (POINT_TYPES.has(type)) return "point";
  if (LINE_TYPES.has(type)) return "line";
  return "polygon";
}

function hasExtent(o: OverlayMeta): boolean {
  return o.min_lon != null && o.min_lat != null && o.max_lon != null && o.max_lat != null;
}

/**
 * Groups the API's overlay rows into sections, then appends the permissioned
 * `layers` rows as one more. Section order follows the API's own
 * `ORDER BY section, sort_order`, so re-ordering the sidebar is a seed change.
 */
export function buildSections(overlays: OverlayMeta[]): SectionDef[] {
  const bySection = new Map<string, OverlayMeta[]>();
  for (const overlay of overlays) {
    const rows = bySection.get(overlay.section) ?? [];
    rows.push(overlay);
    bySection.set(overlay.section, rows);
  }

  const sections: SectionDef[] = [];

  for (const [label, rows] of bySection) {
    const style = SECTION_STYLE[label] ?? DEFAULT_STYLE;
    const rasters = rows.filter((o) => o.asset_type === "raster" && hasExtent(o));

    // A section of per-year rasters is one layer with a year dropdown; only
    // one year's imagery can usefully show at a time.
    if (rasters.length > 0) {
      const years = rasters
        .map((o) => ({
          year: yearOf(o),
          label: o.label,
          key: o.key,
          bounds: [
            [o.min_lon!, o.min_lat!],
            [o.max_lon!, o.max_lat!],
          ] as [[number, number], [number, number]],
        }))
        .filter((y) => !Number.isNaN(y.year))
        .sort((a, b) => a.year - b.year);

      sections.push({ label, id: slugify(label), ...style, mode: "layer", items: [], years });
      continue;
    }

    sections.push({
      label,
      id: slugify(label),
      ...style,
      mode: "multi",
      years: [],
      items: rows.map((o) => ({
        key: o.key,
        label: o.label,
        color: o.color ?? DEFAULT_OVERLAY_COLOR,
        geometryKind: o.kind === "line" ? "line" : "polygon",
      })),
    });
  }

  return sections;
}
