import { Layers, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { iconForGeometry, type RasterYear, type SectionAccent, type SectionDef } from "@/lib/sections";
import { cn } from "@/lib/utils";

/**
 * Subject colour per section, resolved to the --sec-* tokens in globals.css.
 * Written out as whole class strings because Tailwind scans for literals — a
 * template built from the accent name at runtime would generate nothing.
 */
const ACCENT_STYLES: Record<
  SectionAccent,
  {
    chip: string;
    idle: string;
    header: string;
    edge: string;
    /** Closed-state border — the section's own hue, not neutral grey. */
    idleEdge: string;
    /** Hairline under the header, in the section's hue. */
    rule: string;
  }
> = {
  forest: {
    chip: "bg-sec-forest/14 text-sec-forest ring-sec-forest/30",
    idle: "from-sec-forest/8 to-sec-forest/2",
    header: "from-sec-forest/24 to-sec-forest/7",
    edge: "border-sec-forest/75 ring-sec-forest/25",
    idleEdge: "border-sec-forest/45 hover:border-sec-forest/70",
    rule: "border-sec-forest/25",
  },
  canopy: {
    chip: "bg-sec-canopy/14 text-sec-canopy ring-sec-canopy/30",
    idle: "from-sec-canopy/8 to-sec-canopy/2",
    header: "from-sec-canopy/24 to-sec-canopy/7",
    edge: "border-sec-canopy/75 ring-sec-canopy/25",
    idleEdge: "border-sec-canopy/45 hover:border-sec-canopy/70",
    rule: "border-sec-canopy/25",
  },
  change: {
    chip: "bg-sec-change/14 text-sec-change ring-sec-change/30",
    idle: "from-sec-change/8 to-sec-change/2",
    header: "from-sec-change/24 to-sec-change/7",
    edge: "border-sec-change/75 ring-sec-change/25",
    idleEdge: "border-sec-change/45 hover:border-sec-change/70",
    rule: "border-sec-change/25",
  },
  land: {
    chip: "bg-sec-land/14 text-sec-land ring-sec-land/30",
    idle: "from-sec-land/8 to-sec-land/2",
    header: "from-sec-land/24 to-sec-land/7",
    edge: "border-sec-land/75 ring-sec-land/25",
    idleEdge: "border-sec-land/45 hover:border-sec-land/70",
    rule: "border-sec-land/25",
  },
  imagery: {
    chip: "bg-sec-imagery/14 text-sec-imagery ring-sec-imagery/30",
    idle: "from-sec-imagery/8 to-sec-imagery/2",
    header: "from-sec-imagery/24 to-sec-imagery/7",
    edge: "border-sec-imagery/75 ring-sec-imagery/25",
    idleEdge: "border-sec-imagery/45 hover:border-sec-imagery/70",
    rule: "border-sec-imagery/25",
  },
  water: {
    chip: "bg-sec-water/14 text-sec-water ring-sec-water/30",
    idle: "from-sec-water/8 to-sec-water/2",
    header: "from-sec-water/24 to-sec-water/7",
    edge: "border-sec-water/75 ring-sec-water/25",
    idleEdge: "border-sec-water/45 hover:border-sec-water/70",
    rule: "border-sec-water/25",
  },
  infra: {
    chip: "bg-sec-infra/14 text-sec-infra ring-sec-infra/30",
    idle: "from-sec-infra/8 to-sec-infra/2",
    header: "from-sec-infra/24 to-sec-infra/7",
    edge: "border-sec-infra/75 ring-sec-infra/25",
    idleEdge: "border-sec-infra/45 hover:border-sec-infra/70",
    rule: "border-sec-infra/25",
  },
  fauna: {
    chip: "bg-sec-fauna/14 text-sec-fauna ring-sec-fauna/30",
    idle: "from-sec-fauna/8 to-sec-fauna/2",
    header: "from-sec-fauna/24 to-sec-fauna/7",
    edge: "border-sec-fauna/75 ring-sec-fauna/25",
    idleEdge: "border-sec-fauna/45 hover:border-sec-fauna/70",
    rule: "border-sec-fauna/25",
  },
  carbon: {
    chip: "bg-sec-carbon/14 text-sec-carbon ring-sec-carbon/30",
    idle: "from-sec-carbon/8 to-sec-carbon/2",
    header: "from-sec-carbon/24 to-sec-carbon/7",
    edge: "border-sec-carbon/75 ring-sec-carbon/25",
    idleEdge: "border-sec-carbon/45 hover:border-sec-carbon/70",
    rule: "border-sec-carbon/25",
  },
};

// Each section is a raised box with a tinted header strip, so a column of them
// still reads as discrete groups rather than one long undifferentiated run of
// rows. `children` is what sits inside the box below the header — a section
// that is a bare switch has none, and then the box is only its header.
//
// The icon chip and the box's own border always carry the section's subject
// colour, which is what makes the column scannable at a glance. `active` turns
// everything up — a near-solid border, a washed header, a ring and a lift off
// the page — so with only one section open at a time the open one is
// unmistakable.
function SidebarSectionBox({
  label,
  icon: Icon,
  accent,
  active,
  right,
  tourTarget,
  children,
}: {
  label: string;
  icon: LucideIcon;
  accent: SectionAccent;
  active: boolean;
  right?: React.ReactNode;
  tourTarget?: string;
  children?: React.ReactNode;
}) {
  const hasBody = Boolean(children);
  const style = ACCENT_STYLES[accent];

  return (
    <section
      data-tour={tourTarget}
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-all duration-200",
        active
          ? cn("shadow-e3 ring-1", style.edge)
          : cn("shadow-e2 hover:-translate-y-px hover:shadow-e3", style.idleEdge),
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 px-2.5 py-2 transition-colors",
          // Both states wash the header in the section's own hue; the open one
          // just does it three times as strongly.
          "bg-linear-to-b",
          active ? style.header : style.idle,
          hasBody && cn("border-b", active ? style.rule : "border-border/50"),
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-md ring-1 shadow-e1 transition-colors",
              style.chip,
            )}
          >
            <Icon className="size-3" strokeWidth={2.25} />
          </span>
          <p
            className={cn(
              "truncate text-[11px] font-semibold tracking-wider uppercase transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
        </span>
        {right}
      </header>
      {hasBody && <div className="p-1">{children}</div>}
    </section>
  );
}

function ToggleItemRow({
  label,
  icon: Icon,
  color,
  enabled,
  checked,
  onActivate,
}: {
  label: string;
  icon: LucideIcon;
  /**
   * The colour this layer actually renders in on the map, so the row is a key
   * as well as a switch.
   */
  color: string;
  enabled: boolean;
  checked: boolean;
  onActivate: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={!enabled}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        !enabled && "cursor-not-allowed text-muted-foreground/60",
        // A checked row keeps the tint whether or not the pointer is on it, so
        // you can read off what is drawn without hunting for lit switches.
        enabled && checked && "cursor-pointer bg-primary/12 font-medium text-foreground",
        enabled && !checked && "cursor-pointer text-foreground/80 hover:bg-primary/8 hover:text-primary",
      )}
    >
      <Icon
        className={cn("size-4 transition-colors", !enabled && "text-muted-foreground/60")}
        style={enabled ? { color } : undefined}
        strokeWidth={1.75}
      />
      <span className="flex-1">{label}</span>
      <Switch size="sm" checked={checked} aria-disabled={!enabled} aria-label={`Toggle ${label} layer`} tabIndex={-1} />
    </div>
  );
}

