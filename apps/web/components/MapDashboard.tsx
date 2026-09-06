"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import {
  Map as MapIcon,
  Layers,
  ListTree,
  TreePine,
  Menu as MenuIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/Sidebar";
import { SidebarSections } from "@/components/SidebarSections";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { LayerPanel } from "@/components/LayerPanel";
import { LegendCard } from "@/components/LegendCard";
import { ThemeFilterPanel } from "@/components/ThemeFilterPanel";
import { ForestCoverPanel } from "@/components/ForestCoverPanel";
import { getToken } from "@/lib/auth";
import { useAuthState } from "@/hooks/use-auth-state";
import { fetchLayers, UnauthorizedError, type LayerCollection } from "@/lib/layers-api";
import { getYearColor, type ForestCoverYear, type ForestCoverSource } from "@/lib/forest-cover-mock";
import type { ThemeOverlay } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const EMPTY: LayerCollection = { type: "FeatureCollection", features: [] };

type MobileSheet = "menu" | "layers" | "legend" | "themes" | null;

export function MapDashboard() {
  const auth = useAuthState();
  const [layers, setLayers] = useState<LayerCollection | null>(null);
  const [error, setError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [visibility, setVisibility] = useState<Record<number, boolean>>({});
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);

  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [forestCoverYear, setForestCoverYear] = useState<ForestCoverYear | null>(null);
  const [forestCoverSource, setForestCoverSource] = useState<ForestCoverSource | null>(null);
  const [forestCoverLayerOn, setForestCoverLayerOn] = useState(false);

  const token = getToken();
  const loading = layers === null && !error;

  // Refetch whenever the token or retry count changes — with no token the
  // API resolves the request to its public role rather than rejecting it,
  // so this runs for anonymous visitors too. The returned cleanup clears
  // the previous role's data before the new fetch lands, rather than
  // setting state synchronously in the effect body itself.
  useEffect(() => {
    let cancelled = false;
    fetchLayers(token)
      .then((fc) => {
        if (!cancelled) setLayers(fc);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof UnauthorizedError) auth.logout();
        setError(true);
      });
    return () => {
      cancelled = true;
      setLayers(null);
      setError(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, retryTick]);

  function toggleVisibility(id: number) {
    setVisibility((v) => ({ ...v, [id]: !(v[id] ?? true) }));
  }

  const visibleLayers = (layers ?? EMPTY).features;

  // Forest Cover (FRD §1.1): the "satellite/drone layer" is a placeholder
  // tint over the real hill boundary geometry, standing in for imagery that
  // doesn't exist yet — swapped per year so the map visibly responds to the
  // year filter.
  const boundaryFeature = visibleLayers.find((f) => f.properties.name === "shatrunjay_hill_boundary");
  const themeOverlay: ThemeOverlay | null =
    selectedTheme === "forest_cover" && boundaryFeature && forestCoverYear
      ? {
          geometry: boundaryFeature.geometry,
          color: getYearColor(forestCoverYear),
          visible: forestCoverLayerOn,
        }
      : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header onMenuClick={() => setMobileSheet("menu")} />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[18%] shrink-0 flex-col border-r border-border bg-sidebar xl:flex">
          <OverlayScrollbarsComponent
            className="min-h-0 flex-1"
            options={{ scrollbars: { theme: "os-theme-dark", autoHide: "leave" } }}
          >
            <SidebarSections />
          </OverlayScrollbarsComponent>
          <p className="shrink-0 border-t border-sidebar-border px-4 py-3 text-xs text-muted-foreground">
            © Shetrunjay Hills {new Date().getFullYear()}
          </p>
        </aside>

        <div className="relative min-w-0 flex-1 p-4">
          <div className="relative size-full overflow-hidden rounded-2xl border border-border">
            <Map
              data={layers ?? EMPTY}
              visibility={visibility}
              onToggleLayers={() => setMobileSheet((s) => (s === "layers" ? null : "layers"))}
              themeOverlay={themeOverlay}
            />
          </div>

          {selectedTheme === "forest_cover" && (
            <ForestCoverPanel
              year={forestCoverYear}
              onYearChange={setForestCoverYear}
              source={forestCoverSource}
              onSourceChange={setForestCoverSource}
              layerOn={forestCoverLayerOn}
              onLayerOnChange={setForestCoverLayerOn}
              className="absolute top-4 right-4 hidden w-72 xl:flex"
            />
          )}

          <LegendCard
            layers={visibleLayers}
            className="absolute right-4 bottom-4 hidden w-64 xl:flex"
          />
        </div>
      </div>

      <nav className="flex items-center justify-around border-t border-border bg-card py-1 md:hidden">
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-3 py-1.5 text-xs"
          onClick={() => setMobileSheet(null)}
        >
          <MapIcon className="size-4" strokeWidth={1.75} />
          Map
        </Button>
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-3 py-1.5 text-xs"
          onClick={() => setMobileSheet("themes")}
        >
          <TreePine className="size-4" strokeWidth={1.75} />
          Themes
        </Button>
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-3 py-1.5 text-xs"
          onClick={() => setMobileSheet("layers")}
        >
          <Layers className="size-4" strokeWidth={1.75} />
          Layers
        </Button>
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-3 py-1.5 text-xs"
          onClick={() => setMobileSheet("legend")}
        >
          <ListTree className="size-4" strokeWidth={1.75} />
          Legend
        </Button>
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-3 py-1.5 text-xs"
          onClick={() => setMobileSheet("menu")}
        >
          <MenuIcon className="size-4" strokeWidth={1.75} />
          Menu
        </Button>
      </nav>

      <Sheet open={mobileSheet === "menu"} onOpenChange={(o) => setMobileSheet(o ? "menu" : null)}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar user={auth.user} variant="embedded" />
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "themes"} onOpenChange={(o) => setMobileSheet(o ? "themes" : null)}>
        <SheetContent side="bottom" className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto scrollbar-thin">
          <SheetTitle className="sr-only">Themes</SheetTitle>
          <ThemeFilterPanel selectedTheme={selectedTheme} onSelectTheme={setSelectedTheme} />
          {selectedTheme === "forest_cover" && (
            <ForestCoverPanel
              year={forestCoverYear}
              onYearChange={setForestCoverYear}
              source={forestCoverSource}
              onSourceChange={setForestCoverSource}
              layerOn={forestCoverLayerOn}
              onLayerOnChange={setForestCoverLayerOn}
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "layers"} onOpenChange={(o) => setMobileSheet(o ? "layers" : null)}>
        <SheetContent side="bottom" className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto scrollbar-thin">
          <SheetTitle className="sr-only">Layers</SheetTitle>
          <LayerPanel
            layers={layers?.features ?? null}
            loading={loading}
            error={error}
            visibility={visibility}
            onToggle={toggleVisibility}
            onRetry={() => setRetryTick((t) => t + 1)}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "legend"} onOpenChange={(o) => setMobileSheet(o ? "legend" : null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto scrollbar-thin">
          <SheetTitle className="sr-only">Legend</SheetTitle>
          <LegendCard layers={visibleLayers} className="flex" />
        </SheetContent>
      </Sheet>

      <LoginDialog
        open={auth.loginOpen}
        onOpenChange={auth.setLoginOpen}
        onSuccess={auth.onLoginSuccess}
      />
    </div>
  );
}
