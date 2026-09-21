import { memo, useState } from "react";
import { PanelLeftClose, RotateCcw, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { LayerDot } from "@/components/LayerDot";
import {
  DEFAULT_RASTER_OPACITY,
  sectionLayers,
  type RasterYear,
  type SectionAccent,
  type SectionDef,
  type SectionLayer,
} from "@/lib/sections";
import { cn } from "@/lib/utils";

/**
 * The layers panel, floating over the map's top-left corner.
 *
 * It lists only what has been selected in the navbar's picker, which is the
 * change that makes a floating panel viable at all: the docked column had to
 * carry every layer in the seed, eighty-odd rows that no float could hold
 * without covering the map it annotates. Here the panel holds the handful of
 * layers someone is actually working with, so it stays short enough to sit on
 * the map, and the map gets the full width of the window.
 *
 * Selecting is the picker's job, and a layer arrives here already switched
 * on; this panel is where you switch it back off, pick a year and set
 * opacity. A row's × takes it out of the selection, so the panel can be
 * tidied where the clutter is rather than only from the picker.
 *
 * Each row leads with the colour the layer draws in, not an icon for its
 * geometry: matching a row to what is on the map is the question a legend
 * row has to answer, and a point-or-polygon glyph never answered it.
 */

/**
 * Subject filters for the panel.
 *
 * These cut across the seed's sections on purpose: forest cover lives in
 * Forest Layers but canopy height lives in Drone Analysis, and someone
 * looking at forest wants both. So the buckets are built from the subject
 * accent each section already carries (GROUP_STYLE in lib/sections.ts) rather
 * than from the section tree — which also means a new group picks up a
 * filter from its accent alone, with no edit here.
 *
 * Presentation only: no layer is named, and a section whose accent is not
 * listed falls under "Other" — which keeps a new subject colour visible in
 * the panel while filtered, rather than vanishing from every bucket.
 */
const FILTERS: { id: string; label: string; accents: SectionAccent[] }[] = [
  { id: "forest", label: "Forest", accents: ["forest", "change"] },
  { id: "trees", label: "Trees", accents: ["canopy", "carbon"] },
  { id: "land-water", label: "Land & water", accents: ["land", "water"] },
  { id: "imagery", label: "Imagery", accents: ["imagery"] },
  { id: "boundaries", label: "Boundaries", accents: ["infra"] },
  { id: "wildlife", label: "Wildlife", accents: ["fauna"] },
];

const FILTER_OF: Partial<Record<SectionAccent, string>> = Object.fromEntries(
  FILTERS.flatMap((f) => f.accents.map((accent) => [accent, f.id])),
);

const OTHER = { id: "other", label: "Other" };
const ALL = "all";

/**
 * The selected layers under one top-level group, in the same flattened order
 * the picker lists them in — so a row sits under the same heading in both.
 * Pending layers can't be selected, so they never reach here.
 */
function panelRows(section: SectionDef, selected: Record<string, boolean>): SectionLayer[] {
  return sectionLayers(section).filter((layer) => selected[layer.key]);
}

/**
 * Years as chips rather than a dropdown: the whole series is visible at once,
 * so how many years a theme has — and which are missing — is readable without
 * opening anything.
 */
function YearChips({
  label,
  years,
  year,
  onChange,
}: {
  label: string;
  years: RasterYear[];
  year: number | null;
  onChange: (year: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={`${label} year`}>
      {years.map((y) => {
        const active = y.year === year;
        return (
          <button
            key={y.year}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(y.year)}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums transition-colors",
              active
                ? "bg-brand font-semibold text-brand-foreground"
                : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
            )}
          >
            {y.label}
          </button>
        );
      })}
    </div>
  );
}

