"use client";

import { useMemo, useState } from "react";
import { Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { cellKey, smcTable, type SmcTable, type SmcZoneCount } from "@/lib/smc-stats-api";

const COUNT = new Intl.NumberFormat();
const NUM = "w-10 shrink-0 text-right tabular-nums";

/** A compact count table: a label column and one numeric column per heading. */
function CountTable({
  heading,
  columns,
  rows,
  total,
}: {
  heading: string;
  columns: string[];
  rows: { key: string; label: string; title?: string; values: (number | undefined)[] }[];
  total: (number | undefined)[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="min-w-0 flex-1">{heading}</span>
        {columns.map((c) => (
          <span key={c} className={NUM}>
            {c}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-1.5 text-xs">
          <span className="min-w-0 flex-1 truncate" title={row.title ?? row.label}>
            {row.label}
          </span>
          {row.values.map((v, i) => (
            <span key={columns[i]} className={cn(NUM, i < row.values.length - 1 && "text-muted-foreground")}>
              {v == null ? "–" : COUNT.format(v)}
            </span>
          ))}
        </div>
      ))}
      <div className="flex items-center gap-1.5 border-t border-border/60 pt-0.5 text-xs font-medium">
        <span className="min-w-0 flex-1">Total</span>
        {total.map((v, i) => (
          <span key={columns[i]} className={NUM}>
            {v == null ? "–" : COUNT.format(v)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The full table as the client delivered it: zones down the side,
 * structures across with a column per set, and the zone and set totals.
 */
function FullTable({ table }: { table: SmcTable }) {
  const th = "border border-border px-2 py-1 font-medium";
  const td = "border border-border px-2 py-1 text-right tabular-nums";
  const value = (v: number | undefined) => (v == null ? "–" : COUNT.format(v));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th rowSpan={2} className={th}>Zone</th>
            <th rowSpan={2} className={cn(th, "text-left")}>Name</th>
            {table.columns.map((c) => (
              <th key={c.structure} colSpan={c.sets.length} className={th}>
                {c.structure}
              </th>
            ))}
            {table.sets.map((s) => (
              <th key={s} rowSpan={2} className={th}>
                Total {s} SMC
              </th>
            ))}
            <th rowSpan={2} className={th}>Total SMC Zonewise</th>
          </tr>
          <tr>
            {table.columns.flatMap((c) =>
              c.sets.map((s) => (
                <th key={cellKey(c.structure, s)} className={cn(th, "font-normal text-muted-foreground")}>
                  {s}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {table.zones.map((z) => (
            <tr key={z.no}>
              <td className={cn(td, "text-center whitespace-nowrap")}>Zone {z.no}</td>
              <td className="border border-border px-2 py-1 whitespace-nowrap">{z.name}</td>
              {table.columns.flatMap((c) =>
                c.sets.map((s) => (
                  <td key={cellKey(c.structure, s)} className={td}>
                    {value(z.cells[cellKey(c.structure, s)])}
                  </td>
                )),
              )}
              {table.sets.map((s) => (
                <td key={s} className={td}>
                  {value(z.bySet[s])}
                </td>
              ))}
              <td className={cn(td, "font-medium")}>{value(z.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-medium">
          <tr>
            <td colSpan={2} rowSpan={2} className="border border-border px-2 py-1 text-center">
              Total
            </td>
            {table.columns.flatMap((c) =>
              c.sets.map((s) => (
                <td key={cellKey(c.structure, s)} className={td}>
                  {value(table.totals.cells[cellKey(c.structure, s)])}
                </td>
              )),
            )}
            {table.sets.map((s) => (
              <td key={s} rowSpan={2} className={td}>
                {value(table.totals.bySet[s])}
              </td>
            ))}
            <td rowSpan={2} className={td}>
              {value(table.totals.total)}
            </td>
          </tr>
          <tr>
            {/* Each structure's existing and potential together, as the
                delivered table's last row has them. */}
            {table.columns.map((c) => (
              <td key={c.structure} colSpan={c.sets.length} className={cn(td, "text-center")}>
                {value(c.sets.reduce((sum, s) => sum + (table.totals.cells[cellKey(c.structure, s)] ?? 0), 0))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * SMC Statistics in the Statistics panel: the structure and zone totals that
 * fit an 18rem column, and the client's full table a click away.
 */
export function SmcStatsBlock({ rows }: { rows: SmcZoneCount[] }) {
  const [open, setOpen] = useState(false);
  const table = useMemo(() => smcTable(rows), [rows]);
  if (table.zones.length === 0) return null;

  const grandTotals = [...table.sets.map((s) => table.totals.bySet[s]), table.totals.total];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          SMC Statistics
        </span>
        <Button variant="ghost" size="xs" className="h-5 gap-1 px-1.5 text-[11px]" onClick={() => setOpen(true)}>
          <Table2 className="size-3" strokeWidth={2} />
          Full table
        </Button>
      </div>

      <CountTable
        heading="Structure"
        columns={[...table.sets, "Total"]}
        rows={table.columns.map((c) => {
          const values = table.sets.map((s) => table.totals.cells[cellKey(c.structure, s)]);
          return {
            key: c.structure,
            label: c.structure,
            values: [...values, values.reduce<number>((sum, v) => sum + (v ?? 0), 0)],
          };
        })}
        total={grandTotals}
      />

      <CountTable
        heading="Zone"
        columns={[...table.sets, "Total"]}
        rows={table.zones.map((z) => ({
          key: String(z.no),
          label: `${z.no} · ${z.name}`,
          title: `Zone ${z.no} — ${z.name}`,
          values: [...table.sets.map((s) => z.bySet[s] ?? 0), z.total],
        }))}
        total={grandTotals}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>SMC Statistics</DialogTitle>
            <DialogDescription>
              Existing and potential soil &amp; moisture conservation structures in each zone.
            </DialogDescription>
          </DialogHeader>
          <FullTable table={table} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
