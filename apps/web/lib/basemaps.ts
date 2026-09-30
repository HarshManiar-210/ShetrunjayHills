/**
 * The three selectable basemaps, per the client's UI/UX brief.
 *
 * Satellite and Hybrid are Google's own tiles (the mt*.google.com/vt
 * endpoints: lyrs=s imagery, lyrs=y imagery with Google's roads and labels
 * baked in), so they look exactly like Google Maps. Those endpoints are not
 * Google's licensed Map Tiles API: Google may throttle or block them, and
 * moving to the official API later is a change to the `tiles` URLs here plus
 * a key proxied through the Go API. Nothing outside this file knows where the
 * imagery comes from.
 *
 * All three basemaps live in the style at once and are switched by layer
 * visibility rather than by map.setStyle(), which would tear down every
 * source and layer the dashboard has added. A hidden raster layer fetches no
 * tiles, so the two that are off cost nothing.
 */

export type BasemapId = "hybrid" | "satellite" | "osm";

const GOOGLE_ATTRIBUTION = 'Imagery &copy; <a href="https://www.google.com/maps">Google</a>';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Highest zoom each provider actually has data for *over this study area*.
 * Past it MapLibre upscales the deepest real tile instead of requesting one
 * that does not exist, which is what keeps the imagery present — soft, but
 * continuous — when someone zooms right in on a drone layer.
 *
 * These are measured, not assumed, and they differ per provider, which is why
 * there is no single constant:
 *
 *   Google (s and y)    tiles to z22, then HTTP 400. The deepest levels are
 *                       Google's own upscaling here, so 21 is plenty — and the
 *                       camera stops at MAX_MAP_ZOOM before either matters.
 *   OpenStreetMap       real tiles to z19, then HTTP 400.
 *
 * Coverage is per-region. Re-measure before treating these as global truths.
 */
const GOOGLE_MAX_ZOOM = 21;
const OSM_MAX_ZOOM = 19;

interface TileSourceDef {
  id: string;
  tiles: string[];
  attribution: string;
  maxZoom: number;
}

/** Google spreads tile load over four hosts; MapLibre rotates through them. */
function googleTiles(lyrs: string): string[] {
  return [0, 1, 2, 3].map(
    (n) => `https://mt${n}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`,
  );
}

const SOURCES: TileSourceDef[] = [
  {
    id: "google-satellite",
    tiles: googleTiles("s"),
    attribution: GOOGLE_ATTRIBUTION,
    maxZoom: GOOGLE_MAX_ZOOM,
  },
  {
    // Imagery with roads and place names already drawn in, so Hybrid is one
    // layer rather than imagery plus separate reference overlays.
    id: "google-hybrid",
    tiles: googleTiles("y"),
    attribution: GOOGLE_ATTRIBUTION,
    maxZoom: GOOGLE_MAX_ZOOM,
  },
  {
    id: "osm",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: OSM_ATTRIBUTION,
    maxZoom: OSM_MAX_ZOOM,
  },
];

/**
 * Draw order, bottom to top. Only one basemap shows at a time, so the order
 * among them does not matter — only that the last is the top of the stack.
 */
const LAYERS: { id: string; source: string }[] = [
  { id: "basemap-satellite", source: "google-satellite" },
  { id: "basemap-hybrid", source: "google-hybrid" },
  { id: "basemap-osm", source: "osm" },
];

export interface BasemapDef {
  id: BasemapId;
  label: string;
  /** Which of LAYERS this basemap shows. Every other basemap layer hides. */
  layers: string[];
  attribution: string;
  /**
   * A real tile of the study area itself (z12, the tile covering Palitana),
   * so each swatch previews the imagery you would actually get rather than a
   * bundled stock thumbnail that drifts out of date.
   */
  thumbnail: string;
}

const PREVIEW_Z = 12;
const PREVIEW_X = 2864;
const PREVIEW_Y = 1797;

function previewTile(sourceId: string): string {
  const source = SOURCES.find((s) => s.id === sourceId)!;
  return source.tiles[0]
    .replace("{z}", String(PREVIEW_Z))
    .replace("{x}", String(PREVIEW_X))
    .replace("{y}", String(PREVIEW_Y));
}

// Order here is the order the switcher renders them in.
export const BASEMAPS: BasemapDef[] = [
  {
    id: "hybrid",
    label: "Hybrid",
    layers: ["basemap-hybrid"],
    attribution: GOOGLE_ATTRIBUTION,
    thumbnail: previewTile("google-hybrid"),
  },
  {
    id: "satellite",
    label: "Satellite",
    layers: ["basemap-satellite"],
    attribution: GOOGLE_ATTRIBUTION,
    thumbnail: previewTile("google-satellite"),
  },
  {
    id: "osm",
    label: "OSM Standard",
    layers: ["basemap-osm"],
    attribution: OSM_ATTRIBUTION,
    thumbnail: previewTile("osm"),
  },
];

/** Per the brief: Hybrid is the active basemap on load. */
export const DEFAULT_BASEMAP: BasemapId = "hybrid";

export function basemapById(id: BasemapId): BasemapDef {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}

/**
 * How far in the map lets anyone zoom.
 *
 * Capping each source stops missing tiles being *fetched* — MapLibre then
 * upscales its deepest real tile instead. That is honest, but it still lets
 * someone zoom to a blurry z22 and wonder what is broken, so the camera stops
 * where the data does.
 *
 * z19 is where OSM stops, and where the drone rasters' own tiles stop
 * (~0.28 m per pixel, see tools/prepare-raster-tiles.sh). Google goes deeper,
 * but past z19 there is nothing of ours to look at.
 */
export const MAX_MAP_ZOOM = 19;

/** Every basemap layer id, so the visibility pass can hide the ones that are off. */
export const BASEMAP_LAYER_IDS: string[] = LAYERS.map((l) => l.id);

/**
 * The topmost basemap layer. Everything the dashboard adds must go above it,
 * and nothing must go below it — passing this as `beforeId` is wrong, it is
 * the floor, not a ceiling.
 */
export const BASEMAP_TOP_LAYER_ID = LAYERS[LAYERS.length - 1].id;

/** The style's `sources` block — every basemap's tiles, declared up front. */
export function basemapSources() {
  return Object.fromEntries(
    SOURCES.map((s) => [
      s.id,
      {
        type: "raster" as const,
        tiles: s.tiles,
        tileSize: 256,
        maxzoom: s.maxZoom,
        attribution: s.attribution,
      },
    ]),
  );
}

/** The style's basemap `layers`, with only `active`'s own layers visible. */
export function basemapLayers(active: BasemapId) {
  const shown = new Set(basemapById(active).layers);
  return LAYERS.map((l) => ({
    id: l.id,
    type: "raster" as const,
    source: l.source,
    layout: { visibility: (shown.has(l.id) ? "visible" : "none") as "visible" | "none" },
  }));
}
