/**
 * Builds the attribute popup shown when a vector feature is clicked.
 *
 * The attributes are already in the browser: every vector layer is a GeoJSON
 * file served whole by the API (see handlers.OverlayData), so MapLibre has the
 * full property bag on the clicked feature. Nothing needs fetching.
 *
 * Which fields to show is *not* curated per layer yet — the client's "Layers
 * Update" document lists an attribute field per layer and hasn't been supplied.
 * Until it is, every meaningful property is shown and the plumbing is filtered
 * out. When that list arrives it should become a `popup_fields` column on
 * static_overlays rather than a lookup table in this file, so which fields a
 * layer shows stays a data change.
 */

/**
 * Keys that are storage plumbing rather than information about the feature:
 * surrogate keys, the producer's own bookkeeping, and geometry measurements
 * that duplicate what the map already shows. Matched case-insensitively.
 */
const INTERNAL_KEYS = new Set([
  "id",
  "fid",
  "gid",
  "objectid",
  "layer",
  "path",
  "geometry_i",
  "edition_nu",
  "input_cent",
  "shape_leng",
  "shape_len",
  "shape_area",
  "st_area_sh",
  "st_length_",
  "color",
  // Style and pipeline metadata the geology/geomorphology conversions carry:
  // an SLD stylesheet name and a second surrogate key.
  "sld_name",
  "new_geom_i",
]);

/**
 * A value that is a path on whoever produced the data's machine. SurveyNumber
 * carries `"D:/TGIS/TGIS_2026/May/Palitana/Villages/..."` on every feature;
 * that is not ours to show to anyone.
 */
const FILESYSTEM_PATH = /^[a-zA-Z]:[\\/]|^[\\/]{2}|^\/(?:home|Users|mnt|var|tmp)\//;

/** Above this the popup stops being a summary and becomes a data dump. */
const MAX_ROWS = 14;

export interface PopupField {
  label: string;
  value: string;
  /** Appended after the value, greyed — metres, hectares and so on. */
  unit?: string;
  /** Right-align and use tabular figures, so a column of numbers lines up. */
  numeric: boolean;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    // "<Null>" and "NULL" come through as real strings from several of the
    // delivered shapefile conversions.
    return trimmed === "" || /^(null|<null>|n\/a|none)$/i.test(trimmed);
  }
  return false;
}

function formatValue(value: unknown): string | null {
  if (isEmpty(value)) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value)) return value.toLocaleString();
    // Source precision runs to 14 decimal places on some rows, which is noise
    // at any scale a person reads a popup at.
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  const text = String(value).trim();
  if (FILESYSTEM_PATH.test(text)) return null;
  return text;
}

/**
 * Words that must keep their capitalisation. Without this `Tree_ID` came out
 * as "Tree id", which reads like a mistake.
 */
const ACRONYMS = new Set([
  "id", "no", "dsm", "dtm", "chm", "tof", "agb", "lulc", "fcc", "smc",
  "ndvi", "gis", "uid", "sno", "rf", "pf",
]);

/**
 * Shapefile column names are capped at ten characters, so several arrive
 * chopped mid-word: `True_Heigh`, `Year_Updat`, `descriptio`. Showing those
 * verbatim looks like a typo rather than like data.
 *
 * Only names that appear in the delivered files are listed, and only where
 * the full word is unambiguous — this completes a truncation, it does not
 * guess at meaning. The client's "Layers Update" field list supersedes all of
 * it once supplied, at which point this should become a `popup_fields` column
 * on static_overlays rather than a table here.
 */
const UNTRUNCATED: Record<string, string> = {
  true_heigh: "True height",
  max_height: "Max height",
  year_updat: "Year updated",
  descriptio: "Description",
  feature_co: "Feature code",
  legend_sho: "Legend",
  stratigrap: "Stratigraphy",
  stratigr_1: "Stratigraphy",
  lithologic: "Lithology",
  l1descript: "Lineament type",
  l2descript: "Lineament subtype",
  toposheet_: "Toposheet",
  uid_notati: "Notation ID",
  notation_l: "Notation",
  group_name: "Group",
  shape_leng: "Shape length",
  village_id: "Village ID",
  taluka_id: "Taluka ID",
  dist_id: "District ID",
  first_dist: "District code",
  areasqkm: "Area",
  plot_no: "Plot no",
  f_type: "Forest type",
  linkno: "Link no",
  dslinkno: "Downstream link",
  uslinkno1: "Upstream link 1",
  uslinkno2: "Upstream link 2",
  dsnodeid: "Downstream node",
  strmorder: "Stream order",
  dscontarea: "Downstream contributing area",
  strmdrop: "Stream drop",
  cat: "Category",
  polygonid: "Polygon ID",
};

