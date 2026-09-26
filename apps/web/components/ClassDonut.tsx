"use client";

import { useState } from "react";
import type { NamedClassStat } from "@/lib/raster-stats-api";

/**
 * Part-to-whole donut for a raster theme's classes — the brief's "Pi-Chart
 * generated directly from layer statistics".
 *
 * Only drawn for six classes or fewer. Past that a ring stops being readable
 * and StatsPanel falls back to the stacked bar and table, which is why
 * Vegetation Change's nineteen transition classes never reach this component.
 *
 * The slice colours are the imagery's own, not a validated categorical
 * palette. That is a deliberate exception: the chart's entire job is to say
 * "this yellow, the one covering the hills on the map, is 43.9% of the
 * footprint". Recolouring the slices to pass a contrast check would break the
 * only link that makes the chart mean anything. Identity is never carried by
 * colour alone — every slice is named in the table beside it, and hovering
 * one names it in the middle of the ring.
 */

const SIZE = 104;
const RADIUS = 40;
const STROKE = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Surface gap between slices, in units of circumference. */
const GAP = 2;

const PERCENT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function ClassDonut({
  classes,
  /** Announced to screen readers and shown in the ring when nothing is hovered. */
  caption,
}: {
  classes: NamedClassStat[];
  caption: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  // The hovered class, else the largest: classes can arrive in legend order
  // (delivered figures) rather than sorted by share.
  const shown =
    classes.find((c) => c.key === hovered) ??
    classes.reduce<NamedClassStat | null>((top, c) => (!top || c.share > top.share ? c : top), null);

  // Each slice starts where the ones before it end. Computed by scanning the
  // preceding shares rather than by accumulating into a variable during the
  // map — at six slices the cost is nothing and nothing mutates mid-render.
  const arcs = classes.map((cls, i) => ({
    cls,
    length: cls.share * CIRCUMFERENCE,
    offset: classes.slice(0, i).reduce((sum, c) => sum + c.share, 0) * CIRCUMFERENCE,
  }));

  const summary = classes
    .map((c) => `${c.label} ${PERCENT.format(c.share * 100)}%`)
    .join(", ");

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-[104px] shrink-0"
        role="img"
        aria-label={`${caption}. ${summary}`}
      >
        {/* -90° so the ring starts at twelve o'clock rather than three. */}
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs.map(({ cls, length, offset: at }) => {
            // Never shrink a slice to nothing: a class at 0.1% must still be
            // visible as a tick, and the gap would otherwise consume it.
            const drawn = Math.max(length - GAP, 1);
            return (
              <circle
                key={cls.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={cls.color}
                strokeWidth={hovered === cls.key ? STROKE + 3 : STROKE}
                strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
                strokeDashoffset={-at}
                className="cursor-default transition-[stroke-width,opacity]"
                opacity={hovered && hovered !== cls.key ? 0.45 : 1}
                onMouseEnter={() => setHovered(cls.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${cls.label} — ${PERCENT.format(cls.share * 100)}%`}</title>
              </circle>
            );
          })}
        </g>

        {/* The hovered class, or the largest one, read out in the middle.
            Text wears ink tokens rather than the slice colour. */}
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 2}
          textAnchor="middle"
          className="fill-foreground text-[15px] font-semibold tabular-nums"
        >
          {PERCENT.format((shown?.share ?? 0) * 100)}%
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 11}
          textAnchor="middle"
          className="fill-muted-foreground text-[7px]"
        >
          {truncate(shown?.label ?? "", 18)}
        </text>
      </svg>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
