"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { ListTree, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SidebarSections, TOGGLE_SECTIONS } from "@/components/SidebarSections";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { LayerPanel } from "@/components/LayerPanel";
import { LegendCard } from "@/components/LegendCard";
import { ThemeFilterPanel } from "@/components/ThemeFilterPanel";
import { ForestCoverPanel } from "@/components/ForestCoverPanel";
import { getToken } from "@/lib/auth";
import { useAuthState } from "@/hooks/use-auth-state";
import { fetchLayers, UnauthorizedError, type LayerCollection } from "@/lib/layers-api";
import { STATIC_OVERLAY_SOURCES } from "@/lib/static-overlays";
import { fetchOverlays, overlayDataUrl } from "@/lib/overlays-api";
import { boundsOfFeature } from "@/lib/geo";
import type { ForestCoverYear, ForestCoverSource } from "@/lib/forest-cover-mock";
import type { ForestCoverOverlay } from "@/components/Map";

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
  const [forestCoverYears, setForestCoverYears] = useState<ForestCoverYear[]>([]);
  const [forestCoverYear, setForestCoverYear] = useState<ForestCoverYear | null>(null);
  const [forestCoverSource, setForestCoverSource] = useState<ForestCoverSource | null>(null);
  const [forestCoverLayerOn, setForestCoverLayerOn] = useState(false);

  // Available years come from the `static_overlays` DB rows (Forest Cover
  // section, one row per raster year) rather than a hardcoded list — adding
  // a year is a seed insert, not a frontend change.
  useEffect(() => {
    let cancelled = false;
    fetchOverlays()
      .then((overlays) => {
        if (cancelled) return;
        const years = overlays
          .filter((o) => o.section === "Forest Cover" && o.asset_type === "raster")
          .map((o) => Number(o.label))
          .filter((y) => !Number.isNaN(y))
          .sort((a, b) => a - b);
        setForestCoverYears(years);
      })
      .catch(() => setForestCoverYears([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Master-toggle sections (Base Layers, Watershed Analysis): each has its
  // own on/off switch that gates its own set of static overlay layers, keyed
  // by section label so the two never interfere with each other.
  const [sectionOn, setSectionOn] = useState<Record<string, boolean>>({});
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, Record<string, boolean>>>({});
  const [lockedPromptSection, setLockedPromptSection] = useState<string | null>(null);

  // Accordion: only one toggle section (Base Layers / Watershed Analysis) can
  // be on at a time. Turning one on replaces the whole sectionOn map rather
  // than merging, so switching sections also clears the other's item
  // visibility — otherwise its switches would stay "checked" while greyed out.
  function toggleSection(section: string, on: boolean) {
    setSectionOn(on ? { [section]: true } : {});
    setSectionVisibility((v) => (on ? { [section]: v[section] ?? {} } : { ...v, [section]: {} }));
  }

  function toggleSectionItem(section: string, key: string) {
    setSectionVisibility((v) => ({
      ...v,
      [section]: { ...v[section], [key]: !v[section]?.[key] },
    }));
  }

  const overlays = Object.entries(sectionOn).reduce<Record<string, boolean>>((acc, [section, on]) => {
    if (on) Object.assign(acc, sectionVisibility[section]);
    return acc;
  }, {});

  // Legend only ever shows the currently-open toggle section (accordion above
  // guarantees at most one), and only the items actually switched on within it.
  const activeToggleSection = Object.keys(sectionOn).find(
    (s) => sectionOn[s] && TOGGLE_SECTIONS.has(s),
  );
  const sectionLegendItems = activeToggleSection
    ? Object.entries(sectionVisibility[activeToggleSection] ?? {})
        .filter(([, on]) => on)
        .map(([key]) => STATIC_OVERLAY_SOURCES[key])
        .filter((o): o is NonNullable<typeof o> => Boolean(o))
    : [];
  const sectionLegend =
    activeToggleSection && sectionLegendItems.length > 0
      ? { title: activeToggleSection, items: sectionLegendItems }
      : null;

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

  // No layer is selected by default — a fetched layer only draws once its
  // switch is explicitly turned on.
  function toggleVisibility(id: number) {
    setVisibility((v) => ({ ...v, [id]: !(v[id] ?? false) }));
  }

  const allLayers = (layers ?? EMPTY).features;
  // Legend mirrors what's actually switched on, not everything the role can
  // see — no layer is selected by default, so an unselected layer shouldn't
  // show up in the legend either.
  const legendLayers = allLayers.filter((f) => visibility[f.properties.id]);

  // Forest Cover (FRD §1.1): the per-year raster (static_overlays row
  // forest_cover_<year>, served through the API) has no embedded geo
  // extent, so it's draped over the real hill boundary's bounding box —
  // looked up regardless of that layer's own visibility toggle.
  const boundaryFeature = allLayers.find((f) => f.properties.name === "shatrunjay_hill_boundary");
  const boundaryBounds = boundaryFeature ? boundsOfFeature(boundaryFeature) : null;
  const forestCoverOverlay: ForestCoverOverlay | null =
    selectedTheme === "forest_cover" && boundaryBounds && forestCoverYear
      ? {
          url: overlayDataUrl(`forest_cover_${forestCoverYear}`),
          bounds: boundaryBounds,
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
            <SidebarSections
              sectionOn={sectionOn}
              onToggleSection={toggleSection}
              sectionVisibility={sectionVisibility}
              onToggleSectionItem={toggleSectionItem}
              onDisabledClick={setLockedPromptSection}
            />
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
              forestCoverOverlay={forestCoverOverlay}
              overlays={overlays}
            />
          </div>

          {selectedTheme === "forest_cover" && (
            <ForestCoverPanel
              years={forestCoverYears}
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
            layers={legendLayers}
            sectionLegend={sectionLegend}
            className="absolute right-4 bottom-4 hidden w-64 xl:flex"
          />
        </div>
      </div>

      <nav className="flex items-center justify-around border-t border-border bg-card py-1 md:hidden">
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
        <SheetContent side="left" className="flex w-72 flex-col overflow-y-auto p-0 scrollbar-thin">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarSections
            sectionOn={sectionOn}
            onToggleSection={toggleSection}
            sectionVisibility={sectionVisibility}
            onToggleSectionItem={toggleSectionItem}
            onDisabledClick={setLockedPromptSection}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "themes"} onOpenChange={(o) => setMobileSheet(o ? "themes" : null)}>
        <SheetContent side="bottom" className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto scrollbar-thin">
          <SheetTitle className="sr-only">Themes</SheetTitle>
          <ThemeFilterPanel selectedTheme={selectedTheme} onSelectTheme={setSelectedTheme} />
          {selectedTheme === "forest_cover" && (
            <ForestCoverPanel
              years={forestCoverYears}
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
          <LegendCard layers={legendLayers} sectionLegend={sectionLegend} className="flex" />
        </SheetContent>
      </Sheet>

      <LoginDialog
        open={auth.loginOpen}
        onOpenChange={auth.setLoginOpen}
        onSuccess={auth.onLoginSuccess}
      />

      <Dialog open={lockedPromptSection !== null} onOpenChange={(o) => !o && setLockedPromptSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lockedPromptSection} is off</DialogTitle>
            <DialogDescription>
              Please enable the {lockedPromptSection} switch first to interact with these layers.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
