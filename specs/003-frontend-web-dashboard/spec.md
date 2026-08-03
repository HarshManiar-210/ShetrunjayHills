# Feature Specification: Frontend — Public Map, Design System, Time Control & Context Panel

**Feature branch**: `003-frontend-web-dashboard`
**Status**: Draft — depends on `001-database-rbac-temporal`, `002-backend-api`. Admin UI, export
formats, and search are now confirmed in scope (FRD v0.2 §11) — this changes Non-Goals below.
**Input**: FRD.md v0.2 §6.2–§6.8, §9; Project_Document.md v0.2 §4–§7; `docs/design-system.md`
(full, pending reconciliation against the 30 July 2026 mockup — see plan.md); `Dashboard_workflow.docx`

## Overview

The frontend today is a single map page and a login page on the stock shadcn palette, and it
unconditionally redirects to `/login` when no token is present. This spec covers turning it into
the public-first, role-aware, time-navigable dashboard the FRD describes, fully applying
`docs/design-system.md`'s token set and component language, which is treated as binding rather
than restated here.

## User Scenarios & Testing

### Scenario 1 — Anonymous visitor lands on the map
A visitor with no account opens the dashboard URL and sees the map, populated with public layers,
with no login prompt or redirect blocking the view.

**Acceptance**: E2E test — unauthenticated browser session loads `/`, map renders, no redirect to
`/login` occurs.

### Scenario 2 — Layer panel reflects permission state honestly
The layer panel shows every layer the API's metadata endpoint returns for the current auth state;
a restricted layer the anonymous visitor cannot see does not appear at all — the panel never
shows a greyed-out entry for a layer whose existence a public user isn't meant to know about,
unless product direction says otherwise (Open Item).

**Acceptance**: Component test — layer panel renders exactly the layers present in the (mocked)
metadata response, no more, no less.

### Scenario 3 — Login preserves context
A visitor filtering by year 2010 with two layers active logs in mid-session; after login, the
same year and layer selection persist, now augmented with any newly-unlocked layers.

**Acceptance**: E2E test — map view/filter state survives the login round trip.

