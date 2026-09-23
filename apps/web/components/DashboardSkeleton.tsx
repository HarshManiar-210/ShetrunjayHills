// Stands in for the dashboard while it loads, so the first paint is already
// the shape the dashboard will take: a full-width map with the layers panel
// floating over its top-left corner. Keep it in step with MapDashboard's
// layout — a skeleton that shows a column the dashboard does not have is a
// flash of the wrong page.
export function DashboardSkeleton() {
  return (
    <div className="flex h-screen animate-pulse flex-col overflow-hidden">
      <div className="h-14.25 shrink-0 border-b border-border bg-card" />
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 p-4">
          <div className="size-full rounded-2xl border border-border bg-muted" />
          <div className="absolute top-3 left-3 hidden h-64 w-[var(--layers-panel-w)] rounded-2xl bg-card/95 shadow-e3 ring-1 ring-foreground/10 md:block" />
          <div className="absolute top-3 right-3 hidden h-80 w-72 rounded-2xl bg-card/95 shadow-e3 ring-1 ring-foreground/10 xl:block" />
          <div className="absolute bottom-3 left-3 hidden h-16 w-48 rounded-xl bg-card/95 shadow-e2 ring-1 ring-foreground/10 md:block" />
          <div className="absolute bottom-3 left-[13.5rem] hidden h-52 w-10 rounded-xl bg-card/95 shadow-e2 ring-1 ring-foreground/10 md:block 2xl:left-[19.5rem]" />
        </div>
      </div>
    </div>
  );
}
