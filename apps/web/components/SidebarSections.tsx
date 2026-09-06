const SECTIONS = ["Theme", "Base Layers", "Watershed Analysis", "Vegetation Change"];

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
    <div className="flex flex-col gap-1 p-3">
      {SECTIONS.map((label, i) => (
        <SidebarSectionHeader key={label} label={label} divider={i > 0} />
      ))}
    </div>
  );
}