// No data yet — not a switch at all, just a label announcing what's coming.
function PendingItemRow({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground/60">
      <Icon className="size-4 text-muted-foreground/50" strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Pending
      </span>
    </div>
  );
}

// Multi-year rasters show one year at a time, so the year is a dropdown rather
// than another set of switches.
function YearControl({
  label,
  years,
  year,
  enabled,
  onChange,
  onDisabledClick,
}: {
  label: string;
  years: RasterYear[];
  year: number | null;
  enabled: boolean;
  onChange: (year: number) => void;
  onDisabledClick: () => void;
}) {
  const current = years.find((y) => y.year === year);
  return (
    <div className="px-1.5 py-1">
      <span className="mb-1 block text-xs text-muted-foreground/80">Year</span>
      {enabled ? (
        <Select value={year != null ? String(year) : undefined} onValueChange={(v) => onChange(Number(v))}>
          <SelectTrigger className="h-8 w-full text-sm" aria-label={`Select ${label} year`}>
            <SelectValue placeholder="Select a year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y.year} value={String(y.year)}>
                {y.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <button
          type="button"
          onClick={onDisabledClick}
          className="flex h-8 w-full cursor-not-allowed items-center rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground/60"
        >
          {current?.label ?? "Select a year"}
        </button>
      )}
    </div>
  );
}

export function SidebarSections({
  sections,
  activeSection,
  onToggleSection,
  visibility,
  onToggleItem,
  rasterYear,
  onRasterYearChange,
  onDisabledClick,
}: {
  sections: SectionDef[];
  activeSection: string | null;
  onToggleSection: (section: string, on: boolean) => void;
  /** Toggle key → on, for the section currently open. */
  visibility: Record<string, boolean>;
  onToggleItem: (key: string) => void;
  /** Section id → selected year. */
  rasterYear: Record<string, number>;
  onRasterYearChange: (sectionId: string, year: number) => void;
  onDisabledClick: (section: string) => void;
}) {
  return (
    <div data-tour="sections" className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/50 bg-panel/85 px-4 py-2.5 backdrop-blur-sm">
        <Layers className="size-3.5 shrink-0 text-primary" strokeWidth={2.25} />
        <p className="text-[11px] font-semibold tracking-[0.14em] text-foreground/70 uppercase">
          Map Layers
        </p>
        {activeSection && (
          <span className="ml-auto min-w-0 truncate rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/25">
            {activeSection}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        {sections.map((section, i) => {
          const on = activeSection === section.label;
          const years = section.years;

          const body =
            section.mode === "layer" ? (
              // A single-image raster (Ortho, DSM, …) has nothing to choose
              // between either — same bare on/off switch as a single-item
              // vector section, no dropdown.
              years.length > 1 ? (
                <YearControl
                  label={section.label}
                  years={years}
                  year={rasterYear[section.id] ?? years.at(-1)?.year ?? null}
                  enabled={on}
                  onChange={(year) => onRasterYearChange(section.id, year)}
                  onDisabledClick={() => onDisabledClick(section.label)}
                />
              ) : null
              // A single-item section has nothing to choose between, so the
              // section switch above is the only control it needs.
            ) : section.items.length > 1 ? (
              section.items.map((item) =>
                item.pending ? (
                  <PendingItemRow
                    key={item.key}
                    label={item.label}
                    icon={item.icon ?? iconForGeometry(item.geometryKind)}
                  />
                ) : (
                  <ToggleItemRow
                    key={item.key}
                    label={item.label}
                    icon={item.icon ?? iconForGeometry(item.geometryKind)}
                    color={item.color}
                    enabled={on}
                    checked={Boolean(visibility[item.key])}
                    onActivate={() => {
                      if (!on) onDisabledClick(section.label);
                      else onToggleItem(item.key);
                    }}
                  />
                ),
              )
            ) : null;

          return (
            <SidebarSectionBox
              key={section.label}
              label={section.label}
              icon={section.icon}
              accent={section.accent}
              active={on}
              // The walkthrough points at the first section as its example of
              // "switch a section on"; the rest need no target of their own.
              tourTarget={i === 0 ? "section-theme" : undefined}
              right={
                <Switch
                  size="sm"
                  checked={on}
                  onCheckedChange={(checked) => onToggleSection(section.label, checked)}
                  aria-label={`Toggle ${section.label}`}
                />
              }
            >
              {body}
            </SidebarSectionBox>
          );
        })}
      </div>
    </div>
  );
}
