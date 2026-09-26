"use client";

import { ChevronDown, FolderTree, Layers, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LayerDot } from "@/components/LayerDot";
import { sectionLayers, type SectionDef, type SectionLayer } from "@/lib/sections";
import { cn } from "@/lib/utils";

/**
 * Choosing layers, in two steps and two dropdowns.
 *
 * Sections first — Forest Layers, Landuse, Drone Data and the rest — then the
 * layers inside whichever of them are picked. One nested dropdown did both
 * jobs before, and that made the common case worse: the list of ten sections
 * pushed itself apart as soon as one was opened, so scanning the sections and
 * picking within one fought each other inside the same 20rem column. Split,
 * each dropdown does one thing at its own length.
 *
 * Ticking a layer draws it and puts it in the map's layers panel, which is
 * where it is switched off again, given a year, or faded.
 */

/** Trigger for either picker: an icon, a name, and how many are ticked. */
function PickerTrigger({
  icon: Icon,
  label,
  count,
  tour,
  disabled,
  className,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  tour?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <PopoverTrigger asChild>
      {/* Built to match the search field beside it — same height, same pill,
          same inset shading — so the bar reads as one toolbar. */}
      <Button
        variant="outline"
        data-tour={tour}
        disabled={disabled}
        className={cn(
          "h-10 shrink-0 gap-2 rounded-full border-nav-line bg-nav-soft px-3.5 text-sm font-medium",
          "shadow-[inset_0_1px_2px_oklch(0.30_0.01_96_/_0.07)]",
          "transition-[color,box-shadow,background-color,border-color]",
          "hover:border-nav-accent/45 hover:bg-nav-soft",
          "data-[state=open]:border-nav-accent/60 data-[state=open]:bg-card",
          "data-[state=open]:ring-[3px] data-[state=open]:ring-nav-accent/20",
          className,
        )}
      >
        <Icon className="size-4 shrink-0 text-nav-accent" strokeWidth={2} />
        <span className="hidden max-w-40 truncate sm:inline">{label}</span>
        {count > 0 && (
          <span className="rounded-full bg-brand px-1.5 py-px text-[10px] font-semibold tabular-nums text-brand-foreground">
            {count}
          </span>
        )}
        <ChevronDown className="size-3.5 shrink-0 opacity-50" strokeWidth={2} />
      </Button>
    </PopoverTrigger>
  );
}

/** Popover chrome shared by the pickers: a titled header and a body. */
function PickerBody({
  title,
  onClear,
  clearable,
  children,
}: {
  title: string;
  onClear: () => void;
  clearable: boolean;
  children: React.ReactNode;
}) {
  return (
    <PopoverContent className="w-80 p-0">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <button
          type="button"
          disabled={!clearable}
          onClick={onClear}
          className="text-[11px] font-medium text-brand transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
        >
          Clear all
        </button>
      </div>

      <div className="max-h-[min(28rem,60vh)] overflow-y-auto p-1.5 scrollbar-thin">
        {children}
      </div>
    </PopoverContent>
  );
}

/**
 * The first dropdown: which sections you are working in.
 *
 * Picking a section makes its layers available in the layer picker and
 * selects none of them. Drone Data is six full-extent rasters and
 * Administrative Boundaries ten layers, so a section tick that drew
 * everything would be a heavy accident to undo.
 */
