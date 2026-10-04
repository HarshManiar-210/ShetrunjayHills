import { memo, useState } from "react";
import { GripVertical, PanelLeftClose, RotateCcw, X } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { LayerDot } from "@/components/LayerDot";
import {
  DEFAULT_RASTER_OPACITY,
  type SectionAccent,
  type SectionDef,
  type SectionItem,
  type SectionLayer,
} from "@/lib/sections";
import { selectedRows, type PanelRow } from "@/lib/layer-order";
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
 * on; this panel is where you switch it back off and set opacity —
 * years are stepped in the year bar along the map's bottom edge. A row's × takes it out of the selection, so the panel can be
 * tidied where the clutter is rather than only from the picker.
 *
 * Rows are one list in draw order: the top row draws on top of the map, the
 * bottom row beneath everything else. Dragging a row by its handle restacks
 * the map to match (see lib/layer-order.ts). Each row names the theme it came
 * from underneath, since a priority list cannot also be grouped by theme.
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
 * An options group's rows, as chips under its switch. Any number can be on,
 * unlike a raster's year. A row with no data yet is shown but can't be picked.
 */
function OptionChips({
  label,
  options,
  visibility,
  onToggle,
}: {
  label: string;
  options: SectionItem[];
  visibility: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={`${label} options`}>
      {options.map((option) => {
        const active = !option.pending && Boolean(visibility[option.key]);
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            disabled={option.pending}
            title={option.pending ? "Coming soon" : undefined}
            onClick={() => onToggle(option.key)}
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
              active
                ? "bg-brand font-semibold text-brand-foreground"
                : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
              option.pending && "pointer-events-none opacity-40",
            )}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: option.color }} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function LayerRow({
  row,
  group,
  checked,
  onToggle,
  onRemove,
  tour,
  children,
}: {
  row: SectionLayer;
  /** The theme it was picked from, shown under its name. */
  group: string;
  checked: boolean;
  onToggle: () => void;
  onRemove: () => void;
  /** The walkthrough's anchor, on the first row only. */
  tour?: string;
  /** Expanded controls — only rendered while the layer is switched on. */
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.key });

  return (
    <div
      ref={setNodeRef}
      data-tour={tour}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group/row relative rounded-lg transition-colors",
        // Chrome appears only around what is drawing, so the eye lands on the
        // layers in play rather than on the containers they sit in.
        checked && "bg-foreground/6 ring-1 ring-border/70",
        // Lifted while dragged, so it reads as picked up and passes over the
        // rows it moves between rather than under them.
        isDragging && "z-10 bg-card shadow-e3 ring-1 ring-border",
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
        className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1.5 pr-2 pl-0.5 text-[13px] transition-colors hover:bg-foreground/5"
      >
        {/* The drag handle. The rest of the row is a click target for the
            switch, so dragging has a grip of its own rather than competing
            with it. No touch scrolling from here, or a finger drag on a phone
            scrolls the sheet instead of moving the row. */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Reorder ${row.label}`}
          title="Drag to change what draws on top"
          className="-mr-1.5 shrink-0 cursor-grab touch-none rounded text-muted-foreground/40 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" strokeWidth={2} />
        </button>
        <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
        <LayerDot color={row.color} raster={row.raster} />
        {/* Wraps rather than truncating. A layer's name is how it is
            found again, and the long ones — CHM (Canopy Height Model),
            Historical Land Use (Satellite: 1978–2025) — are exactly the
            ones a clipped row rendered unidentifiable. Two lines cost
            this panel nothing; it scrolls. */}
        <span className="min-w-0 flex-1 leading-tight">
          <span className={cn("block", checked && "font-medium")}>{row.label}</span>
          <span className="block truncate text-[10px] text-muted-foreground/70">{group}</span>
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
  order,
  onReorder,
  visibility,
  onToggleLayer,
  onDeselectLayer,
  onResetLayers,
  onCollapse,
  rasterOpacity,
  onRasterOpacityChange,
}: {
  sections: SectionDef[];
  /** Toggle key → selected in the navbar picker, i.e. listed in this panel. */
  selected: Record<string, boolean>;
  /** The selected keys in draw order, top first — see lib/layer-order.ts. */
  order: string[];
  /** A row was dragged onto another row's place. */
  onReorder: (key: string, overKey: string) => void;
  /** Toggle key → drawing on the map. A subset of `selected`. */
  visibility: Record<string, boolean>;
  onToggleLayer: (key: string) => void;
  /** Takes a layer back out of the selection, and off the map with it. */
  onDeselectLayer: (key: string) => void;
  /** Switches every selected layer off, without deselecting any. */
  onResetLayers: () => void;
  /** Folds the panel away. Omitted where there is nothing to fold into. */
  onCollapse?: () => void;
  /** Group id → 0..1 opacity. Absent means DEFAULT_RASTER_OPACITY. */
  rasterOpacity: Record<string, number>;
  onRasterOpacityChange: (sectionId: string, opacity: number) => void;
}) {
  const [filter, setFilter] = useState(ALL);
  const sensors = useSensors(
    // A few pixels of travel before a press becomes a drag, so a tap on the
    // handle is not a zero-distance reorder.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Every selected layer, in draw order, so the panel is exactly as tall as
  // the work in progress and reads top to bottom the way the map stacks.
  const byKey = new Map(selectedRows(sections, selected).map((r) => [r.layer.key, r]));
  const all = order.flatMap((key) => {
    const row = byKey.get(key);
    return row ? [row] : [];
  });

  // The counts describe the whole selection, not the filtered view: the header
  // is there to say what is on, and a filter is a way of looking rather than a
  // change to what is drawn.
  const total = all.length;
  const onCount = all.filter(({ layer }) => visibility[layer.key]).length;

  // Only the filters that have something behind them, and only when there is
  // more than one — a filter offering a single choice is noise.
  const present = new Set(all.map(({ layer }) => FILTER_OF[layer.accent] ?? OTHER.id));
  const chips = [...FILTERS.map(({ id, label }) => ({ id, label })), OTHER].filter((f) =>
    present.has(f.id),
  );
  const showChips = chips.length > 1;

  // Derived rather than stored: deselecting the last forest layer would
  // otherwise leave the panel filtered to a subject that no longer exists,
  // showing nothing, with no effect needed to repair it.
  const active = showChips && chips.some((f) => f.id === filter) ? filter : ALL;

  // Filtering hides rows without changing their order, so a drag in a
  // filtered view still lands relative to the row dropped on.
  const rows: PanelRow[] =
    active === ALL
      ? all
      : all.filter(({ layer }) => (FILTER_OF[layer.accent] ?? OTHER.id) === active);

  function onDragEnd({ active: dragged, over }: DragEndEvent) {
    if (over && dragged.id !== over.id) onReorder(String(dragged.id), String(over.id));
  }

  return (
    <div data-tour="sections" className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-1.5">
        <p className="text-[13px] font-semibold">Layers</p>
        {total > 0 && (
          <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={`${onCount} of ${total} layers switched on`}>
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
          className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2 pt-3 scrollbar-none"
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={rows.map(({ layer }) => layer.key)}
            strategy={verticalListSortingStrategy}
          >
            {/* Spaced rather than stacked flush: a switched-on row is a card
                with its own controls inside it, and two of those touching
                read as one box with a seam. */}
            <div className="flex flex-col gap-2 pt-1">
              {rows.map(({ layer: row, group }, i) => (
                <LayerRow
                  key={row.key}
                  row={row}
                  group={group}
                  tour={i === 0 ? "section-theme" : undefined}
                  checked={Boolean(visibility[row.key])}
                  onToggle={() => onToggleLayer(row.key)}
                  onRemove={() => onDeselectLayer(row.key)}
                >
                  {row.options && (
                    <OptionChips
                      label={row.label}
                      options={row.options}
                      visibility={visibility}
                      onToggle={onToggleLayer}
                    />
                  )}
                  {row.raster && (
                    <OpacityControl
                      label={row.label}
                      opacity={rasterOpacity[row.raster.id] ?? DEFAULT_RASTER_OPACITY}
                      onChange={(opacity) => onRasterOpacityChange(row.raster!.id, opacity)}
                    />
                  )}
                </LayerRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// Memoised because the dashboard re-renders on state this panel has nothing
// to do with — opening the mobile sheet, running the walkthrough — and its
// props are all stable across those.
export const SidebarSections = memo(SidebarSectionsImpl);
