export function DashboardSkeleton() {
  return (
    <div className="flex h-screen animate-pulse overflow-hidden">
      <div className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar xl:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14.25 shrink-0 border-b border-border bg-card" />
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 bg-muted" />
          <div className="hidden w-80 shrink-0 border-l border-border bg-background p-3 xl:block">
            <div className="h-40 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
