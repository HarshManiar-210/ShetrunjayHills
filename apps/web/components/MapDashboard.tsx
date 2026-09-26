"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ListTree, Menu as MenuIcon, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BasemapSwitcher } from "@/components/BasemapSwitcher";
import { YearBar, type TemporalTheme } from "@/components/YearBar";
import { Sidebar } from "@/components/Sidebar";
import { SidebarSections } from "@/components/SidebarSections";
import { LayerPicker, SectionLayerPicker, SectionPicker } from "@/components/LayerPicker";
import { ExportButton } from "@/components/ExportButton";
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
import { CoordinateSearch } from "@/components/CoordinateSearch";
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
  groupToggleKey,
  isGroupToggleKey,
  isRasterToggleKey,
  layerIdOf,
  optionOwners,
  rasterToggleKey,
  sectionLayers,
  DEFAULT_RASTER_OPACITY,
} from "@/lib/sections";
import { DEFAULT_BASEMAP, type BasemapId } from "@/lib/basemaps";
import type { LegendOverlay } from "@/components/LegendCard";
import type { StatsRasterLayer } from "@/components/StatsPanel";
import type { RasterOverlay } from "@/components/Map";
import type { ExportInput } from "@/lib/map-export";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { LatLng } from "@/lib/coords";

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

// Whether the layers panel can be folded away: a chevron in its header, and
// once folded, a small "Layers" button in its place. Flip to false to withhold
// both — everything behind them keeps working, the panel simply stays open.
const SHOW_PANEL_COLLAPSE = true;

/**
 * Vertical room the tool stack needs in the bottom-right corner: its six 28px
 * buttons, a separator and padding come to 205px, plus its own inset and the
 * gap a panel above it should keep. Measured from the map card's bottom edge.
 */
const TOOL_STACK_CLEARANCE = 232;

const EMPTY: LayerCollection = { type: "FeatureCollection", features: [] };

type MobileSheet = "menu" | "legend" | null;

