export function DashboardSkeleton() {
  return (
    <div className="flex h-screen animate-pulse flex-col overflow-hidden">
      <div className="h-14.25 shrink-0 border-b border-border bg-card" />
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[18%] shrink-0 border-r border-border bg-sidebar xl:block" />
        <div className="min-w-0 flex-1 p-4">
          <div className="size-full rounded-2xl border border-border bg-muted" />
        </div>
      </div>
    </div>
  );
}
