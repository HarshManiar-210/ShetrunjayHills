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
  /**
   * SW/NE corners of the layer's own geometry, from its `static_overlays`
   * row. The map frames a layer from this the moment its switch is flipped,
   * which is what lets the geometry itself be handed to MapLibre as a URL and
   * fetched off the main thread — nothing has to parse the file to find out
   * where it is. Undefined for a row seeded without an extent.
   */
  bounds?: [[number, number], [number, number]];
}

export function vectorOverlayDefs(meta: OverlayMeta[]): OverlayDef[] {
  return meta
    .filter(
      (o): o is OverlayMeta & { kind: "line" | "fill" | "point" } =>
        o.kind === "line" || o.kind === "fill" || o.kind === "point",
    )
    .map((o) => ({
      key: o.key,
      label: o.label,
      url: overlayDataUrl(o.key),
      color: o.color ?? "#6B7280",
      kind: o.kind,
      bounds:
        o.min_lon != null && o.min_lat != null && o.max_lon != null && o.max_lat != null
          ? ([
              [o.min_lon, o.min_lat],
              [o.max_lon, o.max_lat],
            ] as [[number, number], [number, number]])
          : undefined,
    }));
}
