import { overlayDataUrl, type OverlayMeta } from "@/lib/overlays-api";

// Static reference overlays — basemap-style reference geometry, not
// RBAC-permissioned layers, so they bypass the DB-backed `layers` table on
// purpose (see CLAUDE.md). The actual GeoJSON still comes from Postgres: each
// def below is derived from a `static_overlays` row (infra/postgis-init/init.sql),
// and url resolves through the API, which reads that row's file_path off
// disk — a switch flip fetches from the DB path, not a bundled static file.
// Adding a vector overlay is a seed insert; this file needs no edit for it.
export interface OverlayDef {
  key: string;
  label: string;
  url: string;
  color: string;
  kind: "line" | "fill" | "point";
}

export function vectorOverlayDefs(meta: OverlayMeta[]): OverlayDef[] {
  return meta
    .filter(
      (o): o is OverlayMeta & { kind: "line" | "fill" | "point" } =>
        o.kind === "line" || o.kind === "fill" || o.kind === "point",
    )
    .map((o) => ({ key: o.key, label: o.label, url: overlayDataUrl(o.key), color: o.color ?? "#6B7280", kind: o.kind }));
}
