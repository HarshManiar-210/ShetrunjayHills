import { overlayDataUrl } from "@/lib/overlays-api";

// Static reference overlays — basemap-style reference geometry, not
// RBAC-permissioned layers, so they bypass the DB-backed `layers` table on
// purpose (see CLAUDE.md). The actual GeoJSON still comes from Postgres: each
// key here matches a `static_overlays` row (infra/postgis-init/init.sql),
// and url resolves through the API, which reads that row's file_path off
// disk — a switch flip fetches from the DB path, not a bundled static file.
export interface OverlayDef {
  key: string;
  label: string;
  url: string;
  color: string;
  kind: "line" | "fill";
}

function overlay(key: string, label: string, color: string, kind: "line" | "fill"): OverlayDef {
  return { key, label, url: overlayDataUrl(key), color, kind };
}

export const STATIC_OVERLAY_SOURCES: Record<string, OverlayDef> = {
  roads: overlay("roads", "Roads", "#D18B2A", "line"),
  rivers: overlay("rivers", "Rivers", "#4C8ED9", "line"),
  villages: overlay("villages", "Village Boundaries", "#C56E54", "fill"),
  zoneBoundaries: overlay("zoneBoundaries", "Zone Boundaries", "#9B6ED8", "fill"),
  studyArea: overlay("studyArea", "Study Area", "#5AA469", "fill"),
  streams: overlay("streams", "Streams", "#8BB8E8", "line"),
  watershed: overlay("watershed", "Watershed", "#2F9E9E", "fill"),
};
