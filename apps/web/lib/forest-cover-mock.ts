// Placeholder zonal statistics for the Forest Cover theme (FRD §1.1) — the
// imagery itself is real (served from the `static_overlays` DB rows, see
// lib/overlays-api.ts), but per-zone/grid cover percentages aren't measured
// yet.

export type ForestCoverYear = number;

export const FOREST_COVER_SOURCES = ["Sentinel-2", "Landsat-8", "Drone Survey"] as const;
export type ForestCoverSource = (typeof FOREST_COVER_SOURCES)[number];

export interface ZoneStat {
  zone: string;
  areaHa: number;
  coverPercent: number;
}

// Zone areas sum to ~3,396 ha, matching the real Shatrunjay hill boundary's
// surveyed area (33.9596 sq km) from PalitanaStudyArea.geojson — the split
// into zones is illustrative, the total is not.
const ZONE_AREAS_HA: ReadonlyArray<[string, number]> = [
  ["Zone A", 950],
  ["Zone B", 880],
  ["Zone C", 820],
  ["Zone D", 746],
];

// Same real total (~3,396 ha), split into a finer grid instead of the
// coarser zones above — a regular grid overlay, not a measured subdivision.
const GRID_AREAS_HA: ReadonlyArray<[string, number]> = [
  ["Grid 1", 425],
  ["Grid 2", 410],
  ["Grid 3", 440],
  ["Grid 4", 390],
  ["Grid 5", 435],
  ["Grid 6", 415],
  ["Grid 7", 460],
  ["Grid 8", 421],
];

// Cover percentage drifts slightly by year so switching the year filter
// visibly changes the stats — a deterministic placeholder trend, not a
// measurement. Anchored to the latest available raster year (see
// static_overlays seed data), not derived from it, since stats stay
// illustrative regardless of which years imagery exists for.
const LATEST_YEAR = 2026;

function statsFor(areas: ReadonlyArray<[string, number]>, year: ForestCoverYear): ZoneStat[] {
  const yearsFromLatest = LATEST_YEAR - year;
  return areas.map(([zone, areaHa], i) => ({
    zone,
    areaHa,
    coverPercent: Math.max(0, 68 - i * 3 - yearsFromLatest * 1.5),
  }));
}

export function getZoneStats(year: ForestCoverYear): ZoneStat[] {
  return statsFor(ZONE_AREAS_HA, year);
}

export function getGridStats(year: ForestCoverYear): ZoneStat[] {
  return statsFor(GRID_AREAS_HA, year);
}
