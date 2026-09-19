"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { BasemapSwitcher } from "@/components/BasemapSwitcher";
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
import {
  fetchLayerGroups,
  fetchOverlays,
  overlayDataUrl,
  type LayerGroup,
  type OverlayMeta,
} from "@/lib/overlays-api";
import { vectorOverlayDefs } from "@/lib/static-overlays";
import {
  buildSections,
  flattenSections,
  isRasterToggleKey,
  layerIdOf,
  rasterToggleKey,
  sectionToggleKeys,
  DEFAULT_RASTER_OPACITY,
} from "@/lib/sections";
import { DEFAULT_BASEMAP, type BasemapId } from "@/lib/basemaps";
import type { LegendOverlay } from "@/components/LegendCard";
import type { StatsRasterLayer } from "@/components/StatsPanel";
import type { RasterOverlay } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const EMPTY: LayerCollection = { type: "FeatureCollection", features: [] };

type MobileSheet = "menu" | "legend" | null;

/**
 * Above this, switching a layer on prompts first. The study's tree survey is
 * ~166 MB of GeoJSON and will stall a tab for a while; Streams and Watersheds
 * at ~20 MB are slow but fine, so the line sits above them. Sizes come from
 * the API, which stats the files, so no layer is named here.
 */
const HEAVY_LAYER_BYTES = 50 * 1024 * 1024;

interface HeavyLayer {
  key: string;
  label: string;
  sizeBytes: number;
  /** Every key the confirmed action should switch on — a whole section, or one row. */
  keys?: string[];
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}

