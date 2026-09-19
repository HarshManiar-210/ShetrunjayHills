import { memo } from "react";
import { ChevronDown, Layers, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  iconForGeometry,
  sectionIsExpandable,
  sectionToggleKeys,
  type RasterYear,
  type SectionAccent,
  type SectionDef,
} from "@/lib/sections";
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
  depth,
  active,
  expandable,
  expanded,
  onToggleExpanded,
  right,
  tourTarget,
  children,
}: {
  label: string;
  icon: LucideIcon;
  accent: SectionAccent;
  /** 0 for a top-level heading. Nested groups get lighter chrome. */
  depth: number;
  /** Something in this section is drawing. Independent of `expanded`. */
  active: boolean;
  expandable: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  right?: React.ReactNode;
  tourTarget?: string;
  children?: React.ReactNode;
}) {
  const hasBody = expandable && expanded && Boolean(children);
  const style = ACCENT_STYLES[accent];

  // Only the top level is set in wide-tracked small caps. Nested groups sit
  // in a column already narrowed by their parent's padding, and uppercase
  // plus letter-spacing costs roughly a third of the width — enough to
  // truncate "Existing Water Conservation" and "Forest Cover (Yearwise)".
  // Sentence case wraps instead of eliding, so full names stay readable.
  const labelClass =
    depth === 0
      ? "min-w-0 text-[11px] font-semibold tracking-wider break-words uppercase transition-colors"
      : "min-w-0 text-xs font-medium break-words transition-colors";

  return (
    <section
      data-tour={tourTarget}
      className={cn(
        "overflow-hidden border transition-all duration-200",
        // A nested group is a card *inside* a card, so it drops the elevation
        // and the hover lift — stacking those at three levels turns the
        // column into a pile of competing boxes.
        depth === 0
          ? cn(
              "rounded-xl bg-card",
              active
                ? cn("shadow-e3 ring-1", style.edge)
                : cn("shadow-e2 hover:-translate-y-px hover:shadow-e3", style.idleEdge),
            )
          : cn("rounded-lg bg-card/40", active ? style.edge : style.idleEdge),
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 px-2.5 py-2 transition-colors",
          // Both states wash the header in the section's own hue; a section
          // that is drawing just does it three times as strongly.
          "bg-linear-to-b",
          active ? style.header : style.idle,
          hasBody && cn("border-b", active ? style.rule : "border-border/50"),
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-md ring-1 shadow-e1 transition-colors",
              style.chip,
            )}
          >
            <Icon className="size-3" strokeWidth={2.25} />
          </span>
          {/* The name is the disclosure control, so reaching a section's rows
              never touches the switch that decides what draws — the two were
              the same gesture under the old accordion and are now separate
              concerns. A section with nothing to disclose stays plain text. */}
          {expandable ? (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              className="flex min-w-0 flex-1 items-center gap-1 text-left"
            >
              <p className={cn(labelClass, active ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </p>
              <ChevronDown
                className={cn(
                  "size-3 shrink-0 text-muted-foreground transition-transform",
                  !expanded && "-rotate-90",
                )}
                strokeWidth={2.5}
              />
            </button>
          ) : (
            <p className={cn(labelClass, active ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </p>
          )}
        </span>
        {right}
      </header>
      {hasBody && <div className="p-1">{children}</div>}
    </section>
  );
}

// Every row is independently switchable — there is no "enable the section
// first" step any more, and any number of rows across any number of sections
// can be on at once.
function ToggleItemRow({
  label,
  icon: Icon,
  color,
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
  checked: boolean;
  onActivate: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        // A checked row keeps the tint whether or not the pointer is on it, so
        // you can read off what is drawn without hunting for lit switches.
        checked
          ? "bg-primary/12 font-medium text-foreground"
          : "text-foreground/80 hover:bg-primary/8 hover:text-primary",
      )}
    >
      <Icon className="size-4 transition-colors" style={{ color }} strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      <Switch size="sm" checked={checked} aria-label={`Toggle ${label} layer`} tabIndex={-1} />
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
// Always live, even while the theme is switched off: picking the year you
// want before turning the imagery on is a reasonable order to work in, and
// the choice is remembered either way.
function YearControl({
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
    <div className="px-1.5 py-1">
      <span className="mb-1 block text-xs text-muted-foreground/80">Year</span>
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
    </div>
  );
}

/**
 * One node of the tree: its header switch, its own layers, then its child
 * groups. Recursive, because the client's structure nests (Forest Layers >
 * Forest Cover > its years) and the depth is set by seed rows, not by code.
 */
function SectionNode({
  section,
  visibility,
  expanded,
  onToggleExpanded,
  onToggleSection,
  onToggleItem,
  rasterYear,
  onRasterYearChange,
  tourTarget,
}: {
  section: SectionDef;
  visibility: Record<string, boolean>;
  expanded: Record<string, boolean>;
  onToggleExpanded: (id: string) => void;
  onToggleSection: (id: string, on: boolean) => void;
  onToggleItem: (key: string) => void;
  rasterYear: Record<string, number>;
  onRasterYearChange: (sectionId: string, year: number) => void;
  tourTarget?: string;
}) {
  const keys = sectionToggleKeys(section);
  // The header switch is on only when everything beneath it is on, so a group
  // with some rows checked reads as off and turning it on fills in the rest.
  const allOn = keys.length > 0 && keys.every((key) => visibility[key]);
  const anyOn = keys.some((key) => visibility[key]);

  const body = (
    <>
      {section.mode === "layer" && section.years.length > 1 && (
        <YearControl
          label={section.label}
          years={section.years}
          year={rasterYear[section.id] ?? section.years.at(-1)?.year ?? null}
          onChange={(year) => onRasterYearChange(section.id, year)}
        />
      )}

      {section.items.map((item) =>
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
            checked={Boolean(visibility[item.key])}
            onActivate={() => onToggleItem(item.key)}
          />
        ),
      )}

      {section.children.length > 0 && (
        <div className="flex flex-col gap-1.5 p-1">
          {section.children.map((child) => (
            <SectionNode
              key={child.id}
              section={child}
              visibility={visibility}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
              onToggleSection={onToggleSection}
              onToggleItem={onToggleItem}
              rasterYear={rasterYear}
              onRasterYearChange={onRasterYearChange}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <SidebarSectionBox
      label={section.label}
      icon={section.icon}
      accent={section.accent}
      depth={section.depth}
      active={anyOn}
      expandable={sectionIsExpandable(section)}
      expanded={Boolean(expanded[section.id])}
      onToggleExpanded={() => onToggleExpanded(section.id)}
      tourTarget={tourTarget}
      right={
        <Switch
          size="sm"
          checked={allOn}
          onCheckedChange={(checked) => onToggleSection(section.id, checked)}
          aria-label={`Toggle ${section.label}`}
        />
      }
    >
      {body}
    </SidebarSectionBox>
  );
}

function SidebarSectionsImpl({
  sections,
  visibility,
  expanded,
  onToggleExpanded,
  onToggleSection,
  onToggleItem,
  rasterYear,
  onRasterYearChange,
}: {
  sections: SectionDef[];
  /** Toggle key → on, across every group at once. See lib/sections.ts. */
  visibility: Record<string, boolean>;
  /** Group id → disclosed. Independent of what is drawing. */
  expanded: Record<string, boolean>;
  onToggleExpanded: (id: string) => void;
  onToggleSection: (id: string, on: boolean) => void;
  onToggleItem: (key: string) => void;
  /** Group id → selected year. */
  rasterYear: Record<string, number>;
  onRasterYearChange: (sectionId: string, year: number) => void;
}) {
  const onCount = Object.values(visibility).filter(Boolean).length;

  return (
    <div data-tour="sections" className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/50 bg-panel/85 px-4 py-2.5 backdrop-blur-sm">
        <Layers className="size-3.5 shrink-0 text-primary" strokeWidth={2.25} />
        <p className="text-[11px] font-semibold tracking-[0.14em] text-foreground/70 uppercase">
          Map Layers
        </p>
        {onCount > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/25">
            {onCount} on
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        {sections.map((section, i) => (
          <SectionNode
            key={section.id}
            section={section}
            visibility={visibility}
            expanded={expanded}
            onToggleExpanded={onToggleExpanded}
            onToggleSection={onToggleSection}
            onToggleItem={onToggleItem}
            rasterYear={rasterYear}
            onRasterYearChange={onRasterYearChange}
            // The walkthrough points at the first heading as its example;
            // the rest need no target of their own.
            tourTarget={i === 0 ? "section-theme" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// Memoised because the dashboard re-renders on state this column has nothing
// to do with — opening the mobile sheet, running the walkthrough, the
// locked-section dialog — and its props are all stable across those.
export const SidebarSections = memo(SidebarSectionsImpl);
