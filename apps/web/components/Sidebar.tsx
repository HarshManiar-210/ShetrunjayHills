"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mountain,
  LayoutDashboard,
  Layers,
  Users,
  LogOut,
  LogIn,
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
  onLoginClick,
  onLogoutClick,
  onCollapse,
}: {
  user: AuthUser | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 p-4">
        <Mountain className="size-6 shrink-0 text-primary" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Shetrunjay Hills
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            Web GIS Dashboard
          </p>
        </div>
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

      <div className="border-t border-sidebar-border p-2">
        {user ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 px-3 text-destructive hover:text-destructive"
            onClick={onLogoutClick}
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            Logout
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 px-3"
            onClick={onLoginClick}
          >
            <LogIn className="size-4" strokeWidth={1.75} />
            Login
          </Button>
        )}
      </div>
    </>
  );
}

export function Sidebar({
  user,
  onLoginClick,
  onLogoutClick,
  variant = "floating",
  onCollapse,
  className,
}: {
  user: AuthUser | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  variant?: "floating" | "embedded" | "combined";
  onCollapse?: () => void;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (variant === "embedded") {
    return (
      <div className={cn("flex h-full flex-col bg-sidebar", className)}>
        <SidebarContent
          user={user}
          onLoginClick={onLoginClick}
          onLogoutClick={onLogoutClick}
        />
      </div>
    );
  }

  // Content-only, no shadow/positioning/self-managed collapse — used as the
  // top section of MapDashboard's combined sidebar+themes+layers panel,
  // where the parent owns the single collapse toggle for the whole thing.
  if (variant === "combined") {
    return (
      <div className={cn("flex shrink-0 flex-col", className)}>
        <SidebarContent
          user={user}
          onLoginClick={onLoginClick}
          onLogoutClick={onLogoutClick}
          onCollapse={onCollapse}
        />
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
      <SidebarContent
        user={user}
        onLoginClick={onLoginClick}
        onLogoutClick={onLogoutClick}
        onCollapse={() => setCollapsed(true)}
      />
    </div>
  );
}
