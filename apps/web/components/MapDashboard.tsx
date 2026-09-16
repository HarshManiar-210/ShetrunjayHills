"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
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
import { Sidebar } from "@/components/Sidebar";
import { SidebarSections } from "@/components/SidebarSections";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { MapInfoPanel } from "@/components/MapInfoPanel";
import { LayerSearch } from "@/components/LayerSearch";
import {
  Walkthrough,
  shouldAutoRunWalkthrough,
  markWalkthroughSeen,
} from "@/components/Walkthrough";
import { getToken } from "@/lib/auth";
import { useAuthState } from "@/hooks/use-auth-state";
import { fetchLayers, UnauthorizedError, type LayerCollection } from "@/lib/layers-api";
import { fetchOverlays, overlayDataUrl, type OverlayMeta } from "@/lib/overlays-api";
import { vectorOverlayDefs } from "@/lib/static-overlays";
import { buildSections, layerIdOf, type SectionDef } from "@/lib/sections";
import type { LegendOverlay } from "@/components/LegendCard";
import type { StatsRasterLayer } from "@/components/StatsPanel";
import type { ForestCoverOverlay } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const EMPTY: LayerCollection = { type: "FeatureCollection", features: [] };

// Shared rather than a fresh `{}`, so a section with nothing switched on
// doesn't hand the sidebar and the map a new object on every render.
const EMPTY_KEYS: Record<string, boolean> = {};

type MobileSheet = "menu" | "legend" | null;

