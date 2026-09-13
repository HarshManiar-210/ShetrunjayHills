"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AuthUser } from "@/lib/auth";

// All that is left of the sidebar's own chrome: one link, for admins only.
//
// The wordmark that used to head this panel is gone — the header bar carries
// it on every page and at every breakpoint, so a second copy sitting directly
// beneath it was pure duplication. The page navigation and the auth control
// went earlier for the same reason. What remains is the one link that leads
// somewhere the header does not.
function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-2">
      <Link
        href="/admin/users"
        className={cn(
          "flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent",
          pathname === "/admin/users" && "bg-sidebar-accent",
        )}
      >
        <span className="flex items-center gap-2.5">
          <Users className="size-4" strokeWidth={1.75} />
          Users
        </span>
        <Badge className="bg-accent text-accent-foreground">Admin</Badge>
      </Link>
    </nav>
  );
}

// The panel has no collapse control: the layer sections are the primary way
// into the dashboard, and a panel that can vanish behind a rail buries them.
// It is simply always open on xl and up, and lives in the mobile sheet below
// that breakpoint.
export function Sidebar({
  user,
  variant = "floating",
  className,
}: {
  user: AuthUser | null;
  variant?: "floating" | "embedded" | "combined";
  className?: string;
}) {
  // Only the admin link lives here now, so for everyone else there is nothing
  // to draw. Rendering null rather than an empty element keeps the floating
  // variant from showing a blank card, and keeps MapDashboard's stacked panel
  // from opening on a rule with nothing above it.
  if (user?.role !== "admin") return null;

  if (variant === "embedded") {
    return (
      <div className={cn("flex h-full flex-col bg-sidebar", className)}>
        <AdminNav />
      </div>
    );
  }

  // Content-only, no shadow/positioning — used as the top block of
  // MapDashboard's combined panel, where the parent owns the surrounding
  // chrome. It carries its own bottom rule to separate it from the layer
  // sections stacked underneath.
  if (variant === "combined") {
    return (
      <div
        className={cn(
          "flex shrink-0 flex-col border-b border-sidebar-border",
          className,
        )}
      >
        <AdminNav />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "hidden w-64 flex-col rounded-xl bg-sidebar shadow-sm ring-1 ring-foreground/10 xl:flex",
        className,
      )}
    >
      <AdminNav />
    </div>
  );
}