export function MapDashboard() {
  const auth = useAuthState();
  const [layers, setLayers] = useState<LayerCollection | null>(null);
  const [overlayMeta, setOverlayMeta] = useState<OverlayMeta[]>([]);
  const [layerGroups, setLayerGroups] = useState<LayerGroup[]>([]);
  const [error, setError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP);
  const [tourOpen, setTourOpen] = useState(false);

  // One flat map of toggle key → on, covering every layer in the sidebar:
  // any number, from any number of sections, draw at once. See lib/sections.ts
  // for the key namespace. Nothing is on by default.
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  // Which section boxes are expanded. Disclosure only — a collapsed section's
  // layers keep drawing, which is the whole point of separating the two now
  // that visibility is no longer an accordion.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [rasterYear, setRasterYear] = useState<Record<string, number>>({});
  // Group id → 0..1. Absent means DEFAULT_RASTER_OPACITY; kept per theme so
  // fading one raster to see another underneath does not fade both.
  const [rasterOpacity, setRasterOpacity] = useState<Record<string, number>>({});

  // A layer big enough to be worth warning about, waiting on confirmation.
  const [heavyPrompt, setHeavyPrompt] = useState<HeavyLayer | null>(null);
  // Heavy layers the user has already accepted this session, so flipping one
  // off and on again does not re-prompt. A ref, not state: nothing renders
  // from it, and it must not trigger a re-render when it grows.
  const confirmedHeavyRef = useRef<Set<string>>(new Set());

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

  // The sidebar's whole shape — the tree, its order, every row's colour —
  // comes from these two seed-backed lists, so adding a layer or restructuring
  // the tree stays a data change.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLayerGroups(), fetchOverlays()])
      .then(([groups, meta]) => {
        if (cancelled) return;
        setLayerGroups(groups);
        setOverlayMeta(meta);
      })
      .catch(() => {
        if (cancelled) return;
        setLayerGroups([]);
        setOverlayMeta([]);
      });
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
  const sections = useMemo(
    () => buildSections(layerGroups, overlayMeta),
    [layerGroups, overlayMeta],
  );
  // Flattened once, because almost everything downstream asks a question of
  // the whole tree rather than of one level of it.
  const allSections = useMemo(() => flattenSections(sections), [sections]);
  const overlayDefs = useMemo(() => vectorOverlayDefs(overlayMeta), [overlayMeta]);

  // Size per toggle key, so the heavy-layer warning is driven by what the
  // files actually weigh (the API stats them — see handlers/overlays.go)
  // rather than by a hardcoded list of which layers are big.
  // A plain record rather than a Map: the dynamic import above is named
  // `Map`, so the global constructor is not reachable by that name here.
  const groupKeyById = useMemo(() => {
    const byId: Record<number, string> = {};
    for (const group of layerGroups) byId[group.id] = group.key;
    return byId;
  }, [layerGroups]);

  const heavyLayers = useMemo(() => {
    const byKey: Record<string, HeavyLayer> = {};
    for (const overlay of overlayMeta) {
      const size = overlay.size_bytes ?? 0;
      if (size < HEAVY_LAYER_BYTES) continue;
      const key =
        overlay.asset_type === "raster"
          ? rasterToggleKey(groupKeyById[overlay.group_id])
          : overlay.key;
      // A raster theme is keyed by section, so its years collapse onto one
      // entry — warn with the largest of them.
      if (byKey[key] && byKey[key].sizeBytes >= size) continue;
      byKey[key] = { key, label: overlay.label, sizeBytes: size };
    }
    return byKey;
  }, [overlayMeta, groupKeyById]);

  const setKeysVisible = useCallback((keys: string[], on: boolean) => {
    setVisible((v) => {
      const next = { ...v };
      for (const key of keys) next[key] = on;
      return next;
    });
  }, []);

  // Switching a layer *on* is the only direction that can cost anything, so
  // that is the only direction the size warning gates. Turning things off,
  // and anything already confirmed, goes straight through.
  const requestKeys = useCallback(
    (keys: string[], on: boolean) => {
      if (!on) {
        setKeysVisible(keys, false);
        return;
      }
      const heavy = keys.map((k) => heavyLayers[k]).find(Boolean);
      if (heavy && !confirmedHeavyRef.current.has(heavy.key)) {
        setHeavyPrompt({ ...heavy, keys });
        return;
      }
      setKeysVisible(keys, true);
    },
    [heavyLayers, setKeysVisible],
  );

  const confirmHeavy = useCallback(() => {
    if (!heavyPrompt) return;
    // Remembered for the session: having said yes once, flipping the same
    // layer off and on again should not ask a second time.
    confirmedHeavyRef.current.add(heavyPrompt.key);
    setKeysVisible(heavyPrompt.keys ?? [heavyPrompt.key], true);
    setHeavyPrompt(null);
  }, [heavyPrompt, setKeysVisible]);

  const toggleSection = useCallback(
    (id: string, on: boolean) => {
      const def = allSections.find((s) => s.id === id);
      if (def) requestKeys(sectionToggleKeys(def), on);
    },
    [allSections, requestKeys],
  );

  const toggleItem = useCallback(
    (key: string) => requestKeys([key], !visible[key]),
    [requestKeys, visible],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }, []);

  // Search result picked: switch that layer on and open its section so the
  // row is visible in the sidebar. Always on, never a toggle — someone who
  // searched for a layer wants to see it, not to turn off what they found.
  // Expands every group on the path down to the layer, not just its parent —
  // a layer three levels deep is unreachable in the sidebar otherwise.
  const revealLayer = useCallback(
    (path: string[], key: string) => {
      setExpanded((e) => {
        const next = { ...e };
        for (const id of path) next[id] = true;
        return next;
      });
      requestKeys([key], true);
      setMobileSheet(null);
    },
    [requestKeys],
  );

  const changeRasterYear = useCallback((sectionId: string, year: number) => {
    setRasterYear((y) => ({ ...y, [sectionId]: year }));
  }, []);

  const changeRasterOpacity = useCallback((sectionId: string, opacity: number) => {
    setRasterOpacity((o) => ({ ...o, [sectionId]: opacity }));
  }, []);

  // Everything switched on, split back into what the map takes: vector
  // overlay keys, and ids of the permissioned `layers` rows. Raster themes
  // are handled separately below — they share the visibility map but are not
  // geojson. Both results are Map props, so they are rebuilt only when the
  // switches actually change; a new object every render would re-run the
  // map's source and filter effects for nothing.
  const { overlays, visibility } = useMemo(() => {
    const overlayKeys: Record<string, boolean> = {};
    const layerIds: Record<number, boolean> = {};
    for (const [key, on] of Object.entries(visible)) {
      if (!on || isRasterToggleKey(key)) continue;
      const layerId = layerIdOf(key);
      if (layerId === null) overlayKeys[key] = true;
      else layerIds[layerId] = true;
    }
    return { overlays: overlayKeys, visibility: layerIds };
  }, [visible]);

  const visibleFeatures = useMemo(
    () => (layers ?? EMPTY).features.filter((f) => visibility[f.properties.id]),
    [layers, visibility],
  );

  /** Every raster theme currently switched on, with the year each is showing. */
  const activeRasters = useMemo(
    () =>
      allSections
        .filter((section) => section.mode === "layer" && visible[rasterToggleKey(section.id)])
        .flatMap((section) => {
          // Falls back to the newest year, which is what the sidebar's own
          // year control shows when nothing has been picked yet.
          const year = rasterYear[section.id] ?? section.years.at(-1)?.year ?? null;
          const image = section.years.find((y) => y.year === year) ?? section.years.at(-1);
          return image ? [{ section, image }] : [];
        }),
    [allSections, visible, rasterYear],
  );

  const rasterOverlays: RasterOverlay[] = useMemo(
    () =>
      activeRasters.map(({ section, image }) => ({
        id: section.id,
        url: overlayDataUrl(image.key),
        bounds: image.bounds,
        opacity: rasterOpacity[section.id] ?? DEFAULT_RASTER_OPACITY,
      })),
    [activeRasters, rasterOpacity],
  );

  const legendRasterLayers = useMemo(
    () => activeRasters.map(({ section }) => ({ id: section.id, name: section.label })),
    [activeRasters],
  );

  const statsRasterLayers: StatsRasterLayer[] = useMemo(
    () =>
      activeRasters.map(({ section, image }) => ({
        id: section.id,
        name: section.label,
        year: image.year,
        years: section.years.map((y) => y.year),
      })),
    [activeRasters],
  );

  // Static overlays carry a colour but no geometry in React state, so the
  // legend takes their swatches straight off the section definitions — now
  // across every section, not just one open one.
  const legendOverlays: LegendOverlay[] = useMemo(
    () =>
      allSections
        .flatMap((section) => section.items)
        .filter((item) => overlays[item.key])
        .map(({ key, label, color, geometryKind }) => ({ key, label, color, geometryKind })),
    [allSections, overlays],
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
        visibility={visible}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
        onToggleSection={toggleSection}
        onToggleItem={toggleItem}
        rasterYear={rasterYear}
        onRasterYearChange={changeRasterYear}
        rasterOpacity={rasterOpacity}
        onRasterOpacityChange={changeRasterOpacity}
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
          <LayerSearch sections={sections} visibility={visible} onSelect={revealLayer} />
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
              rasterOverlays={rasterOverlays}
              overlays={overlays}
              overlayDefs={overlayDefs}
              basemap={basemap}
            />

            {/* Bottom-left: the map tools took the right edge, per the brief. */}
            <BasemapSwitcher
              value={basemap}
              onChange={setBasemap}
              className="absolute bottom-3 left-3 z-10"
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

      {/* Heavy layers are worth a warning, not a block: the client wants the
          real survey data shown, and someone who knows what they are asking
          for should be able to ask for it. */}
      <Dialog open={heavyPrompt !== null} onOpenChange={(o) => !o && setHeavyPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{heavyPrompt?.label} is a large layer</DialogTitle>
            <DialogDescription>
              This layer is about {heavyPrompt ? formatMb(heavyPrompt.sizeBytes) : ""} and can take
              a while to load — the map may be unresponsive until it finishes. Switch it on anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeavyPrompt(null)}>
              Cancel
            </Button>
            <Button onClick={confirmHeavy}>Switch it on</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mounted only while running: the tour always starts at step 1, so
          replaying it from the header needs no reset of its own. */}
      {tourOpen && <Walkthrough onClose={closeTour} />}
    </div>
  );
}
