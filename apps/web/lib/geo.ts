import { LngLatBounds, type LngLatBoundsLike } from "maplibre-gl";

export function boundsOfFeature(feature: GeoJSON.Feature): LngLatBoundsLike | null {
  const bounds = new LngLatBounds();
  let hasPoint = false;

  function walk(coords: unknown): void {
    if (Array.isArray(coords) && typeof coords[0] === "number") {
      bounds.extend(coords as [number, number]);
      hasPoint = true;
    } else if (Array.isArray(coords)) {
      coords.forEach(walk);
    }
  }

  if (feature.geometry.type !== "GeometryCollection") {
    walk((feature.geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates);
  }

  return hasPoint ? bounds : null;
}
