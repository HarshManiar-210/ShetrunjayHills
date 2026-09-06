import { API_URL } from "@/lib/layers-api";

// Mirrors models.StaticOverlay's JSON shape (apps/api/internal/models) —
// file_path never leaves the server, only the key needed to ask
// overlayDataUrl for the asset.
export interface OverlayMeta {
  id: number;
  key: string;
  label: string;
  section: string;
  asset_type: "vector" | "raster";
  kind?: "line" | "fill";
  color?: string;
}

export async function fetchOverlays(): Promise<OverlayMeta[]> {
  const res = await fetch(`${API_URL}/api/overlays`);
  if (!res.ok) throw new Error("failed to load overlays");
  return res.json();
}

export function overlayDataUrl(key: string): string {
  return `${API_URL}/api/overlays/${key}/data`;
}