### Scenario 4 — Time control changes the map
Selecting a year in the time control updates rendered features for time-enabled layers without a
full page reload, and the control only offers years the metadata endpoint reports as available
(FRD FR-4.5 — never implies data density that doesn't exist).

**Acceptance**: Component test — time control options are sourced from API metadata, not
hardcoded; selecting a year triggers the expected data fetch.

### Scenario 5 — Feature inspection
Clicking/tapping a feature opens the Context Panel in its feature-selected state (design system
§8) with attributes, mono-formatted coordinates, computed area/length, and available actions
(Zoom To, Copy coordinates, Export where authorized).

**Acceptance**: Component test per design system §8's two-state spec.

### Scenario 6 — Responsive behavior
On mobile, the Context Panel is a bottom sheet at 40% height that expands on feature selection
without covering the selected feature; on desktop, a 360px right rail. The page itself never
scrolls (design system §8.1).

**Acceptance**: Visual/E2E test at each breakpoint defined in the design system.

### Edge Cases
- API metadata request fails (network error) — layer panel shows an error/retry state, not a
  silently empty panel that reads as "no layers exist."
- Selected feature's layer becomes inaccessible mid-session (e.g. token expired) — Context Panel
  closes gracefully rather than displaying stale restricted data.
- Time control's year range spans a gap with no data for several consecutive years — control
  visually distinguishes selectable vs. non-selectable years (FR-4.5).

### Scenario 7 — Sidebar reflects role (new, from mockup)
A `regular_user` sees sidebar nav Dashboard / Layers / About / Logout; an `admin` additionally
sees a `Users` item (badge-marked "Admin"). An anonymous visitor sees the map without the
authenticated-only nav items at all, not greyed out.

**Acceptance**: Component test — sidebar nav item set matches the mocked `AuthContext`'s role
exactly, for all three roles.

### Scenario 8 — Dark mode preserves camera & data
Toggling light/dark in the header changes the map style and full UI palette without resetting
camera position, active layer selections, or the current year/filter state.

**Acceptance**: E2E test — toggle theme mid-session, assert camera bounds and filter state
unchanged before/after.

### Scenario 9 — Header search covers both cases
Typing a survey number in the header search bar flies to that feature; typing a place name or
coordinate pair flies to that location via the geocoding provider (Backend spec `002` FR-013) —
same input, both resolved from one search bar, not two separate controls.

**Acceptance**: Component test with mocked search API — attribute-match and geocode-match results
both render and both trigger a map fly-to on selection.

### Scenario 10 — Per-theme filters and stats
Selecting the "Forest Cover" theme surfaces its Year and Satellite filters; choosing a year
auto-enables the Satellite/Drone layer (togglable) and populates a Statistics panel for that
theme/year — all driven by the theme's `filter_config` from the API (Backend spec `002` FR-010),
not a hardcoded per-theme component branch. The same mechanism, with different `filter_config`
values, drives every other theme — e.g. selecting "Cadastral Map" surfaces a Village filter
instead, "Forest Status" surfaces a Raster/Vector toggle instead of Year, and "Wildlife Corridor"
surfaces a Fauna selector (see spec `001`'s 14-Theme Filter & Output Catalog for the full mapping).

**Acceptance**: Component test — swapping the mocked theme metadata's `filter_config` changes
which filter controls render, without a code change; parameterized across at least Forest Cover
(year+satellite), Cadastral Map (village), Forest Status (raster/vector toggle), Watershed
(sub_theme), and Wildlife Corridor (fauna) to prove the component tree branches on data, not on
theme name.

### Scenario 11 — Zoom to Layer and transparency (`Dashboard_workflow.docx` common functions)
From a layer's overflow menu, "Zoom to Layer" fits the map to that layer's `bounds` (Backend spec
`002` FR-005) with no hardcoded per-layer coordinates, and a transparency slider adjusts that
layer's on-map opacity live via `setPaintProperty`, independent of any other layer's opacity.

**Acceptance**: Component test — invoking "Zoom to Layer" on a mocked layer calls the map's
fit-bounds API with that layer's `bounds` value; the transparency slider's value is reflected in
the layer's paint property and no other layer's.

## Requirements

- **FR-001**: The app MUST render the map and public layers for an unauthenticated visitor with
  no redirect to `/login`. The existing "no token → redirect" rule is replaced with "no token →
  render public state," consistent with Backend spec `002`'s anonymous-fallback behavior.
- **FR-002**: The frontend MUST derive the layer panel, legend, and time control entirely from
  the API's layer metadata response — no layer name, color, or year is hardcoded in a component
  (Constitution Principle I, extended to the frontend).
- **FR-003**: `apps/web/components/Map.tsx`'s existing hardcoded `match` expression on layer name
  MUST be removed in favor of `["get", "color"]` reading the API-supplied per-feature color
  (already specified in design system §2 — this spec is where it gets executed).
- **FR-004**: The map MUST fit bounds once on initial load and MUST NOT re-fit on subsequent data
  refreshes (fixes the existing `[now — fix]` camera bug noted in the design system).
- **FR-005**: Login/logout MUST preserve the current map view, active layer toggles, and time
  selection (FR-1.4 from the FRD).
- **FR-006**: The Context Panel MUST implement both states from design system §8 — empty
  (Layers/Legend/Dataset info) and feature-selected (attributes/coordinates/actions) — in one
  component, with the responsive rail/sheet behavior from §8.1.
- **FR-007**: The time control MUST only present years/ranges the API reports as having data,
  and MUST visually distinguish years with vs. without data if displayed on a continuous scale.
- **FR-008**: The app MUST apply the full `docs/design-system.md` token set: palette and
  `--radius` in `globals.css`, the `--font-sans`/`--font-mono` variable fix in `layout.tsx`,
  spacing/elevation/motion conventions, and the icon vocabulary (§6) — per design system §10's
  own build order, which this spec's task breakdown follows.
- **FR-009**: Layer identity (in legend and on-map) MUST use colour plus a second channel
  (label and/or line casing/pattern) — never colour alone (design system §9, accessibility
  floor).
- **FR-010**: Every icon-only control MUST have an `aria-label`; all interactive elements MUST
  keep a visible focus ring; the layer list MUST be keyboard-reachable, not only clickable on the
  canvas (design system §9).
- **FR-011**: A visual indicator (e.g. lock icon) SHOULD distinguish layers that require login
  from those already visible, for a signed-out user browsing the panel — subject to Open Item 1
  below about whether restricted layers are listed-but-locked or fully hidden.
- **FR-012**: The app MUST implement the sidebar navigation confirmed in the 30 July mockup:
  wordmark + Dashboard / Layers / About / Logout for all roles, plus a `Users` item (Admin-badged)
  for `admin` only — sourced from `AuthContext.role`, not a hardcoded per-role component swap
  (Scenario 7).
- **FR-013**: Light/dark theme toggle is **MUST**, not SHOULD (superseding FRD's earlier FR-2.8
  SHOULD) — both palettes are fully specified in the mockup. Toggling MUST preserve camera
  position and all active filter/selection state (Scenario 8).
- **FR-014**: A persistent header **search bar** (`Search location, place or coordinates...`,
  `⌘K` shortcut) MUST resolve both layer-attribute matches and free-text place/coordinate matches
  via Backend spec `002`'s `/api/search` endpoint (FR-5.1/5.3, resolved — Scenario 9).
- **FR-015**: A persistent **Dataset Information** card (Dataset, Description, Last Updated,
  Source, CRS, Scale) MUST render alongside the Layers panel at all times — distinct from, and in
  addition to, the Context Panel's feature-selected state (per mockup).
- **FR-016**: A floating **Legend** card MUST render as its own element (not merged into the
  Layers panel), listing symbol/colour per active layer.
- **FR-017**: Per-theme filter controls — Year, Satellite toggle, Raster/Vector toggle (Forest
  Status), Village (Cadastral Map), Zone/Grid, Fauna selection (Wildlife Corridor, Habitat
  Suitability), and a sub-theme selector (Watershed: Streams / Geology / Potential SMC) — and a
  per-theme **Statistics panel** MUST render according to each theme's `filter_config` (Backend
  spec `002` FR-010) — no per-theme `if`/`switch` in the component tree (Constitution Principle I,
  Scenario 10).
- **FR-021**: Every layer's overflow menu MUST offer **Zoom to Layer** (fits the map to that
  layer's `bounds` from Backend spec `002`'s metadata endpoint) and a **Layer Transparency**
  slider (per-layer opacity, client-side only — no API round trip), per
  `Dashboard_workflow.docx`'s common dashboard functions (Scenario 11).