/**
 * Units for the fields whose unit is knowable from the delivered data rather
 * than guessed. A bare "1.29" beside "True height" tells a reader nothing.
 *
 * `area` is hectares because StudyArea.geojson carries both `area` (3395.963)
 * and `areaSqKm` (33.9596) for the same polygon, which fixes the relationship;
 * the tree heights are metres, which is what a canopy height model measures.
 * Anything not listed is shown unitless rather than captioned with a guess.
 */
const UNITS: Record<string, string> = {
  max_height: "m",
  true_heigh: "m",
  area: "ha",
  areasqkm: "km²",
  length_km: "km",
  from_km: "km",
  to_km: "km",
};

/**
 * `Tree_ID` → `Tree ID`, `strmOrder` → `Strm order`, `True_Heigh` →
 * `True height`. Sentence case rather than Title Case: a label sitting beside
 * its value reads as a caption, not as a heading.
 */
function humanise(key: string): string {
  const known = UNTRUNCATED[key.toLowerCase()];
  if (known) return known;

  const words = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return key;

  // `length_km` becomes "Length", not "Length km", because the unit is drawn
  // beside the value — otherwise it reads "Length km  3.02 km".
  const unit = UNITS[key.toLowerCase()];
  if (unit && words.length > 1 && words[words.length - 1].toLowerCase() === unit.toLowerCase()) {
    words.pop();
  }

  const cased = words.map((word, i) => {
    const lower = word.toLowerCase();
    if (ACRONYMS.has(lower)) return lower.toUpperCase();
    // Only the first word is capitalised; the rest stay lower so a long name
    // does not read as a run of proper nouns.
    return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
  });
  return cased.join(" ");
}

/** The showable attributes of a feature, in the order the source lists them. */
export function popupFields(
  properties: Record<string, unknown> | null,
  /** The layer's own field list (static_overlays.popup_fields), when it has one. */
  only?: string[],
): PopupField[] {
  if (!properties) return [];
  const entries = only?.length
    ? only.map((key) => [key, properties[key]] as const)
    : Object.entries(properties);
  const fields: PopupField[] = [];
  // Two columns can land on the same label — StudyArea carries both `area`
  // (hectares) and `areaSqKm`, which are one measurement stated twice. Showing
  // "Area" on consecutive rows with different numbers just looks broken, so
  // the first spelling wins.
  const seen = new Set<string>();

  for (const [key, raw] of entries) {
    if (!only?.length && INTERNAL_KEYS.has(key.toLowerCase())) continue;
    const value = formatValue(raw);
    if (value === null) continue;

    const label = humanise(key);
    if (seen.has(label)) continue;
    seen.add(label);

    fields.push({
      label,
      value,
      unit: UNITS[key.toLowerCase()],
      numeric: typeof raw === "number",
    });
  }
  return fields;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/**
 * Popup markup. Built as a string because MapLibre's Popup takes HTML, not a
 * React tree — so every interpolated value is escaped here. The values come
 * from data files, not from us.
 *
 * Laid out as a definition list on a two-column grid: labels left in muted
 * ink, values right in tabular figures so a column of numbers lines up on the
 * decimal. The layer's own colour leads the header, which is what ties the
 * popup back to the thing that was clicked.
 */
export function popupHtml(
  layerLabel: string,
  properties: Record<string, unknown> | null,
  /** The colour this layer draws in, for the header chip. */
  color?: string,
  only?: string[],
): string {
  const fields = popupFields(properties, only);
  const shown = fields.slice(0, MAX_ROWS);
  const hidden = fields.length - shown.length;

  const rows = shown
    .map((field) => {
      const unit = field.unit
        ? `<span class="ml-0.5 font-normal text-muted-foreground">${escapeHtml(field.unit)}</span>`
        : "";
      return `<dt class="truncate text-[11px] leading-5 text-muted-foreground">${escapeHtml(field.label)}</dt>
        <dd class="text-right text-[11px] leading-5 font-medium break-words${
          field.numeric ? " tabular-nums" : ""
        }">${escapeHtml(field.value)}${unit}</dd>`;
    })
    .join("");

  const body = shown.length
    ? `<dl class="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-5 gap-y-0.5">${rows}</dl>`
    : `<p class="text-[11px] text-muted-foreground">No attributes recorded for this feature.</p>`;

  const more =
    hidden > 0
      ? `<p class="mt-2 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground/70">
           +${hidden} more field${hidden === 1 ? "" : "s"}
         </p>`
      : "";

  // The chip is a plain square of the layer colour; `color` is ours, not data,
  // but it is still escaped so this stays safe if that ever stops being true.
  const chip = color
    ? `<span class="size-2 shrink-0 rounded-[3px]" style="background-color:${escapeHtml(color)}"></span>`
    : "";

  return `<div class="min-w-[12rem]">
      <div class="mb-2 flex items-center gap-2 border-b border-border/60 pb-1.5">
        ${chip}
        <span class="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight">${escapeHtml(layerLabel)}</span>
      </div>
      ${body}${more}
    </div>`;
}