function OpacityControl({
  label,
  opacity,
  onChange,
}: {
  label: string;
  opacity: number;
  onChange: (opacity: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[11px] text-muted-foreground">Opacity</span>
      <Slider
        value={[Math.round(opacity * 100)]}
        min={0}
        max={100}
        step={5}
        aria-label={`${label} opacity`}
        onValueChange={([next]) => onChange(next / 100)}
        className="min-w-0 flex-1"
      />
      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  );
}

function LayerRow({
  row,
  checked,
  onToggle,
  onRemove,
  children,
}: {
  row: SectionLayer;
  checked: boolean;
  onToggle: () => void;
  onRemove: () => void;
  /** Expanded controls — only rendered while the layer is switched on. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/row rounded-lg transition-colors",
        // Chrome appears only around what is drawing, so the eye lands on the
        // layers in play rather than on the containers they sit in.
        checked && "bg-foreground/6 ring-1 ring-border/70",
      )}
    >
      {/* The whole row is the hit target — the checkbox is the indicator, not
          a separate control, so there is one tab stop and one click path. */}
      <div
        role="checkbox"
        aria-checked={checked}
        aria-label={`Show ${row.label} on the map`}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-foreground/5"
      >
        <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
        <LayerDot color={row.color} raster={row.raster} />
        <span className={cn("min-w-0 flex-1 truncate leading-tight", checked && "font-medium")}>
          {row.label}
        </span>
        {/* Deselect. Kept quiet until the row is hovered or focused, so the
            panel does not read as a column of close buttons. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${row.label} from the panel`}
          className="shrink-0 rounded text-muted-foreground/0 transition-colors group-hover/row:text-muted-foreground/60 hover:text-foreground! focus-visible:text-muted-foreground focus-visible:outline-none"
        >
          <X className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
      {checked && children && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}

/** One subject filter. "All" is always first and always present. */
function FilterChip({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "h-6 shrink-0 rounded-full px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-brand text-brand-foreground"
          : "bg-foreground/5 text-muted-foreground ring-1 ring-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SidebarSectionsImpl({
  sections,
  selected,
  visibility,
  onToggleLayer,
  onDeselectLayer,
  onResetLayers,
  onCollapse,
  rasterYear,
  onRasterYearChange,
  rasterOpacity,
  onRasterOpacityChange,
}: {
  sections: SectionDef[];
  /** Toggle key → selected in the navbar picker, i.e. listed in this panel. */
  selected: Record<string, boolean>;
  /** Toggle key → drawing on the map. A subset of `selected`. */
  visibility: Record<string, boolean>;
  onToggleLayer: (key: string) => void;
  /** Takes a layer back out of the selection, and off the map with it. */
  onDeselectLayer: (key: string) => void;
  /** Switches every selected layer off, without deselecting any. */
  onResetLayers: () => void;
  /** Folds the panel away. Omitted where there is nothing to fold into. */
  onCollapse?: () => void;
  /** Group id → selected year. */
  rasterYear: Record<string, number>;
  onRasterYearChange: (sectionId: string, year: number) => void;
  /** Group id → 0..1 opacity. Absent means DEFAULT_RASTER_OPACITY. */
  rasterOpacity: Record<string, number>;
  onRasterOpacityChange: (sectionId: string, opacity: number) => void;
}) {
  const [filter, setFilter] = useState(ALL);

  // Only the groups that have something selected in them are drawn, so the
  // panel is exactly as tall as the work in progress.
  const all = sections
    .map((section) => ({ section, rows: panelRows(section, selected) }))
    .filter(({ rows }) => rows.length > 0);

  // The counts describe the whole selection, not the filtered view: the header
  // is there to say what is on, and a filter is a way of looking rather than a
  // change to what is drawn.
  const total = all.reduce((sum, g) => sum + g.rows.length, 0);
  const onCount = all.reduce(
    (sum, g) => sum + g.rows.filter((row) => visibility[row.key]).length,
    0,
  );

  // Only the filters that have something behind them, and only when there is
  // more than one — a filter offering a single choice is noise.
  const present = new Set(
    all.flatMap(({ rows }) => rows.map((row) => FILTER_OF[row.accent] ?? "other")),
  );
  const chips = [...FILTERS.map(({ id, label }) => ({ id, label })), OTHER].filter((f) =>
    present.has(f.id),
  );
  const showChips = chips.length > 1;

  // Derived rather than stored: deselecting the last forest layer would
  // otherwise leave the panel filtered to a subject that no longer exists,
  // showing nothing, with no effect needed to repair it.
  const active = showChips && chips.some((f) => f.id === filter) ? filter : ALL;

  const groups =
    active === ALL
      ? all
      : all
          .map(({ section, rows }) => ({
            section,
            rows: rows.filter((row) => (FILTER_OF[row.accent] ?? OTHER.id) === active),
          }))
          .filter(({ rows }) => rows.length > 0);

  return (
    <div data-tour="sections" className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-1.5">
        <p className="text-[13px] font-semibold">Layers</p>
        {total > 0 && (
          <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
            {onCount} of {total} on
          </p>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* Reduced to its icon so the header can carry the count as well.
              A third piece of text beside "Layers" and "1 of 17 on" left the
              row too tight to read in a panel this narrow. */}
          <button
            type="button"
            onClick={onResetLayers}
            disabled={onCount === 0}
            aria-label="Switch every layer off"
            title="Switch every layer off"
            className="text-muted-foreground/60 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <RotateCcw className="size-3.5" strokeWidth={2} />
          </button>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Hide the layers panel"
              className="text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              <PanelLeftClose className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {showChips && (
        // Scrolls sideways rather than wrapping: wrapping costs the panel a
        // whole row of height for one overflowing chip, and this sits on top
        // of the map.
        <div
          role="group"
          aria-label="Filter layers by subject"
          className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-none"
        >
          <FilterChip label="All" active={active === ALL} onSelect={() => setFilter(ALL)} />
          {chips.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              active={active === f.id}
              onSelect={() => setFilter(f.id)}
            />
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 scrollbar-thin">
        {groups.length === 0 ? (
          <p className="px-2.5 py-3 text-xs leading-relaxed text-muted-foreground">
            No layers selected yet. Open{" "}
            <span className="font-medium text-foreground">Layers</span> in the top bar and tick a
            section to choose from it.
          </p>
        ) : (
          groups.map(({ section, rows }, i) => (
            <section key={section.id} data-tour={i === 0 ? "section-theme" : undefined}>
              <div className="flex items-center justify-between gap-2 px-2 pt-2 pb-1">
                {/* Uppercase and letter-spaced, as the reference image sets
                    its panel headings — it is what separates a heading from
                    the layer names under it without a rule or a heavier
                    weight. */}
                <h3 className="min-w-0 truncate text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                  {section.label}
                </h3>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/40">
                  {rows.length}
                </span>
              </div>

              {/* Spaced rather than stacked flush: a switched-on row is a
                  card with its own controls inside it, and two of those
                  touching read as one box with a seam. */}
              <div className="flex flex-col gap-2">
                {rows.map((row) => (
                  <LayerRow
                    key={row.key}
                    row={row}
                    checked={Boolean(visibility[row.key])}
                    onToggle={() => onToggleLayer(row.key)}
                    onRemove={() => onDeselectLayer(row.key)}
                  >
                    {row.raster && (
                      <div className="flex flex-col gap-2">
                        {row.raster.years.length > 1 && (
                          <YearChips
                            label={row.label}
                            years={row.raster.years}
                            year={rasterYear[row.raster.id] ?? row.raster.years.at(-1)?.year ?? null}
                            onChange={(year) => onRasterYearChange(row.raster!.id, year)}
                          />
                        )}
                        <OpacityControl
                          label={row.label}
                          opacity={rasterOpacity[row.raster.id] ?? DEFAULT_RASTER_OPACITY}
                          onChange={(opacity) => onRasterOpacityChange(row.raster!.id, opacity)}
                        />
                      </div>
                    )}
                  </LayerRow>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

// Memoised because the dashboard re-renders on state this panel has nothing
// to do with — opening the mobile sheet, running the walkthrough — and its
// props are all stable across those.
export const SidebarSections = memo(SidebarSectionsImpl);
