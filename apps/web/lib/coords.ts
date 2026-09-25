/** A point typed into the search box, in decimal degrees. */
export interface LatLng {
  lat: number;
  lng: number;
}

// One coordinate: a signed decimal, an optional degree sign, and an optional
// hemisphere letter — "21.5", "-71.8", "21.5°N", "71.8 E".
const PART = String.raw`([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?`;
const PAIR = new RegExp(String.raw`^\s*${PART}\s*[,;\s]\s*${PART}\s*$`, "i");

function signed(value: string, hemisphere: string | undefined): number {
  const n = Number(value);
  const h = hemisphere?.toUpperCase();
  return h === "S" || h === "W" ? -Math.abs(n) : n;
}

/**
 * Reads "lat, long" out of a search query, or returns null when the query is
 * not a coordinate pair.
 *
 * Latitude comes first, as it does on most GPS readouts and in Google Maps.
 * Hemisphere letters settle the order when given ("71.8E 21.5N" works); without
 * them a pair whose first number cannot be a latitude is read as long, lat.
 */
export function parseLatLng(query: string): LatLng | null {
  const match = PAIR.exec(query);
  if (!match) return null;
  const [, v1, h1, v2, h2] = match;
  let a = signed(v1, h1);
  let b = signed(v2, h2);

  const firstIsLng = /[EW]/i.test(h1 ?? "") || /[NS]/i.test(h2 ?? "");
  if (firstIsLng || (!h1 && !h2 && Math.abs(a) > 90 && Math.abs(b) <= 90)) {
    [a, b] = [b, a];
  }

  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lng: b };
}

export function formatLatLng({ lat, lng }: LatLng): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
