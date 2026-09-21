import {
  Trees,
  Droplets,
  Layers,
  LandPlot,
  Route,
  SquareDashed,
  MapPin,
  Map as MapIcon,
  Puzzle,
  Dam,
  Waypoints,
  Flame,
  Target,
  MapPinned,
  Image,
  Mountain,
  MountainSnow,
  TreePine,
  TrendingUp,
  Compass,
  Aperture,
  Gem,
  Layers3,
  Sprout,
  Leaf,
  Square,
  Zap,
  ScrollText,
  PawPrint,
  Ruler,
  Hash,
  Scale,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { LayerGroup, OverlayMeta } from "@/lib/overlays-api";
import type { SwatchGeometryKind } from "@/components/LayerSwatch";

/**
 * The sidebar's tree, assembled from two API lists: `layer_groups` (the
 * headings and their nesting) and `static_overlays` (the layers, each
 * pointing at one group). Both are seed rows, so adding a layer, renaming a
 * heading or restructuring the whole tree stays a data change — never an edit
 * here (CLAUDE.md's core invariant).
 *
 * A group whose rows are rasters is one layer with a year picker, not a list
 * of layers; that is why the seed gives each unrelated raster theme its own
 * group. A group can hold layers and child groups at once.
 */

/** Subject colour for a group, resolved to the --sec-* tokens in globals.css. */
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

/**
 * Visibility is one flat map of toggle key → on, covering every layer in the
 * sidebar at once (any number may be switched on). Three kinds of thing share
 * that namespace, so two of them are prefixed to keep them apart:
 *
 *   `<overlay key>`   a vector static overlay — the row's own key
 *   `raster:<group>`  a raster theme, keyed by its group, not by year:
 *                     the year is a separate choice, held in `rasterYear`
 *   `layer:<id>`      a role-permissioned `layers` row
 */
const LAYER_PREFIX = "layer:";
const RASTER_PREFIX = "raster:";

export function layerIdOf(key: string): number | null {
  return key.startsWith(LAYER_PREFIX) ? Number(key.slice(LAYER_PREFIX.length)) : null;
}

export function rasterToggleKey(groupKey: string): string {
  return `${RASTER_PREFIX}${groupKey}`;
}

export function isRasterToggleKey(key: string): boolean {
  return key.startsWith(RASTER_PREFIX);
}

export interface SectionItem {
  /** Stable toggle key: an overlay key, or `layer:<id>` for a `layers` row. */
  key: string;
  label: string;
  color: string;
  geometryKind: SwatchGeometryKind;
  /** No data yet — render as a disabled placeholder, not a working switch. */
  pending?: boolean;
  /** Presentation only — see ITEM_STYLE. Falls back to iconForGeometry when unset. */
  icon?: LucideIcon;
}

export interface RasterYear {
  /** Sort/selection identity — not always the same text as `label` (e.g. a transition range). */
  year: number;
  /** What the picker shows — a bare year, or a "start → end" range for a transition theme. */
  label: string;
  key: string;
  bounds: [[number, number], [number, number]];
}

export interface SectionDef {
  label: string;
  /** The group's seed key. Unique, unlike the label — two groups are both "Matipala". */
  id: string;
  accent: SectionAccent;
  icon: LucideIcon;
  /**
   * layer — the group *is* one layer: a switch, plus a year picker when it
   *         holds more than one image.
   * multi — a heading over layers and/or nested groups.
   */
  mode: "layer" | "multi";
  /** Layers hanging directly off this group. */
  items: SectionItem[];
  /** Per-year imagery, when this group is a raster theme. */
  years: RasterYear[];
  /** Nested groups, in seeded order. */
  children: SectionDef[];
  /** 0 for a top-level heading. Drives the sidebar's indentation. */
  depth: number;
}

/**
 * Presentation only — icon and subject colour per group key. A group the seed
 * grows that isn't listed here still renders, on DEFAULT_STYLE; no behaviour
 * is gated on the key.
 */
const GROUP_STYLE: Record<string, { accent: SectionAccent; icon: LucideIcon }> = {
  "forest-layers": { accent: "forest", icon: Trees },
  "green-cover": { accent: "forest", icon: Leaf },
  "forest-cover": { accent: "forest", icon: Trees },
  "forest-type": { accent: "canopy", icon: TreePine },
  "vegetation-change": { accent: "change", icon: TrendingUp },
  "forest-fragmentation": { accent: "change", icon: Puzzle },
  "satellite-imagery": { accent: "imagery", icon: Aperture },

  landuse: { accent: "land", icon: LandPlot },
  "historical-land-use": { accent: "land", icon: LandPlot },
  "current-land-use": { accent: "land", icon: MapIcon },

  "drone-data": { accent: "imagery", icon: Image },
  orthomosaic: { accent: "imagery", icon: Image },
  dsm: { accent: "land", icon: Mountain },
  dtm: { accent: "land", icon: MountainSnow },
  slope: { accent: "land", icon: TrendingUp },
  aspect: { accent: "land", icon: Compass },
  chm: { accent: "canopy", icon: TreePine },

  "drone-analysis": { accent: "canopy", icon: Sprout },
  "tree-density": { accent: "canopy", icon: TreePine },
  hydrogeology: { accent: "water", icon: Droplets },
  "existing-water-conservation": { accent: "water", icon: Dam },
  "proposed-conservation-sites": { accent: "water", icon: Target },
  "biodiversity-data": { accent: "fauna", icon: PawPrint },
  "wildlife-movement": { accent: "fauna", icon: Route },
  "habitat-suitability": { accent: "fauna", icon: Layers },
  "administrative-boundaries": { accent: "infra", icon: MapIcon },
  reference: { accent: "infra", icon: Layers },
  toposheet: { accent: "imagery", icon: ScrollText },
};

/**
 * Presentation only — a per-layer icon override, keyed by overlay `key`, for
 * groups whose rows would otherwise all render the same geometry-shape icon.
 * A layer not listed here falls back to iconForGeometry; no behaviour is
 * gated on the key.
 */
const ITEM_STYLE: Record<string, LucideIcon> = {
  causeway: Waypoints,
  checkDam: Dam,
  fireline: Flame,
  potentialSmc: Target,
  vantalawadi: MapPinned,
  streams: Waves,
  watershed: Droplets,
  geology: Gem,
  geomorphology: Layers3,
  lineament: Zap,
  dyke: Ruler,
  treeHeight: Ruler,
  treeCount: Hash,
  carbonStock: Scale,
  greenwash: Sprout,
  forestBoundary: Trees,
  talukaBoundary: SquareDashed,
  districtBoundary: SquareDashed,
};

const DEFAULT_STYLE: { accent: SectionAccent; icon: LucideIcon } = {
  accent: "infra",
  icon: Layers,
};

const DEFAULT_OVERLAY_COLOR = "#6B7280";

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function iconForGeometry(kind: SwatchGeometryKind): LucideIcon {
  if (kind === "point") return MapPin;
  if (kind === "line") return Route;
  if (kind === "raster") return Image;
  return kind === "polygon" ? Square : SquareDashed;
}

/** static_overlays.kind -> the legend's shape vocabulary. */
export function swatchKindOf(kind: OverlayMeta["kind"]): SwatchGeometryKind {
  if (kind === "line") return "line";
  if (kind === "point") return "point";
  if (kind === "outline") return "polygon-outline";
  return "polygon";
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

// Most per-year raster labels are the bare year ("1989"). A theme whose label
// is a range ("1980 → 1989") isn't itself a sort key, so fall back to the
// trailing year baked into the row's key (see init.sql's vegetation_change_*
// keys). A single-image theme (Orthomosaic, DSM, CHM, …) has no year at all —
// its one row falls back to its position, which is a valid if arbitrary key
// precisely because there is nothing in that group to compare it against.
function yearOf(o: OverlayMeta, indexFallback = NaN): number {
  const direct = Number(o.label);
  if (!Number.isNaN(direct)) return direct;
  const trailing = o.key.match(/(\d{4})$/);
  if (trailing) return Number(trailing[1]);
  return indexFallback;
}

/**
 * Assembles the group tree and hangs each overlay off its group.
 *
 * Groups arrive flat with a parent link, and overlays arrive flat with a
 * group id; both are already ordered by the API, so this is one pass to index
 * and one recursive pass to build.
 */
export function buildSections(groups: LayerGroup[], overlays: OverlayMeta[]): SectionDef[] {
  const childGroups = new globalThis.Map<number | null, LayerGroup[]>();
  for (const group of groups) {
    const parent = group.parent_id ?? null;
    const siblings = childGroups.get(parent) ?? [];
    siblings.push(group);
    childGroups.set(parent, siblings);
  }

  const overlaysByGroup = new globalThis.Map<number, OverlayMeta[]>();
  for (const overlay of overlays) {
    const rows = overlaysByGroup.get(overlay.group_id) ?? [];
    rows.push(overlay);
    overlaysByGroup.set(overlay.group_id, rows);
  }

  function build(group: LayerGroup, depth: number): SectionDef {
    const style = GROUP_STYLE[group.key] ?? DEFAULT_STYLE;
    const rows = overlaysByGroup.get(group.id) ?? [];
    const children = (childGroups.get(group.id) ?? []).map((child) => build(child, depth + 1));

    // A group holding placed rasters is one layer with a year picker. Rows
    // without an extent can't be drawn, so they fall through to `items` and
    // render as the pending placeholders they are.
    const rasters = rows.filter((o) => o.asset_type === "raster" && hasExtent(o));

    if (rasters.length > 0) {
      const years = rasters
        .map((o, i) => ({
          year: yearOf(o, i),
          label: o.label,
          key: o.key,
          bounds: [
            [o.min_lon!, o.min_lat!],
            [o.max_lon!, o.max_lat!],
          ] as [[number, number], [number, number]],
        }))
        .filter((y) => !Number.isNaN(y.year))
        .sort((a, b) => a.year - b.year);

      return {
        label: group.label,
        id: group.key,
        ...style,
        mode: "layer",
        items: [],
        years,
        children,
        depth,
      };
    }

    return {
      label: group.label,
      id: group.key,
      ...style,
      mode: "multi",
      years: [],
      children,
      depth,
      items: rows.map((o) => ({
        key: o.key,
        label: o.label,
        color: o.color ?? DEFAULT_OVERLAY_COLOR,
        geometryKind: swatchKindOf(o.kind),
        pending: o.status === "pending",
        icon: ITEM_STYLE[o.key],
      })),
    };
  }

  return (childGroups.get(null) ?? []).map((group) => build(group, 0));
}

/** Every node in the tree, depth-first, parents before their children. */
export function flattenSections(sections: SectionDef[]): SectionDef[] {
  return sections.flatMap((section) => [section, ...flattenSections(section.children)]);
}

/**
 * Every toggle key a section's header switch owns, including its whole
 * subtree — switching "Forest Layers" on means switching on everything under
 * it. Pending layers are left out: they have no data, so "switch the group
 * on" must not claim to have turned them on.
 */
export function sectionToggleKeys(section: SectionDef): string[] {
  const own =
    section.mode === "layer"
      ? [rasterToggleKey(section.id)]
      : section.items.filter((item) => !item.pending).map((item) => item.key);
  return [...own, ...section.children.flatMap(sectionToggleKeys)];
}

/** What a raster theme draws at until its opacity slider is touched. */
export const DEFAULT_RASTER_OPACITY = 0.75;

/**
 * Whether a section has anything to disclose. Every raster theme does — it
 * has an opacity slider even when it is a single image with no year to pick.
 * A group with one layer and no children is fully expressed by its header
 * switch, so it gets no chevron.
 */
export function sectionIsExpandable(section: SectionDef): boolean {
  if (section.children.length > 0) return true;
  return section.mode === "layer" ? true : section.items.length > 1;
}
