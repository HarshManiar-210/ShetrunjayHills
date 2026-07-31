"use client";

import { Menu, Bell, ChevronDown, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/SearchBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/lib/auth";
import type { Map as MapLibreMap } from "maplibre-gl";

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
  map,
  onMenuClick,
  onLoginClick,
  onLogoutClick,
}: {
  user: AuthUser | null;
  map: MapLibreMap | null;
  onMenuClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-border bg-card p-3">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Menu />
      </Button>

      <SearchBar map={map} className="flex-1" />

      <ThemeToggle />

      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user ? initialsFor(user.username) : "?"}
            </span>
            <span className="hidden text-sm font-medium sm:inline">
              {user ? ROLE_LABELS[user.role] ?? user.role : "Guest"}
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
              <DropdownMenuItem variant="destructive" onSelect={onLogoutClick}>
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
    </header>
  );
}
