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
 * `F_TYPE` → `F type`, `strmOrder` → `Strm order`, `Year_Updat` → `Year updat`.
 * The source names are truncated DBF column names, so this tidies them rather
 * than pretending it can expand them — that is what the client's field list
 * will be for.
 */
function humanise(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return key;
  // Leave an all-caps acronym (DSM, TOF, AGB) alone rather than title-casing
  // it into something that reads like a word.
  const lowered = /^[A-Z0-9 ]+$/.test(spaced) && spaced.length <= 5 ? spaced : spaced.toLowerCase();
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

/** The showable attributes of a feature, in the order the source lists them. */
export function popupFields(properties: Record<string, unknown> | null): PopupField[] {
  if (!properties) return [];
  const fields: PopupField[] = [];
  for (const [key, raw] of Object.entries(properties)) {
    if (INTERNAL_KEYS.has(key.toLowerCase())) continue;
    const value = formatValue(raw);
    if (value === null) continue;
    fields.push({ label: humanise(key), value });
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
 */
export function popupHtml(layerLabel: string, properties: Record<string, unknown> | null): string {
  const fields = popupFields(properties);
  const shown = fields.slice(0, MAX_ROWS);
  const hidden = fields.length - shown.length;

  const rows = shown
    .map(
      (field) => `
      <div class="flex gap-3 py-0.5">
        <dt class="w-24 shrink-0 text-[11px] text-muted-foreground">${escapeHtml(field.label)}</dt>
        <dd class="min-w-0 flex-1 text-[11px] font-medium break-words">${escapeHtml(field.value)}</dd>
      </div>`,
    )
    .join("");

  const body = shown.length
    ? `<dl class="mt-1.5 divide-y divide-border/60">${rows}</dl>`
    : `<p class="mt-1.5 text-[11px] text-muted-foreground">This feature carries no attributes.</p>`;

  const more = hidden > 0
    ? `<p class="mt-1.5 text-[10px] text-muted-foreground/70">+${hidden} more field${hidden === 1 ? "" : "s"}</p>`
    : "";

  return `<div class="text-sm font-semibold">${escapeHtml(layerLabel)}</div>${body}${more}`;
}