export function SectionPicker({
  sections,
  active,
  onToggleSection,
  loadError = false,
  onRetry,
  className,
}: {
  sections: SectionDef[];
  /** Section id → picked. */
  active: Record<string, boolean>;
  onToggleSection: (id: string, on: boolean) => void;
  /** The section tree failed to load: shows an error and a retry. */
  loadError?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  const count = sections.filter((s) => active[s.id]).length;

  return (
    <Popover>
      <PickerTrigger
        icon={FolderTree}
        label="Themes"
        count={count}
        tour="section-picker"
        className={className}
      />
      <PickerBody
        title="Select themes"
        clearable={count > 0}
        onClear={() => {
          for (const section of sections) {
            if (active[section.id]) onToggleSection(section.id, false);
          }
        }}
      >
        {loadError && (
          <div className="flex flex-col items-start gap-2 px-2.5 py-3">
            <p className="text-xs leading-relaxed text-destructive">Could not load themes.</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}
        {sections.map((section) => (
          <label
            key={section.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-foreground/5"
          >
            <Checkbox
              checked={Boolean(active[section.id])}
              onCheckedChange={(next) => onToggleSection(section.id, next === true)}
            />
            <section.icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
            <span className="min-w-0 flex-1 text-[13px] leading-tight font-medium">
              {section.label}
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {sectionLayers(section).length}
            </span>
          </label>
        ))}
      </PickerBody>
    </Popover>
  );
}

/**
 * A dropdown for one section that the seed gives a picker of its own
 * (`own_picker`): its layers, listed straight away with no section step.
 */
export function SectionLayerPicker({
  section,
  selected,
  onToggleLayer,
  className,
}: {
  section: SectionDef;
  /** Toggle key → selected. */
  selected: Record<string, boolean>;
  onToggleLayer: (key: string, picked: boolean) => void;
  className?: string;
}) {
  const layers = sectionLayers(section);
  const count = layers.filter((l) => selected[l.key]).length;

  return (
    <Popover>
      <PickerTrigger
        icon={section.icon}
        label={section.label}
        count={count}
        className={className}
      />
      <PickerBody
        title={section.label}
        clearable={count > 0}
        onClear={() => {
          for (const layer of layers) {
            if (selected[layer.key]) onToggleLayer(layer.key, false);
          }
        }}
      >
        {layers.map((layer) => (
          <LayerOption
            key={layer.key}
            layer={layer}
            checked={Boolean(selected[layer.key])}
            onToggle={(next) => onToggleLayer(layer.key, next)}
          />
        ))}
      </PickerBody>
    </Popover>
  );
}

/**
 * The second dropdown: the layers inside the picked sections.
 *
 * Every row names the section it came from. The list is ordered by section
 * and ruled where one ends, but the name on the row is what makes it
 * unambiguous once the list is long enough to scroll — and sections do repeat
 * layer names, Existing and Proposed Conservation each having a Matipala, a
 * Vantalavadi and a Checkdam.
 */
export function LayerPicker({
  sections,
  active,
  selected,
  onToggleLayer,
  className,
}: {
  sections: SectionDef[];
  /** Section id → picked in the section dropdown. */
  active: Record<string, boolean>;
  /** Toggle key → selected. */
  selected: Record<string, boolean>;
  onToggleLayer: (key: string, picked: boolean) => void;
  className?: string;
}) {
  const groups = sections
    .filter((section) => active[section.id])
    .map((section) => ({ section, layers: sectionLayers(section) }));

  const count = groups.reduce(
    (sum, g) => sum + g.layers.filter((l) => selected[l.key]).length,
    0,
  );

  return (
    <Popover>
      <PickerTrigger
        icon={Layers}
        label="Layers"
        count={count}
        tour="layer-picker"
        // Nothing to list until a section is picked.
        disabled={groups.length === 0}
        className={className}
      />
      <PickerBody
        title="Select layers"
        clearable={count > 0}
        onClear={() => {
          for (const { layers } of groups) {
            for (const layer of layers) {
              if (selected[layer.key]) onToggleLayer(layer.key, false);
            }
          }
        }}
      >
        {groups.map(({ section, layers }, i) => (
            <div key={section.id} className={cn(i > 0 && "mt-1 border-t border-border/60 pt-1")}>
              {layers.map((layer) => (
                <LayerOption
                  key={layer.key}
                  layer={layer}
                  checked={Boolean(selected[layer.key])}
                  onToggle={(next) => onToggleLayer(layer.key, next)}
                />
              ))}
            </div>
          ))}
      </PickerBody>
    </Popover>
  );
}

function LayerOption({
  layer,
  checked,
  onToggle,
}: {
  layer: SectionLayer;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  if (layer.pending) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5">
        <Checkbox checked={false} disabled aria-hidden tabIndex={-1} />
        <LayerDot color={layer.color} raster={layer.raster} faded />
        <span className="min-w-0 flex-1 text-[13px] leading-tight text-muted-foreground/50">
          {layer.label}
        </span>
        <span className="shrink-0 text-[10px] font-medium text-brand/70">Coming soon</span>
      </div>
    );
  }

  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/5">
      <Checkbox checked={checked} onCheckedChange={(next) => onToggle(next === true)} />
      {/* The colour it draws in, so the dropdown already reads as a key to
          the map. */}
      <LayerDot color={layer.color} raster={layer.raster} />
      {/* Wrapped, not clipped: this is where a layer is chosen, so its
          name has to be readable in full. */}
      <span className="min-w-0 flex-1 text-[13px] leading-tight">{layer.label}</span>
    </label>
  );
}
