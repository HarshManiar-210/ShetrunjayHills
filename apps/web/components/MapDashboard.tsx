"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, Layers, ListTree, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { LayerPanel } from "@/components/LayerPanel";
import { DatasetInfoCard } from "@/components/DatasetInfoCard";
import { LegendCard } from "@/components/LegendCard";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/auth";
import { useAuthState } from "@/hooks/use-auth-state";
import { fetchLayers, UnauthorizedError, type LayerCollection, type LayerFeature } from "@/lib/layers-api";
import { boundsOfFeature } from "@/lib/geo";
import type { Map as MapLibreMap } from "maplibre-gl";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const EMPTY: LayerCollection = { type: "FeatureCollection", features: [] };

type MobileSheet = "menu" | "layers" | "legend" | null;

export function MapDashboard() {
  const auth = useAuthState();
  const [layers, setLayers] = useState<LayerCollection | null>(null);
  const [error, setError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [visibility, setVisibility] = useState<Record<number, boolean>>({});
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);

  const token = getToken();
  const locked = !auth.user;
  const displayedLayers = token ? layers : null;
  const loading = Boolean(token) && displayedLayers === null && !error;

  // Refetch whenever the token or retry count changes; the returned cleanup
  // clears any previous user's data before the new fetch lands, rather than
  // setting state synchronously in the effect body itself.
  useEffect(() => {
    if (!token) return;
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

  function zoomTo(feature: LayerFeature) {
    const bounds = boundsOfFeature(feature);
    if (map && bounds) map.fitBounds(bounds, { padding: 60 });
  }

  function handleToggleLayersControl() {
    if (window.matchMedia("(min-width: 1280px)").matches) {
      setRailCollapsed((c) => !c);
    } else {
      setMobileSheet((s) => (s === "layers" ? null : "layers"));
    }
  }

  const visibleLayers = (displayedLayers ?? EMPTY).features;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <Sidebar
          user={auth.user}
          onLoginClick={auth.openLogin}
          onLogoutClick={auth.logout}
          className="hidden w-64 shrink-0 border-r border-sidebar-border xl:flex"
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            user={auth.user}
            map={map}
            onMenuClick={() => setMobileSheet("menu")}
            onLoginClick={auth.openLogin}
            onLogoutClick={auth.logout}
          />

          <div className="flex min-h-0 flex-1">
            <div className="relative min-w-0 flex-1">
              <Map
                data={displayedLayers ?? EMPTY}
                visibility={visibility}
                onReady={setMap}
                onToggleLayers={handleToggleLayersControl}
              />
              <LegendCard
                layers={visibleLayers}
                className="absolute right-4 bottom-4 hidden w-64 xl:flex"
              />
            </div>

            <aside
              className={cn(
                "hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-background p-3 xl:flex",
                railCollapsed && "xl:hidden",
              )}
            >
              <LayerPanel
                layers={displayedLayers?.features ?? null}
                loading={loading}
                error={error}
                locked={locked}
                visibility={visibility}
                onToggle={toggleVisibility}
                onZoomTo={zoomTo}
                onRetry={() => setRetryTick((t) => t + 1)}
                onLoginClick={auth.openLogin}
              />
              <DatasetInfoCard />
            </aside>
          </div>
        </div>
      </div>

      <nav className="flex items-center justify-around border-t border-border bg-card py-1 md:hidden">
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-4 py-1.5 text-xs"
          onClick={() => setMobileSheet(null)}
        >
          <MapIcon className="size-4" strokeWidth={1.75} />
          Map
        </Button>
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-4 py-1.5 text-xs"
          onClick={() => setMobileSheet("layers")}
        >
          <Layers className="size-4" strokeWidth={1.75} />
          Layers
        </Button>
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-4 py-1.5 text-xs"
          onClick={() => setMobileSheet("legend")}
        >
          <ListTree className="size-4" strokeWidth={1.75} />
          Legend
        </Button>
        <Button
          variant="ghost"
          className="h-auto flex-col gap-0.5 px-4 py-1.5 text-xs"
          onClick={() => setMobileSheet("menu")}
        >
          <MenuIcon className="size-4" strokeWidth={1.75} />
          Menu
        </Button>
      </nav>

      <Sheet open={mobileSheet === "menu"} onOpenChange={(o) => setMobileSheet(o ? "menu" : null)}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            user={auth.user}
            onLoginClick={() => {
              setMobileSheet(null);
              auth.openLogin();
            }}
            onLogoutClick={auth.logout}
            className="flex"
          />
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "layers"} onOpenChange={(o) => setMobileSheet(o ? "layers" : null)}>
        <SheetContent side="bottom" className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <SheetTitle className="sr-only">Layers</SheetTitle>
          <LayerPanel
            layers={displayedLayers?.features ?? null}
            loading={loading}
            error={error}
            locked={locked}
            visibility={visibility}
            onToggle={toggleVisibility}
            onZoomTo={zoomTo}
            onRetry={() => setRetryTick((t) => t + 1)}
            onLoginClick={auth.openLogin}
          />
          <DatasetInfoCard />
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "legend"} onOpenChange={(o) => setMobileSheet(o ? "legend" : null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
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
