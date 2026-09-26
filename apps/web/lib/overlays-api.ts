import { API_URL } from "@/lib/layers-api";
import type { LegendClass } from "@/lib/legend-config";

// Mirrors models.StaticOverlay's JSON shape (apps/api/internal/models) —
// file_path never leaves the server, only the key needed to ask
// overlayDataUrl for the asset.
export interface OverlayMeta {
  id: number;
  key: string;
  label: string;
  /** The layer_groups row this overlay sits under. See fetchLayerGroups. */
  group_id: number;
  asset_type: "vector" | "raster";
  /**
   * How the layer draws, which is also what its legend swatch looks like.
   * 'outline' is a boundary with no tint (Village/Taluka/District/Study Area);
   * 'fill' is a tinted area (Forest Boundary, Geology).
   */
  kind?: "line" | "fill" | "outline" | "point";
  color?: string;
  /**
   * Set together, on a row whose features carry their own class (Forest
   * Cover FSI's density classes, Forest Type FSI's species types) instead of
   * drawing in one flat `color`: color_field is the GeoJSON property holding
   * that class, and categories is that class's value/label/color, in the
   * same shape a raster theme's legend classes already use. Absent on every
   * flat-colour row, which is still the common case.
   */
  color_field?: string;
  categories?: LegendClass[];
  /** The properties a clicked feature's popup shows, in order. Absent shows them all. */
  popup_fields?: string[];
  /** Selected and switched on when the dashboard opens. */
  default_on?: boolean;
  /** A 'line' row drawn dotted rather than solid (Fireline). */
  dotted?: boolean;
  /** 'pending' rows carry no kind/color/file_path — data hasn't arrived yet. */
  status: "available" | "pending";
  min_lon?: number;
  min_lat?: number;
  max_lon?: number;
  max_lat?: number;
  /**
   * The asset's size on disk, measured by the API rather than stored in the
   * DB. Drives the "this layer is large" warning before a heavy layer is
   * switched on, so which layers are heavy stays data (CLAUDE.md's core
   * invariant). Absent for a 'pending' row, which has no file.
   */
  size_bytes?: number;
  /**
   * The asset is a PMTiles archive, not a whole GeoJSON file: MapLibre adds
   * it as a vector-tile source and streams only the current viewport. Stamped
   * by the API from the file's extension (see handlers.Overlays), so which
   * layers are tiled is a fact about the delivered data rather than a list of
   * keys in the frontend.
   */
  tiled?: boolean;
  /**
   * The client delivered official class statistics for this overlay. A
   * raster is measured when it has none, so this matters for a classed
   * vector layer (the FSI layers), which only gets statistics when set.
   */
  has_stats?: boolean;
}

/**
 * A node in the sidebar's tree. Arrives flat with a parent link rather than
 * nested — lib/sections.ts assembles the nesting. `parent_id` is absent on a
 * top-level heading.
 */
export interface LayerGroup {
  id: number;
  key: string;
  label: string;
  parent_id?: number;
  sort_order: number;
  /** A top-level group with a navbar dropdown of its own. */
  own_picker?: boolean;
  /** A raster group drawn beneath every other raster (the Toposheet). */
  draw_below?: boolean;
}

export async function fetchLayerGroups(): Promise<LayerGroup[]> {
  const res = await fetch(`${API_URL}/api/layer-groups`);
  if (!res.ok) throw new Error("failed to load layer groups");
  return res.json();
}

export async function fetchOverlays(): Promise<OverlayMeta[]> {
  const res = await fetch(`${API_URL}/api/overlays`);
  if (!res.ok) throw new Error("failed to load overlays");
  return res.json();
}

export function overlayDataUrl(key: string): string {
  return `${API_URL}/api/overlays/${key}/data`;
}
