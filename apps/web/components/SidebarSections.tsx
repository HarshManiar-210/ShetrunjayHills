import { memo } from "react";
import { type LucideIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_RASTER_OPACITY,
  iconForGeometry,
  rasterToggleKey,
  type RasterYear,
  type SectionAccent,
  type SectionDef,
} from "@/lib/sections";
import { cn } from "@/lib/utils";

/**
 * The layers column, built to the client's mockup.
 *
 * The shape it replaces stacked every group in its own raised, hue-washed card
 * — legible at a dozen layers, a wall of competing boxes at eighty. The
 * mockup's answer is a flat list: a plain heading per group with a count, then
 * one quiet row per layer, and chrome only around whichever layer is switched
 * on and expanded. That inverts what carries emphasis, so the eye lands on
 * what is drawing rather than on the container it sits in.
 *
 * The tree from the API still drives it. A group becomes a heading; a raster
 * theme (which is one layer with years) and a vector layer both become rows,
 * so the two-level structure flattens to exactly the heading-and-rows the
 * mockup draws.
 */

/**
 * Subject colour per group, resolved to the --sec-* tokens in globals.css.
 * Now only tints a row's icon rather than washing a whole card, so the column
 * still scans by subject without the hue doing the shouting.
 */
const ACCENT_TEXT: Record<SectionAccent, string> = {
  forest: "text-sec-forest",
  canopy: "text-sec-canopy",
  change: "text-sec-change",
  land: "text-sec-land",
  imagery: "text-sec-imagery",
  water: "text-sec-water",
  infra: "text-sec-infra",
  fauna: "text-sec-fauna",
  carbon: "text-sec-carbon",
};

/** Switched-on rows wear the amber accent, matching the mockup. */
const BRAND_SWITCH = "data-checked:bg-brand";

