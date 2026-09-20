"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ListTree, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BasemapSwitcher } from "@/components/BasemapSwitcher";
import { YearBar, type TemporalTheme } from "@/components/YearBar";
import { Sidebar } from "@/components/Sidebar";
import { SidebarSections } from "@/components/SidebarSections";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LegendCard } from "@/components/LegendCard";
import { StatsCard } from "@/components/StatsPanel";
import { LayerSearch } from "@/components/LayerSearch";
import {
  Walkthrough,
  shouldAutoRunWalkthrough,
  markWalkthroughSeen,
} from "@/components/Walkthrough";
import { cn } from "@/lib/utils";
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

/**
 * Above this, switching on a layer that is *not* tiled prompts first.
 *
 * A tiled layer streams only the viewport, so its archive size is irrelevant
 * and it is never gated. A whole-file GeoJSON is fetched and parsed in full,
 * and past a certain size that takes the tab down rather than merely being
 * slow — which is exactly what happened when the database still pointed Tree
 * Height at its 166 MB GeoJSON after the seed had moved it to PMTiles. The
 * largest whole-file overlay today is Streams at 20 MB, so nothing reaches
 * this in normal operation: it is here to make data/seed drift announce
 * itself instead of killing the browser.
 */
const HEAVY_LAYER_BYTES = 50 * 1024 * 1024;

interface HeavyLayer {
  key: string;
  label: string;
  sizeBytes: number;
  /** Every key the confirmed action switches on — a whole group, or one row. */
  keys: string[];
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}

const EMPTY: LayerCollection = { type: "FeatureCollection", features: [] };

