"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mountain,
  LayoutDashboard,
  Layers,
  Users,
  Info,
  LogOut,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AuthUser } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Layers", icon: Layers },
  { href: "/about", label: "About", icon: Info },
];

export function Sidebar({
  user,
  onLoginClick,
  onLogoutClick,
  className,
}: {
  user: AuthUser | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      <div className="flex items-center gap-2 p-4">
        <Mountain className="size-6 shrink-0 text-primary" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            Shetrunjay Hills
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            Web GIS Dashboard
          </p>
        </div>
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
    </div>
  );
}