function LayerRow({
  label,
  icon: Icon,
  accentClass,
  iconColor,
  checked,
  onToggle,
  children,
}: {
  label: string;
  icon: LucideIcon;
  /** Subject tint for the icon, when the row has no colour of its own. */
  accentClass?: string;
  /** The exact colour this layer draws in, so the row doubles as a key. */
  iconColor?: string;
  checked: boolean;
  onToggle: () => void;
  /** Expanded controls — only rendered for the layer that is switched on. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg transition-colors",
        // Chrome appears only around the active layer, so it reads as the one
        // thing currently in play rather than one card among eighty.
        checked && "bg-card/70 ring-1 ring-border/70",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-foreground/5"
      >
        <Icon
          className={cn("size-3.5 shrink-0", !iconColor && (accentClass ?? "text-muted-foreground"))}
          style={iconColor ? { color: iconColor } : undefined}
          strokeWidth={2}
        />
        <span className={cn("min-w-0 flex-1 leading-tight", checked && "font-medium")}>
          {label}
        </span>
        <Switch
          size="sm"
          checked={checked}
          className={BRAND_SWITCH}
          aria-label={`Toggle ${label} layer`}
          tabIndex={-1}
        />
      </div>
      {checked && children && <div className="px-2.5 pb-2.5">{children}</div>}
    </div>
  );
}

/** A layer the client has listed but not delivered data for. */
function PendingRow({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm">
      <Icon className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={2} />
      <span className="min-w-0 flex-1 leading-tight text-muted-foreground/50">{label}</span>
      <span className="shrink-0 text-[10px] font-medium text-brand/70">Coming soon</span>
    </div>
  );
}

/**
 * Years as chips rather than a dropdown, per the mockup: the whole series is
 * visible at once, so how many years a theme has — and which are missing — is
 * readable without opening anything.
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

/**
 * One row per switchable thing under a heading. A raster theme is a single
 * layer with years, so it collapses to a row that expands into its chips and
 * opacity; a vector layer is a row with nothing to expand.
 */
function GroupRows({
  section,
  visibility,
  onToggleSection,
  onToggleItem,
  rasterYear,
  onRasterYearChange,
  rasterOpacity,
  onRasterOpacityChange,
}: {
  section: SectionDef;
  visibility: Record<string, boolean>;
  onToggleSection: (id: string, on: boolean) => void;
  onToggleItem: (key: string) => void;
  rasterYear: Record<string, number>;
  onRasterYearChange: (sectionId: string, year: number) => void;
  rasterOpacity: Record<string, number>;
  onRasterOpacityChange: (sectionId: string, opacity: number) => void;
}) {
  return (
    <>
      {section.items.map((item) =>
        item.pending ? (
          <PendingRow
            key={item.key}
            label={item.label}
            icon={item.icon ?? iconForGeometry(item.geometryKind)}
          />
        ) : (
          <LayerRow
            key={item.key}
            label={item.label}
            icon={item.icon ?? iconForGeometry(item.geometryKind)}
            iconColor={item.color}
            checked={Boolean(visibility[item.key])}
            onToggle={() => onToggleItem(item.key)}
          />
        ),
      )}

      {section.children.map((child) => {
        if (child.mode === "layer") {
          const key = rasterToggleKey(child.id);
          const on = Boolean(visibility[key]);
          return (
            <LayerRow
              key={child.id}
              label={child.label}
              icon={child.icon}
              accentClass={ACCENT_TEXT[child.accent]}
              checked={on}
              onToggle={() => onToggleSection(child.id, !on)}
            >
              <div className="flex flex-col gap-2">
                {child.years.length > 1 && (
                  <YearChips
                    label={child.label}
                    years={child.years}
                    year={rasterYear[child.id] ?? child.years.at(-1)?.year ?? null}
                    onChange={(year) => onRasterYearChange(child.id, year)}
                  />
                )}
                <OpacityControl
                  label={child.label}
                  opacity={rasterOpacity[child.id] ?? DEFAULT_RASTER_OPACITY}
                  onChange={(opacity) => onRasterOpacityChange(child.id, opacity)}
                />
              </div>
            </LayerRow>
          );
        }

        // A nested group of vector layers: its rows join this heading's list
        // rather than opening a second level of headings, which is what keeps
        // the column as flat as the mockup draws it.
        return (
          <GroupRows
            key={child.id}
            section={child}
            visibility={visibility}
            onToggleSection={onToggleSection}
            onToggleItem={onToggleItem}
            rasterYear={rasterYear}
            onRasterYearChange={onRasterYearChange}
            rasterOpacity={rasterOpacity}
            onRasterOpacityChange={onRasterOpacityChange}
          />
        );
      })}

      {/* A heading with no rows at all would otherwise be a bare label. */}
      {section.items.length === 0 && section.children.length === 0 && (
        <p className="px-2.5 py-2 text-xs text-muted-foreground/50 italic">No layers yet</p>
      )}
    </>
  );
}

/** How many switchable layers a heading covers, for the count beside it. */
function layerCount(section: SectionDef): number {
  if (section.mode === "layer") return 1;
  return (
    section.items.length + section.children.reduce((sum, child) => sum + layerCount(child), 0)
  );
}

function SidebarSectionsImpl({
  sections,
  visibility,
  onToggleSection,
  onToggleItem,
  onResetLayers,
  rasterYear,
  onRasterYearChange,
  rasterOpacity,
  onRasterOpacityChange,
}: {
  sections: SectionDef[];
  /** Toggle key → on, across every group at once. See lib/sections.ts. */
  visibility: Record<string, boolean>;
  onToggleSection: (id: string, on: boolean) => void;
  onToggleItem: (key: string) => void;
  /** Switches everything off — the mockup's "Reset view". */
  onResetLayers: () => void;
  /** Group id → selected year. */
  rasterYear: Record<string, number>;
  onRasterYearChange: (sectionId: string, year: number) => void;
  /** Group id → 0..1 opacity. Absent means DEFAULT_RASTER_OPACITY. */
  rasterOpacity: Record<string, number>;
  onRasterOpacityChange: (sectionId: string, opacity: number) => void;
}) {
  const total = sections.reduce((sum, section) => sum + layerCount(section), 0);
  const onCount = Object.values(visibility).filter(Boolean).length;

  return (
    <div data-tour="sections" className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
          Layers · {total}
        </p>
        <button
          type="button"
          onClick={onResetLayers}
          disabled={onCount === 0}
          className="text-[11px] font-medium text-brand transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
        >
          Reset view
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
        {sections.map((section, i) => (
          <section key={section.id} data-tour={i === 0 ? "section-theme" : undefined}>
            <div className="flex items-center justify-between gap-2 px-2.5 pt-3 pb-1">
              <h3 className="min-w-0 truncate text-[11px] font-medium text-muted-foreground/70">
                {section.label}
              </h3>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/40">
                {layerCount(section)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <GroupRows
                section={section}
                visibility={visibility}
                onToggleSection={onToggleSection}
                onToggleItem={onToggleItem}
                rasterYear={rasterYear}
                onRasterYearChange={onRasterYearChange}
                rasterOpacity={rasterOpacity}
                onRasterOpacityChange={onRasterOpacityChange}
              />
            </div>
          </section>
        ))}
      </div>

      <p className="shrink-0 border-t border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
        {onCount === 0 ? "No layers visible" : `${onCount} layer${onCount === 1 ? "" : "s"} visible`}
      </p>
    </div>
  );
}

// Memoised because the dashboard re-renders on state this column has nothing
// to do with — opening the mobile sheet, running the walkthrough — and its
// props are all stable across those.
export const SidebarSections = memo(SidebarSectionsImpl);