- **FR-022**: The existing feature-click-to-inspect flow (FR-006's Context Panel feature-selected
  state) satisfies `Dashboard_workflow.docx`'s "Identify Feature Tool" — no separate tool/mode is
  required; this FR exists only to record that the requirement is met, not open.
- **FR-018**: Export action (where authorized) offers **PDF, Excel, and CSV** (resolved — FRD
  FR-6.1), reachable from both the Context Panel (per-feature) and the theme Statistics panel
  (per-theme/dataset).
- **FR-019**: An **Admin UI** (`Users` screen) for managing roles, layers, themes, permissions,
  and users is **in scope for v1** (resolved — supersedes this spec's earlier "Admin UI" Non-Goal).
  It consumes Backend spec `002`'s admin write API (FR-008) and is reachable only via the `admin`
  role's sidebar `Users` item.
- **FR-020**: Confirmed responsive breakpoints: Desktop ≥1280px (sidebar + right rail), Tablet
  768–1279px, Mobile ≤767px (bottom tab bar: Map / Layers / Legend / Menu, replacing the sidebar).

## Key Entities (frontend state, not DB)
- `LayerPanelState` — per layer: id, visibility toggle, color/legend swatch, locked/unlocked.
- `TimeSelection` — single year or range, sourced from available-years metadata.
- `SelectedFeature` — geometry + properties for the Context Panel's feature-selected state.
- `AuthState` — current role (including "anonymous"), token, expiry.
- `ThemeFilterState` — active theme, its `filter_config`-driven control values (year, satellite,
  raster/vector toggle, village, zone/grid, fauna, sub_theme), and the fetched `ThemeStatistic`
  payload for the current selection.
- `LayerOverflowState` — per layer: transparency/opacity value (client-only), zoom-to-layer
  trigger (reads `LayerMetadata.bounds`).
- `SearchState` — query string, result set (mixed attribute-match + geocode-match), selected
  result.
- `AdminFormState` — role/layer/theme/permission/user CRUD form state for the Users screen
  (FR-019); mirrors Backend spec `002`'s admin DTOs, not redefined independently.

## Non-Goals (this spec)
- Any backend/database work — this spec consumes the contracts specs `001`/`002` produce.
- Command palette, analytics pages, notifications, measure/draw tools — explicitly deferred per
  the design system's own "Out of scope" section and Constitution Principle VII.
- The specific admin write-API implementation (Backend spec `002` FR-008) — this spec only builds
  the Admin UI's frontend consuming that API (FR-019), not the API itself.
- Choice of geocoding provider for FR-014's place/coordinate search — Backend spec `002` Open
  Item 2.

## Open Items

### Resolved (FRD v0.2 §11)
- ~~**Export UI**~~ — resolved: PDF/Excel/CSV (FR-018); which roles is still Backend spec `002`'s
  permission model to enforce, not a frontend question.
- ~~**Search/geocoding**~~ — resolved: general place/coordinate search + layer-attribute search,
  both via one header search bar (FR-014).

### Still open
1. **Locked-but-listed vs. fully-hidden restricted layers** for anonymous/under-permissioned
   users (affects FR-011 and Scenario 2) — a product decision about whether the existence of
   restricted layers is itself sensitive. Not addressed by the mockup (which only shows a
   `regular_user` view with two layers already unchecked, not a lock-state example).
2. **Filter-state persistence** across visits (not just across a login event within one session)
   — localStorage/cookie vs. session-only; per FRD Open Item 9 (still open).
3. **Per-theme public/restricted split** at the individual-layer level within the 14-theme
   catalog (FRD §6.8) — affects which themes/layers an anonymous visitor sees by default; tracked
   as a data-seeding decision in spec `001`, not a frontend blocker.
