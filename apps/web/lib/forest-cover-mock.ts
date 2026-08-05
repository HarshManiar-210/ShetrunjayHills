// Placeholder data for the Forest Cover theme (FRD §1.1) until real
// per-year satellite/drone imagery and zonal statistics are available.
// Every value here is illustrative, not measured.

export const FOREST_COVER_YEARS = [2018, 2020, 2022, 2024] as const;
export type ForestCoverYear = (typeof FOREST_COVER_YEARS)[number];

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

// One tint per year so switching the year filter visibly changes the
// placeholder satellite/drone overlay on the map, not just the stats table.
const YEAR_COLORS: Record<ForestCoverYear, string> = {
  2018: "#C56E54",
  2020: "#D18B2A",
  2022: "#5AA469",
  2024: "#2D7D46",
};

export function getYearColor(year: ForestCoverYear): string {
  return YEAR_COLORS[year];
}

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
// measurement.
function statsFor(areas: ReadonlyArray<[string, number]>, year: ForestCoverYear): ZoneStat[] {
  const yearsFromLatest = FOREST_COVER_YEARS[FOREST_COVER_YEARS.length - 1] - year;
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