export function MapDashboard() {
  const auth = useAuthState();
  const [layers, setLayers] = useState<LayerCollection | null>(null);
  const [overlayMeta, setOverlayMeta] = useState<OverlayMeta[]>([]);
  const [error, setError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [tourOpen, setTourOpen] = useState(false);

  // Accordion: at most one section is on at a time, and only that section's
  // switched-on layers draw. Each section keeps its own item state so
  // reopening it restores what was on, rather than resurrecting switches that
  // look checked while their section is off.
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, Record<string, boolean>>>({});
  const [rasterYear, setRasterYear] = useState<Record<string, number>>({});
  const [lockedPromptSection, setLockedPromptSection] = useState<string | null>(null);

  const token = getToken();

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

  // Sections, their order and each row's colour all come from the
  // `static_overlays` rows — adding a layer or a section stays a seed insert.
  useEffect(() => {
    let cancelled = false;
    fetchOverlays()
      .then((meta) => {
        if (!cancelled) setOverlayMeta(meta);
      })
      .catch(() => setOverlayMeta([]));
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  // First visit runs the walkthrough on its own. The delay lets the lazily
  // loaded map and the sidebar mount, so the first spotlighted target is
  // already measurable when the overlay appears.
  useEffect(() => {
    if (!shouldAutoRunWalkthrough()) return;
    const timer = setTimeout(() => setTourOpen(true), 900);
    return () => clearTimeout(timer);
  }, []);

  function closeTour() {
    setTourOpen(false);
    markWalkthroughSeen();
  }

  // The sidebar's whole shape is derived from one fetch, so it is recomputed
  // only when that fetch lands. Identity matters as much as the work does:
  // `overlayDefs` is a Map prop, and a fresh array every render would re-run
  // the effects that add sources and drive the dash animation.
  const sections = useMemo(() => buildSections(overlayMeta), [overlayMeta]);
  const overlayDefs = useMemo(() => vectorOverlayDefs(overlayMeta), [overlayMeta]);

  // No layer is visible by default — one only draws once its section is on and
  // its own switch is turned on.
  const activeKeys = useMemo(
    () => (activeSection && sectionVisibility[activeSection]) || EMPTY_KEYS,
    [activeSection, sectionVisibility],
  );

  const toggleSection = useCallback(
    (section: string, on: boolean) => {
      setActiveSection(on ? section : null);
      setSectionVisibility((v) => {
        if (!on) return { ...v, [section]: {} };
        const def = sections.find((s) => s.label === section);
        // A section with exactly one item has nothing to choose between — the
        // section switch itself is the layer switch, so skip the sub-toggle.
        const initial =
          def && def.mode === "multi" && def.items.length === 1
            ? { [def.items[0].key]: true }
            : (v[section] ?? {});
        return { ...v, [section]: initial };
      });
    },
    [sections],
  );

  const toggleItem = useCallback(
    (key: string) => {
      if (!activeSection) return;
      setSectionVisibility((v) => {
        const current = v[activeSection] ?? {};
        return { ...v, [activeSection]: { ...current, [key]: !current[key] } };
      });
    },
    [activeSection],
  );

  // Search result picked: unlike the switches, this has to take the layer from
  // "not even in the open section" to visible in one step — open its section
  // (which, being an accordion, closes whichever was open) and switch it on.
  // Always on, never a toggle: someone who searched for a layer wants to see
  // it, not to turn off the one they just found.
  const revealLayer = useCallback((section: string, key: string | null) => {
    setActiveSection(section);
    if (key !== null) {
      setSectionVisibility((v) => ({ ...v, [section]: { ...(v[section] ?? {}), [key]: true } }));
    }
    setMobileSheet(null);
  }, []);

  const changeRasterYear = useCallback((sectionId: string, year: number) => {
    setRasterYear((y) => ({ ...y, [sectionId]: year }));
  }, []);

  // The open section's switched-on rows, split back into the two things the
  // map takes: overlay keys, and ids of the permissioned `layers` rows. Both
  // are Map props, so they are rebuilt only when the switches actually change
  // — a new object every render would re-run the map's source and filter
  // effects for nothing.
  const { overlays, visibility } = useMemo(() => {
    const overlayKeys: Record<string, boolean> = {};
    const layerIds: Record<number, boolean> = {};
    for (const [key, on] of Object.entries(activeKeys)) {
      if (!on) continue;
      const layerId = layerIdOf(key);
      if (layerId === null) overlayKeys[key] = true;
      else layerIds[layerId] = true;
    }
    return { overlays: overlayKeys, visibility: layerIds };
  }, [activeKeys]);

  const visibleFeatures = useMemo(
    () => (layers ?? EMPTY).features.filter((f) => visibility[f.properties.id]),
    [layers, visibility],
  );

  const openSection: SectionDef | undefined = useMemo(
    () => sections.find((s) => s.label === activeSection),
    [sections, activeSection],
  );

  // A raster section is "on" simply by being the open one — it has a single
  // layer, so the section switch is the layer switch.
  const rasterSection = openSection?.mode === "layer" ? openSection : undefined;
  const selectedYear = rasterSection
    ? (rasterYear[rasterSection.id] ?? rasterSection.years.at(-1)?.year ?? null)
    : null;
  const selectedRaster = rasterSection?.years.find((y) => y.year === selectedYear);

  const forestCoverOverlay: ForestCoverOverlay | null = useMemo(
    () =>
      selectedRaster
        ? { url: overlayDataUrl(selectedRaster.key), bounds: selectedRaster.bounds, visible: true }
        : null,
    [selectedRaster],
  );

  const legendRasterLayers = useMemo(
    () => (rasterSection ? [{ id: rasterSection.id, name: rasterSection.label }] : []),
    [rasterSection],
  );

  const statsRasterLayers: StatsRasterLayer[] = useMemo(
    () =>
      rasterSection
        ? [
            {
              id: rasterSection.id,
              name: rasterSection.label,
              year: selectedYear,
              years: rasterSection.years.map((y) => y.year),
            },
          ]
        : [],
    [rasterSection, selectedYear],
  );

  // Static overlays carry a colour but no geometry in React state, so the
  // legend takes their swatches straight off the section definition.
  const legendOverlays: LegendOverlay[] = useMemo(
    () =>
      (openSection?.items ?? [])
        .filter((item) => overlays[item.key])
        .map(({ key, label, color, geometryKind }) => ({ key, label, color, geometryKind })),
    [openSection, overlays],
  );

  const sidebarSections = (
    <>
      {error && (
        <div className="flex flex-col items-start gap-2 px-4 py-3">
          <p className="text-sm text-destructive">Could not load layers.</p>
          <Button size="sm" variant="outline" onClick={() => setRetryTick((t) => t + 1)}>
            Retry
          </Button>
        </div>
      )}
      <SidebarSections
        sections={sections}
        activeSection={activeSection}
        onToggleSection={toggleSection}
        visibility={activeKeys}
        onToggleItem={toggleItem}
        rasterYear={rasterYear}
        onRasterYearChange={changeRasterYear}
        onDisabledClick={setLockedPromptSection}
      />
    </>
  );

  const infoPanel = (className: string) => (
    <MapInfoPanel
      layers={visibleFeatures}
      overlays={legendOverlays}
      rasterLayers={legendRasterLayers}
      statsRasterLayers={statsRasterLayers}
      className={className}
    />
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        user={auth.user}
        onMenuClick={() => setMobileSheet("menu")}
        onLoginClick={auth.openLogin}
        onLogoutClick={auth.logout}
        onHelpClick={() => setTourOpen(true)}
        search={
          <LayerSearch
            sections={sections}
            visibility={activeKeys}
            activeSection={activeSection}
            onSelect={revealLayer}
          />
        }
      />

      <div className="flex min-h-0 flex-1">
        {/* Header mirrors this width for its brand block, so the search bar
            above lines up with the map column — keep the two in step. */}
        <aside className="hidden w-[18%] shrink-0 flex-col border-r border-border bg-sidebar xl:flex">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
            <Sidebar variant="combined" user={auth.user} />
            <div className="flex-1 bg-linear-to-b from-panel to-panel-deep">{sidebarSections}</div>
          </div>
          <p className="shrink-0 border-t border-border/60 bg-panel-deep px-4 py-2.5 text-center text-[11px] tracking-wide text-muted-foreground">
            © Shetrunjay Hills {new Date().getFullYear()}
          </p>
        </aside>

        <div className="relative min-w-0 flex-1 p-4">
          <div className="relative size-full overflow-hidden rounded-2xl border border-border shadow-e3">
            <Map
              data={layers ?? EMPTY}
              visibility={visibility}
              forestCoverOverlay={forestCoverOverlay}
              overlays={overlays}
              overlayDefs={overlayDefs}
            />
          </div>

          {infoPanel("absolute right-4 bottom-4 hidden max-h-[calc(100%-2rem)] w-72 xl:flex")}
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
        <SheetContent side="left" className="flex w-72 flex-col overflow-y-auto p-0 pt-12 scrollbar-thin">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar variant="combined" user={auth.user} />
          <div className="flex-1 bg-linear-to-b from-panel to-panel-deep">{sidebarSections}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileSheet === "legend"} onOpenChange={(o) => setMobileSheet(o ? "legend" : null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto scrollbar-thin">
          <SheetTitle className="sr-only">Legend and statistics</SheetTitle>
          {infoPanel("flex ring-0 shadow-none")}
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

      {/* Mounted only while running: the tour always starts at step 1, so
          replaying it from the header needs no reset of its own. */}
      {tourOpen && <Walkthrough onClose={closeTour} />}
    </div>
  );
}
