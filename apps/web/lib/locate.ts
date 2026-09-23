import type { Position } from "@/lib/measure";

/**
 * Support for the map's "show my location" tool.
 *
 * The browser's fix is only as good as what the device has to work with: a
 * phone outdoors gets GPS and lands within a few metres, while a desktop has
 * no GPS at all and falls back to Wi-Fi or IP lookup, which routinely puts
 * you at the centre of a city you are merely connected through. Nothing here
 * can improve that fix — what it can do is stop the map overstating it, by
 * drawing the accuracy the browser reports and zooming only as far as that
 * accuracy supports.
 */

/** Equatorial circumference in metres, for the Web Mercator scale. */
const EQUATOR_M = 40_075_016.686;
const TILE_PX = 512;
const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * A circle on the sphere, as a closed ring of lng/lat.
 *
 * MapLibre's circle layer sizes itself in screen pixels, so it would keep a
 * constant size as you zoom and say nothing about ground distance. An
 * accuracy radius is a ground distance, so it has to be a polygon.
 */
export function circleRing(center: Position, radiusMetres: number, steps = 64): Position[] {
  const [lon, lat] = center;
  const lat1 = toRad(lat);
  const lon1 = toRad(lon);
  const angular = radiusMetres / EARTH_RADIUS_M;

  const ring: Position[] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
      );
    ring.push([toDeg(lon2), toDeg(lat2)]);
  }
  return ring;
}

/** Furthest in the map will go on a location fix, however precise it claims to be. */
const MAX_LOCATE_ZOOM = 16;
/** Furthest out. Past this the fix is so coarse that framing it says nothing. */
const MIN_LOCATE_ZOOM = 8;
/** Roughly how many pixels across the accuracy circle should land. */
const TARGET_PX = 180;

/**
 * The closest zoom the fix actually justifies.
 *
 * The tool used to fly to a fixed zoom 15 and never zoom out, so a fix good
 * to ±3 km was framed exactly like one good to ±5 m — which is the whole of
 * why it looked wrong rather than merely imprecise.
 */
export function zoomForAccuracy(accuracyMetres: number, latitude: number): number {
  const metresPerPixel = Math.max(accuracyMetres, 1) * 2 / TARGET_PX;
  const zoom = Math.log2((EQUATOR_M * Math.cos(toRad(latitude))) / (TILE_PX * metresPerPixel));
  if (!Number.isFinite(zoom)) return MIN_LOCATE_ZOOM;
  return Math.min(MAX_LOCATE_ZOOM, Math.max(MIN_LOCATE_ZOOM, zoom));
}

/** Below this the fix is precise enough to stop waiting for a better one. */
export const GOOD_FIX_M = 25;
/** Above this it is a network guess, not a position, and should say so. */
export const COARSE_FIX_M = 500;

export function formatAccuracy(metres: number): string {
  if (metres >= 1000) return `±${(metres / 1000).toFixed(metres >= 10_000 ? 0 : 1)} km`;
  return `±${Math.round(metres)} m`;
}

/**
 * What to tell someone about the fix they just got.
 *
 * A coarse fix is not an error — the browser answered — but presenting it in
 * the same words as a GPS lock is how "my location is wrong" gets reported
 * against a map that is faithfully drawing what it was handed.
 */
export function describeFix(accuracyMetres: number): string {
  const precision = formatAccuracy(accuracyMetres);
  if (accuracyMetres > COARSE_FIX_M) {
    return `Approximate location, ${precision} — no GPS signal, so this is from the network`;
  }
  return `Your location, ${precision}`;
}
