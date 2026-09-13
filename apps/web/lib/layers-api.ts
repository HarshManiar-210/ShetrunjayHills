import { layerColor } from "@/lib/layer-style";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface LayerFeature extends GeoJSON.Feature {
  properties: { id: number; name: string; color: string };
}

export interface LayerCollection extends GeoJSON.FeatureCollection {
  features: LayerFeature[];
}

export class UnauthorizedError extends Error {}

// The API returns id/name only; the render colour is resolved once here, off
// the layer's stable numeric id, so the map, legend and statistics panel all
// read the same value off the feature rather than each deriving their own.
function withColor(collection: GeoJSON.FeatureCollection): LayerCollection {
  return {
    ...collection,
    features: collection.features.map((f) => {
      const { id, name } = f.properties as { id: number; name: string };
      return { ...f, properties: { id, name, color: layerColor(id) } };
    }),
  };
}

// token is null for an anonymous visitor — the API resolves a request with
// no Authorization header to its public role rather than rejecting it.
export async function fetchLayers(token: string | null): Promise<LayerCollection> {
  const res = await fetch(`${API_URL}/api/layers`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error("failed to load layers");
  return withColor(await res.json());
}
