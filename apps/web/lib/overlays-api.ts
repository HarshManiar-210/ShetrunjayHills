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
  kind?: "line" | "fill" | "point";
  color?: string;
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
}

export async function fetchOverlays(): Promise<OverlayMeta[]> {
  const res = await fetch(`${API_URL}/api/overlays`);
  if (!res.ok) throw new Error("failed to load overlays");
  return res.json();
}

export function overlayDataUrl(key: string): string {
  return `${API_URL}/api/overlays/${key}/data`;
}
