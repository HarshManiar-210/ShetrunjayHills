// Static reference overlays served straight from public/vector-data — these
// are basemap-style reference geometry, not RBAC-permissioned layers, so
// they bypass the DB-backed `layers` table on purpose (see CLAUDE.md).
export interface OverlayDef {
  key: string;
  label: string;
  url: string;
  color: string;
  kind: "line" | "fill";
}

export const STATIC_OVERLAY_SOURCES: Record<string, OverlayDef> = {
  roads: { key: "roads", label: "Roads", url: "/vector-data/Roads.geojson", color: "#D18B2A", kind: "line" },
  rivers: { key: "rivers", label: "Rivers", url: "/vector-data/Rivers.geojson", color: "#4C8ED9", kind: "line" },
  villages: {
    key: "villages",
    label: "Village Boundaries",
    url: "/vector-data/Villages.geojson",
    color: "#C56E54",
    kind: "fill",
  },
  zoneBoundaries: {
    key: "zoneBoundaries",
    label: "Zone Boundaries",
    url: "/vector-data/DistrictBoundary.geojson",
    color: "#9B6ED8",
    kind: "fill",
  },
  studyArea: {
    key: "studyArea",
    label: "Study Area",
    url: "/vector-data/StudyArea.geojson",
    color: "#5AA469",
    kind: "fill",
  },
  streams: { key: "streams", label: "Streams", url: "/vector-data/Streams.geojson", color: "#8BB8E8", kind: "line" },
  watershed: {
    key: "watershed",
    label: "Watershed",
    url: "/vector-data/Watersheds.geojson",
    color: "#2F9E9E",
    kind: "fill",
  },
};
