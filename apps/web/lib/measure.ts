/**
 * Geodesic distance and area for the map's measuring tools.
 *
 * Hand-rolled rather than pulled from Turf: this is two textbook formulas and
 * two formatters, against a dependency that would ship a great deal more than
 * that. If measuring grows real requirements — buffers, intersections,
 * snapping — that trade flips.
 *
 * Both formulas work on the sphere, not the WGS-84 ellipsoid. Over a study
 * area a few kilometres across the difference is far below the precision
 * anyone clicking points on a map can claim.
 */

/** IUGG mean Earth radius, in metres. */
const EARTH_RADIUS_M = 6_371_008.8;

export type Position = [number, number];

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two lng/lat positions, in metres. */
export function haversineMetres([lon1, lat1]: Position, [lon2, lat2]: Position): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Total length along a path, in metres. 0 for fewer than two points. */
export function pathLengthMetres(points: Position[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineMetres(points[i - 1], points[i]);
  return total;
}

/**
 * Area of a closed ring, in square metres, by spherical excess.
 *
 * The ring is treated as closed whether or not the caller repeats the first
 * point. Sign depends on winding order, so the result is absolute — a
 * measuring tool has no use for signed area.
 */
export function ringAreaSqMetres(points: Position[]): number {
  if (points.length < 3) return 0;

  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [lon1, lat1] = points[i];
    const [lon2, lat2] = points[(i + 1) % points.length];
    total += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

function round(value: number, digits: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Metres below a kilometre, kilometres above — the unit a reader expects. */
export function formatDistance(metres: number): string {
  if (metres < 1_000) return `${round(metres, metres < 100 ? 1 : 0)} m`;
  return `${round(metres / 1_000, 2)} km`;
}

/**
 * Square metres, then hectares, then square kilometres. Hectares are in the
 * middle deliberately — the delivered data talks in acres and hectares for
 * forest parcels, and jumping m² to km² would skip the range most of this
 * study area's features fall in.
 */
export function formatArea(sqMetres: number): string {
  if (sqMetres < 10_000) return `${round(sqMetres, 0)} m²`;
  if (sqMetres < 1_000_000) return `${round(sqMetres / 10_000, 2)} ha`;
  return `${round(sqMetres / 1_000_000, 2)} km²`;
}
