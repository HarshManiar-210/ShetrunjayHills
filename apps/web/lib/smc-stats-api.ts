import { API_URL } from "@/lib/layers-api";
import { getToken } from "@/lib/auth";

/**
 * The client's SMC Statistics table (smc_zone_counts): how many soil &
 * moisture conservation structures stand in each study-area zone, existing
 * and potential. Mirrors models.SmcZoneCount.
 */
export interface SmcZoneCount {
  overlay_key: string;
  /** The layer's label; the existing and potential layers of one structure share it. */
  structure: string;
  /** The table's heading for the layer's set — "Existing", "Potential". */
  set_label: string;
  column_order: number;
  zone_no: number;
  zone_name: string;
  count: number;
}

export async function fetchSmcStats(): Promise<SmcZoneCount[]> {
  // Sent with the session's token like every other API call: the API answers
  // 401 without one.
  const token = getToken();
  const res = await fetch(`${API_URL}/api/smc-stats`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("failed to load SMC statistics");
  return res.json();
}

/** One structure's column group: a column per set, in table order. */
export interface SmcColumn {
  structure: string;
  sets: string[];
}

export interface SmcZoneRow {
  no: number;
  name: string;
  /** `${structure}|${set}` → count. Absent where the structure has no such set. */
  cells: Record<string, number>;
  /** Set label → the zone's count across every structure. */
  bySet: Record<string, number>;
  total: number;
}

export interface SmcTable {
  columns: SmcColumn[];
  /** Every set label, in first-seen order — the "Total Existing / Potential" columns. */
  sets: string[];
  zones: SmcZoneRow[];
  /** The same sums over every zone. */
  totals: { cells: Record<string, number>; bySet: Record<string, number>; total: number };
}

export const cellKey = (structure: string, set: string) => `${structure}|${set}`;

/**
 * Pivots the rows into the table the client delivered: zones down the side,
 * structures across with a column per set, and the totals. Nothing here
 * knows which structures or sets exist — they are whatever the rows name.
 */
export function smcTable(rows: SmcZoneCount[]): SmcTable {
  const byOrder = [...rows].sort((a, b) => a.column_order - b.column_order);
  const columns: SmcColumn[] = [];
  const sets: string[] = [];
  for (const row of byOrder) {
    if (!columns.some((c) => c.structure === row.structure)) {
      columns.push({ structure: row.structure, sets: [] });
    }
    if (!sets.includes(row.set_label)) sets.push(row.set_label);
  }
  // Every structure gets every set's column, in the global order — a
  // structure with no potential sites (Causeway) still has a Potential
  // column, shown as "–", as the delivered table has it.
  for (const column of columns) column.sets = [...sets];

  const zones = new globalThis.Map<number, SmcZoneRow>();
  const totals = { cells: {} as Record<string, number>, bySet: {} as Record<string, number>, total: 0 };
  for (const row of rows) {
    let zone = zones.get(row.zone_no);
    if (!zone) {
      zone = { no: row.zone_no, name: row.zone_name, cells: {}, bySet: {}, total: 0 };
      zones.set(row.zone_no, zone);
    }
    const key = cellKey(row.structure, row.set_label);
    zone.cells[key] = (zone.cells[key] ?? 0) + row.count;
    zone.bySet[row.set_label] = (zone.bySet[row.set_label] ?? 0) + row.count;
    zone.total += row.count;
    totals.cells[key] = (totals.cells[key] ?? 0) + row.count;
    totals.bySet[row.set_label] = (totals.bySet[row.set_label] ?? 0) + row.count;
    totals.total += row.count;
  }

  return { columns, sets, zones: [...zones.values()].sort((a, b) => a.no - b.no), totals };
}
