"use client";

import { Menu, Mountain, ChevronDown, LogIn, LogOut, CircleQuestionMark } from "lucide-react";
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

// The account dropdown (avatar, role label, log in / log out) is hidden for
// now — flip this to true to bring it back. Signing in still works from the
// standalone /login page while it is off.
const SHOW_PROFILE_MENU = false;

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
  onHelpClick,
  search,
  layerPicker,
  actions,
}: {
  user: AuthUser | null;
  onMenuClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  /** Replays the dashboard walkthrough. Omitted on pages that have no tour. */
  onHelpClick?: () => void;
  /**
   * Coordinate search. Only the dashboard has a map to move, so pages without
   * one simply pass nothing and the right-hand controls keep their place.
   */
  search?: React.ReactNode;
  /**
   * The layer picker — which layers the map's panel lists. It lives in the bar
   * rather than in the panel because it is what fills the panel, and because
   * the panel now floats over the map with only the selection in it. It sits
   * after the search field: both are ways into the same set of layers, and
   * search is the faster one when you already know the name.
   */
  layerPicker?: React.ReactNode;
  /**
   * Sits with the help button, at the right-hand end — the export, which is
   * an action on the whole dashboard rather than on any one panel.
   */
  actions?: React.ReactNode;
}) {
  return (
    <header className="relative z-30 flex items-center gap-3 border-b border-border bg-linear-to-r from-nav-deep via-nav to-nav-deep p-3 shadow-e2 md:pl-0 xl:pr-4 xl:py-2.5">
      {/* Rule along the bottom edge, fading out to the right so it frames the
          band rather than underlining it. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-nav-accent/55 via-nav-accent/20 to-transparent"
      />

      {/* Exactly as wide as the layers panel floating below it, so the search
          field starts where that panel ends. The block is the panel's width
          rather than its width plus its inset because the panel's inset
          (left-3) and this bar's gap (gap-3) are the same, so the gap after
          the block stands in for the inset before the panel. Its own pl-3
          lines the logo up with the panel's left edge. */}
      <div className="flex shrink-0 items-center gap-2 md:w-[var(--layers-panel-w)] md:pl-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 xl:hidden"
          aria-label="Open menu"
          onClick={onMenuClick}
        >
          <Menu />
        </Button>

        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-nav-soft to-nav-line/40 shadow-e1 ring-1 ring-nav-line">
          <Mountain className="size-5 text-nav-accent" strokeWidth={2.25} />
        </span>
        {/* Dropped below sm so the search bar has room on a phone; the mobile
            navigation sheet carries the wordmark in full. */}
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground leading-tight">
            Shatrunjay Hills
          </p>
          <p className="truncate text-[11px] tracking-wide leading-tight text-muted-foreground">
            Web GIS Dashboard
          </p>
        </div>

        {/* Separates the wordmark from the controls, so the bar reads as an
            identity and a toolbar rather than one undifferentiated row. Held
            to the block's trailing edge, which is the panel's edge too. */}
        {(search || layerPicker) && (
          <span aria-hidden className="ml-auto hidden h-7 w-px shrink-0 bg-nav-line sm:block" />
        )}
      </div>

      {/* Sized for a coordinate pair, not a sentence: it holds
          "21.51234, 71.80123" and no more, leaving the bar to the pickers. */}
      {search && <div className="w-52 min-w-0 shrink">{search}</div>}

      {layerPicker}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Theme toggle disabled for now */}
        {/* <ThemeToggle /> */}

        {actions}

        {onHelpClick && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-nav-line bg-nav-soft text-nav-accent shadow-e1 transition-[color,background-color,border-color,box-shadow] hover:border-nav-accent/50 hover:bg-nav-line/50 hover:text-foreground hover:ring-[3px] hover:ring-nav-accent/15 focus-visible:ring-[3px] focus-visible:ring-nav-accent/25"
            aria-label="Replay dashboard walkthrough"
            onClick={onHelpClick}
          >
            <CircleQuestionMark strokeWidth={2.25} />
          </Button>
        )}

        {SHOW_PROFILE_MENU && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" data-tour="account">
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
