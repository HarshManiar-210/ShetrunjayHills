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
  type LucideIcon,
} from "lucide-react";

type Item = { label: string; icon: LucideIcon };

const SECTIONS: { label: string; items?: { label: string; icon?: LucideIcon; children?: Item[] }[] }[] = [
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
      { label: "Streams", icon: Waves },
      { label: "Watershed", icon: Droplets },
    ],
  },
  {
    label: "Base Layers",
    items: [
      { label: "Roads", icon: Route },
      { label: "Rivers", icon: Waves },
      { label: "Railways", icon: TrainFront },
      { label: "Canals", icon: Droplet },
      { label: "Grid", icon: Grid3x3 },
      { label: "Village Boundaries", icon: Home },
      { label: "Zone Boundaries", icon: SquareDashed },
      { label: "SOI Toposheets", icon: Compass },
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

function SidebarSectionHeader({ label, divider }: { label: string; divider: boolean }) {
  return (
    <div className={divider ? "mt-2 border-t border-sidebar-border pt-2" : undefined}>
      <p className="px-3 pt-2 pb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}

export function SidebarSections() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {SECTIONS.map((section, i) => (
        <div key={section.label}>
          <SidebarSectionHeader label={section.label} divider={i > 0} />
          {section.items?.map(({ label, icon: Icon, children }) =>
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
      ))}
    </div>
  );
}