export function MapDashboard() {
  const auth = useAuthState();
  const [layers, setLayers] = useState<LayerCollection | null>(null);
  const [overlayMeta, setOverlayMeta] = useState<OverlayMeta[]>([]);
  const [layerGroups, setLayerGroups] = useState<LayerGroup[]>([]);
  const [error, setError] = useState(false);
  // The tree fetch failing leaves the section list empty; this is what tells
  // an empty seed apart from a failed load, so the picker can offer a retry.
  const [treeError, setTreeError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP);
  const [tourOpen, setTourOpen] = useState(false);

  // Layers are chosen in two stages, and these are the two maps.
  //
  // `selected` is the navbar picker's answer to "which layers am I working
  // with" — everything it holds is listed in the map's layers panel. `visible`
  // is that panel's answer to "which of those are drawing", so it is always a
  // subset: deselecting a layer switches it off on the way out. Both use the
  // same toggle-key namespace (see lib/sections.ts), and both start empty.
  //
  // The split exists because the panel now floats over the map. A panel
  // carrying every layer in the seed could only ever be a docked column;
  // carrying the handful someone picked, it fits on the map.
  // Which sections the first dropdown has picked. Its only job is to decide
  // what the layer dropdown lists, so it holds section ids rather than toggle
  // keys and never reaches the map.
  const [activeSections, setActiveSections] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  // The floating panel can be folded away to clear the map. It follows the
  // selection: folded while nothing is picked (an empty panel is just clutter
  // over the map), opened when the first layer is picked, and folded again
  // when the last one goes. In between, the user's own fold/unfold stands.
  // Adjusted during render rather than in an effect, so there is no frame
  // with the stale state.
  const hasSelection = Object.values(selected).some(Boolean);
  const [panelOpen, setPanelOpen] = useState(hasSelection);
  const [prevHasSelection, setPrevHasSelection] = useState(hasSelection);
  if (hasSelection !== prevHasSelection) {
    setPrevHasSelection(hasSelection);
    setPanelOpen(hasSelection);
  }

  // Whether the legend and statistics column has grown down into the corner
  // the tool stack sits in, which moves the stack left of it.
  const [infoReachesCorner, setInfoReachesCorner] = useState(false);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const mapAreaRef = useRef<HTMLDivElement | null>(null);

  // The last coordinate searched for, pinned on the map. Replaced, never
  // stacked: one pin at a time.
  const [pin, setPin] = useState<LatLng | null>(null);

  const [rasterYear, setRasterYear] = useState<Record<string, number>>({});
  // Group id → 0..1. Absent means DEFAULT_RASTER_OPACITY; kept per theme so
  // fading one raster to see another underneath does not fade both.
  const [rasterOpacity, setRasterOpacity] = useState<Record<string, number>>({});

  // The year bar drives one theme at a time. Only the user's explicit choice
  // is stored; which theme is actually focused is derived below, so a theme
  // being switched off cannot leave the bar pointing at nothing.
  const [preferredTheme, setPreferredTheme] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  // The live map, for the JPG export: it needs the actual canvas, and the
  // camera as it is at the moment of the click. A ref rather than state —
  // nothing renders from it, and it must not re-render the dashboard when the
  // map finishes mounting.
  const mapRef = useRef<MapLibreMap | null>(null);

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

  const defaultsAppliedRef = useRef(false);

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
        // Seeded `default_on` layers start selected and drawing — once, so a
        // retry never switches back on a layer someone has since turned off.
        if (!defaultsAppliedRef.current) {
          defaultsAppliedRef.current = true;
          const on = Object.fromEntries(
            meta.filter((o) => o.default_on && o.status !== "pending").map((o) => [o.key, true]),
          );
          setSelected((sel) => ({ ...on, ...sel }));
          setVisible((v) => ({ ...on, ...v }));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLayerGroups([]);
        setOverlayMeta([]);
        setTreeError(true);
      });
    return () => {
      cancelled = true;
      setTreeError(false);
    };
  }, [retryTick]);

  /**
   * Watch the legend and statistics column, and move the tool stack out of its
   * way when it grows into the corner.
   *
   * Measured rather than derived from whether the cards are expanded: the
   * column's height depends on how many layers are switched on and how many
   * classes their legends carry, so two expanded cards can be shorter than one.
   * The observer fires once when it starts watching, which is what sets the
   * initial value — calling the check straight from the effect body would be
   * setting state during the effect.
   */
  useEffect(() => {
    const info = infoRef.current;
    const area = mapAreaRef.current;
    if (!info || !area) return;

    const observer = new ResizeObserver(() => {
      const panel = info.getBoundingClientRect();
      const map = area.getBoundingClientRect();
      // Zero height means the column is hidden at this breakpoint, in which
      // case nothing is in the corner and the stack stays there.
      setInfoReachesCorner(
        panel.height > 0 && map.bottom - panel.bottom < TOOL_STACK_CLEARANCE,
      );
    });
    observer.observe(info);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

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
  // Groups the seed gives a dropdown of their own leave the Sections/Layers
  // pair, so a layer is only ever listed in one navbar picker.
  const pickerSections = useMemo(() => sections.filter((s) => !s.ownPicker), [sections]);
  const ownPickerSections = useMemo(() => sections.filter((s) => s.ownPicker), [sections]);
  // Flattened once, because almost everything downstream asks a question of
  // the whole tree rather than of one level of it.
  const allSections = useMemo(() => flattenSections(sections), [sections]);
  const owners = useMemo(() => optionOwners(allSections), [allSections]);

  // An options group switches on with every option that has data, so picking
  // it draws something straight away; the side panel narrows it from there.
  const keysFor = useCallback(
    (key: string) => {
      if (!isGroupToggleKey(key)) return [key];
      const group = allSections.find((s) => groupToggleKey(s.id) === key);
      return [key, ...(group?.items ?? []).filter((i) => !i.pending).map((i) => i.key)];
    },
    [allSections],
  );
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

  const toggleItem = useCallback(
    (key: string) => requestKeys([key], !visible[key]),
    [requestKeys, visible],
  );

  /**
   * Pick a layer into the panel, or take it back out.
   *
   * Both directions carry visibility with them. Selecting switches the layer
   * on, because picking a layer out of the menu is already the act of asking
   * to see it — arriving in the panel switched off would make every layer a
   * two-click affair. Deselecting switches it off, because a layer that has
   * left the panel must not carry on drawing with no control left anywhere
   * that could stop it.
   *
   * Switching on still goes through requestKeys, so the size warning gates a
   * layer picked from the menu exactly as it gates one switched on in the
   * panel.
   */
  const toggleSelected = useCallback(
    (key: string, picked: boolean) => {
      setSelected((sel) => ({ ...sel, [key]: picked }));
      const keys = keysFor(key);
      if (picked) {
        requestKeys(keys, true);
        return;
      }
      setVisible((v) => {
        const next = { ...v };
        for (const k of keys) delete next[k];
        return next;
      });
    },
    [requestKeys, keysFor],
  );

  const deselectLayer = useCallback(
    (key: string) => toggleSelected(key, false),
    [toggleSelected],
  );

  /**
   * Pick a section into the layer dropdown, or take it back out.
   *
   * Dropping a section drops its layers with it: they would otherwise stay
   * selected and drawing with no dropdown left that lists them, and so no way
   * to switch them off except the panel.
   */
  const toggleSectionActive = useCallback(
    (id: string, on: boolean) => {
      setActiveSections((a) => ({ ...a, [id]: on }));
      if (on) return;
      const section = sections.find((s) => s.id === id);
      if (!section) return;
      for (const layer of sectionLayers(section)) toggleSelected(layer.key, false);
    },
    [sections, toggleSelected],
  );

  /** The panel's "Reset view": switch every layer off, keeping the selection. */
  const resetLayers = useCallback(() => {
    setVisible({});
    setPlaying(false);
  }, []);

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
      if (!on || isRasterToggleKey(key) || isGroupToggleKey(key)) continue;
      // An option draws only while its group's own switch is on.
      if (owners[key] && !visible[owners[key]]) continue;
      const layerId = layerIdOf(key);
      if (layerId === null) overlayKeys[key] = true;
      else layerIds[layerId] = true;
    }
    return { overlays: overlayKeys, visibility: layerIds };
  }, [visible, owners]);

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
          label: image.label === section.label ? section.label : `${section.label} · ${image.label}`,
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
            label: `${section.label} · ${other.label}`,
          },
        ];
      }),
    [activeRasters, rasterOpacity, compareYear, blend],
  );

  const legendRasterLayers = useMemo(
    () =>
      activeRasters.map(({ section, image }) => ({
        id: section.id,
        name: section.label,
        // A single-image theme labels its one row with the theme's own name,
        // so repeating it would read "Orthomosaic · Orthomosaic".
        yearLabel: image.label === section.label ? undefined : image.label,
        // The overlay row for the image on screen — see LegendRasterLayer.imageKey.
        imageKey: image.key,
      })),
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
        .flatMap((section) =>
          section.items.map((item) => ({
            ...item,
            group: section.mode === "options" ? section.label : undefined,
          })),
        )
        .filter((item) => overlays[item.key])
        .map(({ key, label, color, geometryKind, categories, group }) => ({
          key,
          label,
          color,
          geometryKind,
          categories,
          group,
        })),
    [allSections, overlays],
  );

  const layersPanel = (onCollapse?: () => void) => (
    <>
      {error && (
        <div className="flex flex-col items-start gap-2 px-3 py-3">
          <p className="text-sm text-destructive">Could not load layers.</p>
          <Button size="sm" variant="outline" onClick={() => setRetryTick((t) => t + 1)}>
            Retry
          </Button>
        </div>
      )}
      <SidebarSections
        sections={sections}
        selected={selected}
        visibility={visible}
        onToggleLayer={toggleItem}
        onDeselectLayer={deselectLayer}
        onResetLayers={resetLayers}
        onCollapse={onCollapse}
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
  // A card with nothing to show is left out rather than drawn empty.
  const hasLegend =
    visibleFeatures.length > 0 || legendOverlays.length > 0 || legendRasterLayers.length > 0;
  const hasStats = visibleFeatures.length > 0 || statsRasterLayers.length > 0;

  const infoPanel = (className?: string, ref?: React.Ref<HTMLDivElement>) => (
    <div ref={ref} className={cn("flex min-h-0 flex-col gap-2 overflow-hidden", className)}>
      {/* Each card scrolls its own body rather than the column scrolling as a
          whole, so the two headers stay put and a long legend never pushes
          the statistics out of reach.
          `flex-1 min-h-0` lets a card give up height when the other needs it
          — that is what makes its body scroll — while `max-h-fit` stops it
          claiming more than its content, so a short legend does not sit in
          half the column with empty space under it. */}
      {hasLegend && (
        <LegendCard
          layers={visibleFeatures}
          overlays={legendOverlays}
          rasterLayers={legendRasterLayers}
          className="min-h-0 max-h-fit flex-1"
        />
      )}
      {hasStats && (
        <StatsCard
          rasterLayers={statsRasterLayers}
          vectorFeatures={visibleFeatures}
          className="min-h-0 max-h-fit flex-1"
        />
      )}
    </div>
  );

  /**
   * Read at click time, not at render time: the map's pixels and its camera
   * are whatever they are when someone presses export, and a snapshot taken
   * when the header rendered would export a stale view.
   */
  const exportInput = useCallback((): ExportInput | null => {
    const map = mapRef.current;
    if (!map) return null;
    const centre = map.getCenter();
    return {
      mapCanvas: map.getCanvas(),
      basemap,
      centre: { lat: centre.lat, lng: centre.lng },
      zoom: map.getZoom(),
      layers: visibleFeatures,
      overlays: legendOverlays,
      rasterLegends: legendRasterLayers,
      rasterStats: statsRasterLayers,
    };
  }, [basemap, visibleFeatures, legendOverlays, legendRasterLayers, statsRasterLayers]);

  // The two dropdowns, shared between the bar and the mobile sheet. Below md
  // the bar cannot hold them: the brand, search, export and help controls
  // already fill a phone's width, and two more would squeeze the search field
  // to nothing. They move into the menu sheet instead, above the panel they
  // fill.
  const pickers = (
    <>
      <SectionPicker
        sections={pickerSections}
        active={activeSections}
        onToggleSection={toggleSectionActive}
        loadError={treeError}
        onRetry={() => setRetryTick((t) => t + 1)}
      />
      <LayerPicker
        sections={pickerSections}
        active={activeSections}
        selected={selected}
        onToggleLayer={toggleSelected}
      />
      {ownPickerSections.map((section) => (
        <SectionLayerPicker
          key={section.id}
          section={section}
          selected={selected}
          onToggleLayer={toggleSelected}
        />
      ))}
    </>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        user={auth.user}
        onMenuClick={() => setMobileSheet("menu")}
        onLoginClick={auth.openLogin}
        onLogoutClick={auth.logout}
        onHelpClick={() => setTourOpen(true)}
        actions={<ExportButton input={exportInput} />}
        layerPicker={
          <div className="hidden shrink-0 items-center gap-2 md:flex">{pickers}</div>
        }
        search={
          <CoordinateSearch
            onGoTo={(point) => {
              setPin({ ...point });
              setMobileSheet(null);
            }}
          />
        }
      />

      {/* No docked column any more: the layers panel floats over the map's
          top-left corner, so the map has the full width of the window. */}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 p-4">
          <div
            ref={mapAreaRef}
            className="relative size-full overflow-hidden rounded-2xl border border-border shadow-e3"
          >
            <Map
              onReady={(map) => {
                mapRef.current = map;
              }}
              data={layers ?? EMPTY}
              visibility={visibility}
              rasterOverlays={rasterOverlays}
              overlays={overlays}
              overlayDefs={overlayDefs}
              basemap={basemap}
              infoReachesCorner={infoReachesCorner}
              pin={pin}
              // Handed to the map rather than positioned here, so it shares
              // the bottom-centre stack with the coordinate readout: the
              // readout then rides above whatever height the bar happens to
              // be, instead of guessing at a fixed offset.
              bottomCenter={
                temporalThemes.length > 0 &&
                focusedTheme && (
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
                    className="pointer-events-auto hidden md:flex"
                  />
                )
              }
            />

            {/* Back in the bottom-left corner it started in, with the
                tool stack beside it rather than opposite. */}
            <BasemapSwitcher
              value={basemap}
              onChange={setBasemap}
              className="absolute bottom-3 left-3 z-10"
            />

            {/* The layers panel (top-left) and the legend column (top-right)
                share one row inside the map card, so they are clipped to the
                map's own boundary and can never overlap each other: when the
                map narrows, the layers panel gives up width before the two
                meet. Click-through, so the gap between them still drags the
                map. */}
            <div className="pointer-events-none absolute inset-3 z-10 hidden items-start justify-between gap-3 md:flex">
              {/* The tool stack has left this side, so all that shares its
                  column below is the basemap switcher and the left end of the
                  year bar's row. It scrolls inside that. */}
              {panelOpen || !SHOW_PANEL_COLLAPSE ? (
                <div className="pointer-events-auto flex max-h-[calc(100%-8.5rem)] w-[var(--layers-panel-w)] min-w-0 shrink flex-col overflow-hidden rounded-2xl bg-card shadow-e3 ring-1 ring-foreground/10">
                  {/* Null for everyone but admins, who get the users link here. */}
                  <Sidebar variant="combined" user={auth.user} />
                  {layersPanel(SHOW_PANEL_COLLAPSE ? () => setPanelOpen(false) : undefined)}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="pointer-events-auto gap-2 bg-card shadow-e2 hover:bg-accent dark:bg-card dark:hover:bg-accent"
                  onClick={() => setPanelOpen(true)}
                  // Stands in for the folded panel as the walkthrough's
                  // "sections" stop, so that step still has something to
                  // spotlight.
                  data-tour="sections"
                >
                  <PanelLeftOpen className="size-3.5" strokeWidth={2} />
                  Layers
                </Button>
              )}

              {/* It may grow down past the tool stack in the corner below —
                  the stack steps aside for it rather than the column stopping
                  short. It still stops clear of the year bar's own row. */}
              {infoPanel(
                "pointer-events-auto hidden max-h-[calc(100%-4.5rem)] w-72 shrink-0 xl:flex",
                infoRef,
              )}
            </div>
          </div>
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
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 pb-3 md:hidden">
            {pickers}
          </div>
          <Sidebar variant="combined" user={auth.user} />
          <div className="flex flex-1 flex-col bg-linear-to-b from-panel to-panel-deep">
            {layersPanel()}
          </div>
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
