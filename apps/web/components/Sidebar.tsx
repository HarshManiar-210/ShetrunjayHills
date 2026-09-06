"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mountain,
  LayoutDashboard,
  Layers,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AuthUser } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Layers", icon: Layers },
];

function SidebarContent({
  user,
  onCollapse,
}: {
  user: AuthUser | null;
  onCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 p-4">
        <Mountain className="size-6 shrink-0 text-primary" strokeWidth={1.75} />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
          Shetrunjay Hills
        </p>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Collapse sidebar"
            onClick={onCollapse}
          >
            <PanelLeftClose />
          </Button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent",
              pathname === href && label === "Dashboard" && "bg-sidebar-accent",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </Link>
        ))}

        {user?.role === "admin" && (
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
        )}
      </nav>
    </>
  );
}

export function Sidebar({
  user,
  variant = "floating",
  className,
}: {
  user: AuthUser | null;
  variant?: "floating" | "embedded";
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (variant === "embedded") {
    return (
      <div className={cn("flex h-full flex-col bg-sidebar", className)}>
        <SidebarContent user={user} />
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className={cn("hidden xl:block", className)}>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full shadow-sm ring-1 ring-foreground/10"
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
        >
          <PanelLeftOpen />
        </Button>
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
      <SidebarContent user={user} onCollapse={() => setCollapsed(true)} />
    </div>
  );
}
