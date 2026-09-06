import {
  TreePine,
  Trees,
  Sprout,
  Puzzle,
  Map,
  Activity,
  LandPlot,
  Hash,
  Tags,
  Ruler,
  Waves,
  Droplets,
  Route,
  TrainFront,
  Droplet,
  Grid3x3,
  Home,
  SquareDashed,
  Compass,
  Cat,
  PawPrint,
  LayoutGrid,
  PieChart,
  BarChart3,
  Focus,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Item = { label: string; icon: LucideIcon };
type SectionItem = { label: string; icon?: LucideIcon; children?: Item[]; key?: string };

// Sections with a master switch gating their own set of map-backed items
// (see lib/static-overlays.ts for what each item.key actually renders).
// Exported so MapDashboard can enforce "only one open at a time" (accordion)
// without hardcoding the section names a second time.
export const TOGGLE_SECTIONS = new Set(["Base Layers", "Watershed Analysis"]);

const SECTIONS: { label: string; items?: SectionItem[] }[] = [
  {
    label: "Theme",
    items: [
      { label: "Forest Cover", icon: TreePine },
      { label: "Forest Type", icon: Trees },
      { label: "Vegetation Change", icon: Sprout },
      { label: "Forest Fragmentation", icon: Puzzle },
      { label: "Land Use Land Cover (LULC)", icon: Map },
      { label: "Forest Status", icon: Activity },
      { label: "Cadastral Map", icon: LandPlot },
      { label: "Tree Count", icon: Hash },
      { label: "Tree Species Classification", icon: Tags },
      { label: "Tree Height Classification", icon: Ruler },
    ],
  },
  {
    label: "Watershed Analysis",
    items: [
      { label: "Streams", icon: Waves, key: "streams" },
      { label: "Watershed", icon: Droplets, key: "watershed" },
    ],
  },
  {
    label: "Base Layers",
    items: [
      { label: "Roads", icon: Route, key: "roads" },
      { label: "Rivers", icon: Waves, key: "rivers" },
      { label: "Railways", icon: TrainFront },
      { label: "Canals", icon: Droplet },
      { label: "Grid", icon: Grid3x3 },
      { label: "Village Boundaries", icon: Home, key: "villages" },
      { label: "Zone Boundaries", icon: SquareDashed, key: "zoneBoundaries" },
      { label: "SOI Toposheets", icon: Compass },
      { label: "Study Area", icon: Focus, key: "studyArea" },
    ],
  },
  {
    label: "Wildlife Corridor",
    items: [
      {
        label: "Fauna Selection",
        children: [
          { label: "Lion", icon: Cat },
          { label: "Leopard", icon: PawPrint },
        ],
      },
    ],
  },
  {
    label: "Carbon Stock",
    items: [
      {
        label: "Outputs",
        children: [
          { label: "Zone-wise Carbon Stock", icon: LayoutGrid },
          { label: "Overall Carbon Stock", icon: PieChart },
          { label: "Summary Statistics", icon: BarChart3 },
        ],
      },
    ],
  },
];

function SidebarItemRow({
  label,
  icon: Icon,
  className,
}: {
  label: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted hover:text-primary ${className ?? ""}`}
    >
      <Icon className="size-4 text-muted-foreground group-hover:text-primary" strokeWidth={1.75} />
      {label}
    </div>
  );
}

function SidebarSectionHeader({
  label,
  divider,
  right,
}: {
  label: string;
  divider: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div className={divider ? "mt-2 border-t border-sidebar-border pt-2" : undefined}>
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{label}</p>
        {right}
      </div>
    </div>
  );
}

function ToggleItemRow({
  item,
  enabled,
  checked,
  onActivate,
}: {
  item: SectionItem;
  enabled: boolean;
  checked: boolean;
  onActivate: () => void;
}) {
  const Icon = item.icon;
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
      className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        enabled
          ? "cursor-pointer text-foreground/80 hover:bg-muted hover:text-primary"
          : "cursor-not-allowed text-muted-foreground/60"
      }`}
    >
      {Icon && (
        <Icon
          className={`size-4 ${enabled ? "text-muted-foreground group-hover:text-primary" : "text-muted-foreground/60"}`}
          strokeWidth={1.75}
        />
      )}
      <span className="flex-1">{item.label}</span>
      {item.key && (
        <Switch
          size="sm"
          checked={checked}
          aria-disabled={!enabled}
          aria-label={`Toggle ${item.label} layer`}
          tabIndex={-1}
        />
      )}
    </div>
  );
}

export function SidebarSections({
  sectionOn = {},
  onToggleSection,
  sectionVisibility = {},
  onToggleSectionItem,
  onDisabledClick,
}: {
  sectionOn?: Record<string, boolean>;
  onToggleSection?: (section: string, on: boolean) => void;
  sectionVisibility?: Record<string, Record<string, boolean>>;
  onToggleSectionItem?: (section: string, key: string) => void;
  onDisabledClick?: (section: string) => void;
} = {}) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {SECTIONS.map((section, i) => {
        const isToggleSection = TOGGLE_SECTIONS.has(section.label);
        const on = Boolean(sectionOn[section.label]);
        const visibility = sectionVisibility[section.label] ?? {};

        return (
          <div key={section.label}>
            <SidebarSectionHeader
              label={section.label}
              divider={i > 0}
              right={
                isToggleSection && (
                  <Switch
                    size="sm"
                    checked={on}
                    onCheckedChange={(checked) => onToggleSection?.(section.label, checked)}
                    aria-label={`Toggle ${section.label}`}
                  />
                )
              }
            />
            {isToggleSection
              ? section.items?.map((item) => (
                  <ToggleItemRow
                    key={item.label}
                    item={item}
                    enabled={on}
                    checked={Boolean(item.key && visibility[item.key])}
                    onActivate={() => {
                      if (!on) {
                        onDisabledClick?.(section.label);
                      } else if (item.key) {
                        onToggleSectionItem?.(section.label, item.key);
                      }
                    }}
                  />
                ))
              : section.items?.map(({ label, icon: Icon, children }) =>
                  children ? (
                    <div key={label}>
                      <p className="px-3 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">
                        {label}
                      </p>
                      {children.map((child) => (
                        <SidebarItemRow key={child.label} {...child} className="pl-6" />
                      ))}
                    </div>
                  ) : (
                    Icon && <SidebarItemRow key={label} label={label} icon={Icon} />
                  ),
                )}
          </div>
        );
      })}
    </div>
  );
}
