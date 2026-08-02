const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface LayerFeature extends GeoJSON.Feature {
  properties: { id: number; name: string };
}

export interface LayerCollection extends GeoJSON.FeatureCollection {
  features: LayerFeature[];
}

export class UnauthorizedError extends Error {}

// token is null for an anonymous visitor — the API resolves a request with
// no Authorization header to its public role rather than rejecting it.
export async function fetchLayers(token: string | null): Promise<LayerCollection> {
  const res = await fetch(`${API_URL}/api/layers`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error("failed to load layers");
  return res.json();
}
