"use client";

import { Menu, Mountain, ChevronDown, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { ThemeToggle } from "@/components/theme-toggle"; // disabled for now
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/lib/auth";

const ROLE_LABELS: Record<string, string> = {
  regular_user: "Regular User",
  admin: "Admin",
  support_team: "Support Team",
};

function initialsFor(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export function Header({
  user,
  onMenuClick,
  onLoginClick,
  onLogoutClick,
}: {
  user: AuthUser | null;
  onMenuClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-border bg-card p-3">
      <Button
        variant="ghost"
        size="icon"
        className="xl:hidden"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Menu />
      </Button>

      <div className="flex min-w-0 items-center gap-2">
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

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Theme toggle disabled for now */}
        {/* <ThemeToggle /> */}

        {process.env.NODE_ENV !== "production" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {user ? initialsFor(user.username) : "?"}
                </span>
                <span className="hidden text-sm font-medium sm:inline">
                  {user ? (ROLE_LABELS[user.role] ?? user.role) : "Guest"}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {user ? (
                <>
                  <DropdownMenuLabel>
                    Signed in as {user.username}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={onLogoutClick}
                  >
                    <LogOut />
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel>Not signed in</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onLoginClick}>
                    <LogIn />
                    Log in
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