type MobileSheet = "menu" | "legend" | null;

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

  const [rasterYear, setRasterYear] = useState<Record<string, number>>({});
  // Group id → 0..1. Absent means DEFAULT_RASTER_OPACITY; kept per theme so
  // fading one raster to see another underneath does not fade both.
  const [rasterOpacity, setRasterOpacity] = useState<Record<string, number>>({});

  // The year bar drives one theme at a time. Only the user's explicit choice
  // is stored; which theme is actually focused is derived below, so a theme
  // being switched off cannot leave the bar pointing at nothing.
  const [preferredTheme, setPreferredTheme] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  // A layer big enough to be worth warning about, waiting on confirmation.
  const [heavyPrompt, setHeavyPrompt] = useState<HeavyLayer | null>(null);
  // Heavy layers already accepted this session, so flipping one off and on
  // does not re-prompt. A ref, not state: nothing renders from it, and it
  // must not trigger a re-render when it grows.
  const confirmedHeavyRef = useRef<Set<string>>(new Set());
  // Group id -> the year being compared against, or absent when compare mode
  // is off for that theme. Per theme, so switching the bar to another layer
  // does not carry someone else's comparison across.
  const [compareYear, setCompareYear] = useState<Record<string, number>>({});
  const [blend, setBlend] = useState(0.5);

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

  /**
   * Size per toggle key for the layers that are fetched whole, so the warning
   * is driven by what the files actually weigh (the API stats them) rather
   * than by a hardcoded list of which layers are big.
   */
  const heavyLayers = useMemo(() => {
    const byKey: Record<string, HeavyLayer> = {};
    for (const overlay of overlayMeta) {
      // A tiled layer never loads in full, so its size does not gate anything.
      if (overlay.tiled) continue;
      const size = overlay.size_bytes ?? 0;
      if (size < HEAVY_LAYER_BYTES) continue;
      byKey[overlay.key] = {
        key: overlay.key,
        label: overlay.label,
        sizeBytes: size,
        keys: [overlay.key],
      };
    }
    return byKey;
  }, [overlayMeta]);

  const setKeysVisible = useCallback((keys: string[], on: boolean) => {
    setVisible((v) => {
      const next = { ...v };
      for (const key of keys) next[key] = on;
      return next;
    });
  }, []);

  // Switching a layer *on* is the only direction that can cost anything, so
  // that is the only direction the size warning gates. Turning things off, and
  // anything already confirmed, goes straight through.
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
    setKeysVisible(heavyPrompt.keys, true);
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

  /** The sidebar's "Reset view": switch every layer off and start again. */
  const resetLayers = useCallback(() => {
    setVisible({});
    setPlaying(false);
  }, []);

  // Search result picked: switch that layer on and open its section so the
  // row is visible in the sidebar. Always on, never a toggle — someone who
  // searched for a layer wants to see it, not to turn off what they found.
  // Picking a search result just switches the layer on. The sidebar is a flat
  // list now and a row expands when it is on, so there is no disclosure state
  // left to open on the way down — which is why `path` goes unused here.
  const revealLayer = useCallback(
    (_path: string[], key: string) => {
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

  /** Switched-on raster themes that actually have years to step through. */
  const temporalThemes: TemporalTheme[] = useMemo(
    () =>
      activeRasters
        .filter(({ section }) => section.years.length > 1)
        .map(({ section }) => ({ id: section.id, label: section.label, years: section.years })),
    [activeRasters],
  );

  // Derived rather than stored: the user's pick wins while that theme is
  // still on, otherwise the bar adopts the most recently switched-on one.
  // Deriving it means switching a theme off cannot leave the bar pointing at
  // a layer that is gone, with no effect needed to repair the state.
  const focusedTheme = useMemo(() => {
    if (temporalThemes.length === 0) return null;
    if (preferredTheme && temporalThemes.some((t) => t.id === preferredTheme)) {
      return preferredTheme;
    }
    return temporalThemes[temporalThemes.length - 1].id;
  }, [temporalThemes, preferredTheme]);

  const focusedYears = temporalThemes.find((t) => t.id === focusedTheme)?.years ?? [];
  const focusedYear = focusedTheme
    ? (rasterYear[focusedTheme] ?? focusedYears.at(-1)?.year ?? null)
    : null;
  const focusedCompareYear = focusedTheme ? (compareYear[focusedTheme] ?? null) : null;

  // Defined here rather than beside the other change handlers because it
  // needs `focusedTheme`, which is derived just above.
  const changeCompareYear = useCallback(
    (year: number | null) => {
      if (!focusedTheme) return;
      setCompareYear((c) => {
        const next = { ...c };
        if (year === null) delete next[focusedTheme];
        else next[focusedTheme] = year;
        return next;
      });
    },
    [focusedTheme],
  );

  const rasterOverlays: RasterOverlay[] = useMemo(
    () =>
      activeRasters.flatMap(({ section, image }) => {
        const opacity = rasterOpacity[section.id] ?? DEFAULT_RASTER_OPACITY;
        const base = {
          id: section.id,
          url: overlayDataUrl(image.key),
          bounds: image.bounds,
          opacity,
        };

        // Compare mode draws the second year as its own layer stacked over the
        // first, faded by the blend. Listing it after the base is what puts it
        // on top — the map reconciler restacks in array order.
        const against = compareYear[section.id];
        const other = against != null ? section.years.find((y) => y.year === against) : undefined;
        if (!other) return [base];

        return [
          base,
          {
            id: `${section.id}:compare`,
            url: overlayDataUrl(other.key),
            bounds: other.bounds,
            opacity: opacity * blend,
          },
        ];
      }),
    [activeRasters, rasterOpacity, compareYear, blend],
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
        // The overlay row for the year on screen — what the statistics
        // endpoint measures.
        imageKey: image.key,
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
        onToggleSection={toggleSection}
        onToggleItem={toggleItem}
        onResetLayers={resetLayers}
        rasterYear={rasterYear}
        onRasterYearChange={changeRasterYear}
        rasterOpacity={rasterOpacity}
        onRasterOpacityChange={changeRasterOpacity}
      />
    </>
  );

  // Legend and Statistics are two independent cards now, not two tabs of one.
  // The legend is what makes the map readable, so it should never be the thing
  // you switch away from to check a number.
  const infoPanel = (className?: string) => (
    <div className={cn("flex min-h-0 flex-col gap-2 overflow-hidden", className)}>
      {/* Each card scrolls its own body rather than the column scrolling as a
          whole, so the two headers stay put and a long legend never pushes
          the statistics out of reach.
          `flex-1 min-h-0` lets a card give up height when the other needs it
          — that is what makes its body scroll — while `max-h-fit` stops it
          claiming more than its content, so a short legend does not sit in
          half the column with empty space under it. */}
      <LegendCard
        layers={visibleFeatures}
        overlays={legendOverlays}
        rasterLayers={legendRasterLayers}
        className="min-h-0 max-h-fit flex-1"
      />
      <StatsCard
        rasterLayers={statsRasterLayers}
        vectorFeatures={visibleFeatures}
        className="min-h-0 max-h-fit flex-1"
      />
    </div>
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
            © Shatrunjay Hills {new Date().getFullYear()}
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

            {/* Sits a row above the coordinate readout, which keeps the
                bottom-centre position the brief shows for the readout while
                giving the timeline its own line. */}
            {temporalThemes.length > 0 && focusedTheme && (
              // Centred within the band the other floating panels leave free,
              // rather than within the map: the basemap switcher holds the
              // bottom-left corner and the tool stack the bottom-right, and
              // centring on the map itself runs the bar under both once it is
              // wide. The container is click-through so the empty space beside
              // the bar does not eat map drags.
              <div className="pointer-events-none absolute right-14 bottom-14 left-[13.5rem] z-10 hidden justify-center md:flex">
                <YearBar
                  themes={temporalThemes}
                  focusedId={focusedTheme}
                  onFocusChange={setPreferredTheme}
                  year={focusedYear}
                  onYearChange={(year) => changeRasterYear(focusedTheme, year)}
                  playing={playing}
                  onPlayingChange={setPlaying}
                  compareYear={focusedCompareYear}
                  onCompareYearChange={changeCompareYear}
                  blend={blend}
                  onBlendChange={setBlend}
                  className="pointer-events-auto"
                />
              </div>
            )}

            {/* Bottom-left: the map tools took the right edge, per the brief. */}
            <BasemapSwitcher
              value={basemap}
              onChange={setBasemap}
              className="absolute bottom-3 left-3 z-10"
            />
          </div>

          {/* Top-right, now flush to the edge the tool stack vacated. Height
              follows content, capped so a long legend stops clear of those
              tools rather than running into them: the stack is a fixed 205px
              (six 28px buttons, a separator and padding), plus its own inset
              and a gap between the two. */}
          {infoPanel(
            "absolute top-3 right-3 z-10 hidden max-h-[calc(100%-17rem)] w-72 xl:flex",
          )}
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
          {infoPanel()}
        </SheetContent>
      </Sheet>

      {/* A warning, not a block: someone who knows what they are asking for
          should be able to ask for it. This only fires for a layer fetched
          whole — a tiled layer streams and is never gated. */}
      <Dialog open={heavyPrompt !== null} onOpenChange={(o) => !o && setHeavyPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{heavyPrompt?.label} is a large layer</DialogTitle>
            <DialogDescription>
              This layer is about {heavyPrompt ? formatMb(heavyPrompt.sizeBytes) : ""} and is
              loaded in one piece, so the map may be unresponsive until it finishes — and on a
              file this size the tab can run out of memory. Switch it on anyway?
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

      <LoginDialog
        open={auth.loginOpen}
        onOpenChange={auth.setLoginOpen}
        onSuccess={auth.onLoginSuccess}
      />

      {/* Mounted only while running: the tour always starts at step 1, so
          replaying it from the header needs no reset of its own. */}
      {tourOpen && <Walkthrough onClose={closeTour} />}
    </div>
  );
}
