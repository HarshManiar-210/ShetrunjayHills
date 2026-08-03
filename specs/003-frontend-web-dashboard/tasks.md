# Tasks: Frontend — Public Map, Design System, Time Control & Context Panel

**Input**: `spec.md`, `plan.md` (this directory)
**Depends on**: `002-backend-api` Phase 1 (anonymous access) and Phase 3 (metadata endpoint).
**Legend**: `[P]` = parallelizable within its phase.

## Phase 0 — Alignment
- [ ] T001 Confirm Backend spec `002`'s metadata/theme/search/admin response shapes are stable;
      adjust the `lib/*-api.ts` types plan accordingly before Phases 3+ begin.
- [ ] T002 Resolve Open Item 1 (locked-but-listed vs. hidden restricted layers) with product —
      blocks Phase 4's lock-indicator work. (Admin UI, export, and search are no longer gated —
      confirmed scope, FRD v0.2.)

## Phase 1 — Public Access (design system §10 build-order steps 1–2 folded in here)
- [ ] T003 `apps/web/app/layout.tsx` — fix `--font-sans`/`--font-mono` variable naming
      (design system §5, one-line fix, whole-app effect).
- [ ] T004 [P] `apps/web/app/globals.css` — replace palette values and `--radius` per design
      system §1; remove unused `--chart-1..5` and the leftover violet `--sidebar-primary`.
- [ ] T005 `apps/web/lib/auth.ts` — replace unconditional "no token → redirect to `/login`" with
      "no/invalid token → render public state" (FR-001), calling the now-public backend endpoints
      from spec `002` Phase 1.
- [ ] T006 `apps/web/app/(dashboard)/map/` — remove the auth gate blocking initial render for
      anonymous visitors.
- [ ] T007 E2E test (Scenario 1): unauthenticated session loads `/`, map renders, no redirect.
- [ ] T008 `apps/web/lib/auth.ts` / login flow — preserve map view, layer toggles, and time
      selection across the login transition (FR-005).
- [ ] T009 E2E test (Scenario 3): filter state survives login round trip.

## Phase 1a — Sidebar, Header & Dark Mode (from 30 July mockup — FR-012/013)
- [ ] T009a `apps/web/components/Sidebar.tsx` — wordmark + Dashboard/Layers/About/Logout for all
      roles, `Users` item (Admin-badged) rendered only when `AuthContext.role === 'admin'`.
- [ ] T009b Component test (Scenario 7): sidebar nav item set matches each of the 3 roles exactly,
      including anonymous (no authenticated-only items).
- [ ] T009c `apps/web/components/Header.tsx` — search bar shell (wired in Phase 4a), theme
      toggle, role avatar/name/chevron.
- [ ] T009d Full light + dark palette applied per the mockup's 8-swatch sets (`globals.css`
      `[data-theme="dark"]` block or equivalent); toggle preserves camera + filter state
      (Scenario 8, FR-013).
- [ ] T009e E2E test (Scenario 8): toggle theme mid-session, camera bounds and active filters
      unchanged before/after.

## Phase 2 — Layer Styling as Data (removes the core-invariant violation)
- [ ] T010 `apps/web/components/Map.tsx` — remove the hardcoded `match` expression on
      `["get", "name"]`; read `["get", "color"]` from feature properties instead (FR-003).
- [ ] T011 [P] `apps/web/components/Map.tsx` — fit bounds once on initial load only; stop
      re-fitting on every data refresh (FR-004, the `[now — fix]` camera bug).
- [ ] T012 [P] Add line casing (5px surface-colour under 3px layer-colour stroke) per design
      system §2 rendering rules — legibility fix, not optional polish.
- [ ] T013 Component test: swapping mock layer data (different colors) changes rendered style
      with zero code change — proves FR-002/FR-003 are actually data-driven, not just refactored.

## Phase 3 — Layer Panel & Legend (metadata-driven)
- [ ] T014 `apps/web/lib/layers-api.ts` — typed client for the metadata endpoint from spec `002`
      Phase 3.
- [ ] T015 `apps/web/components/LayerPanel.tsx` — render layers grouped by the 14-theme catalog
      (spec `001`'s 14-Theme Filter & Output Catalog) plus a base/reference-layers group, toggle
      switches, colour/line-style swatches, overflow menu per layer (per mockup) — sourced from
      theme metadata, not a hardcoded group list.
- [ ] T015a `apps/web/components/LayerPanel.tsx` — overflow menu actions: **Zoom to Layer** (map
      fit-bounds using `LayerMetadata.bounds` from spec `002`) and **Layer Transparency** (opacity
      slider, `setPaintProperty`, client-only, per-layer) (FR-021, Scenario 11).
- [ ] T016 Component test (Scenario 2): panel renders exactly the layers present in a mocked
      metadata response, no more/no less.
- [ ] T016a Component test (Scenario 11): Zoom to Layer calls fit-bounds with the correct layer's
      `bounds`; transparency slider changes only its own layer's opacity.
- [ ] T017 Error/retry state for a failed metadata fetch (Edge Case from spec.md) — not a
      silently empty panel.

## Phase 3a — Dataset Info & Legend Cards (FR-015/016)
- [ ] T017a `apps/web/components/DatasetInfoCard.tsx` — persistent card: Dataset, Description,
      Last Updated, Source, CRS, Scale; visible independent of feature selection.
- [ ] T017b `apps/web/components/LegendCard.tsx` — floating card, bottom-right on desktop per
      mockup, symbol/colour per active layer, independent of `LayerPanel.tsx`.
- [ ] T017c `apps/web/lib/themes-api.ts` — typed client for spec `002`'s theme/statistics
      endpoints.
- [ ] T017d `apps/web/components/ThemeFilterPanel.tsx` — renders Year, Satellite toggle,
      Raster/Vector toggle, Village, Zone/Grid, Fauna, and sub-theme (Watershed) controls per the
      selected theme's `filter_config` (FR-017, full per-theme mapping in spec `001`'s 14-Theme
      Filter & Output Catalog), plus its Statistics panel.
- [ ] T017e Component test (Scenario 10): swapping mocked `filter_config` changes which controls
      render, no code change required — parameterized across Forest Cover, Cadastral Map, Forest
      Status, Watershed, and Wildlife Corridor's differing `filter_config` shapes.

## Phase 4 — Time Control (blocked on T002)
- [ ] T018 `apps/web/components/TimeControl.tsx` — year/range selector sourced from metadata's
      available-years field (FR-007), never a hardcoded 1980–2026 range.
- [ ] T019 Visual distinction for selectable vs. non-selectable years if rendered on a continuous
      scale (Edge Case from spec.md).
- [ ] T020 Wire selection to a data refetch scoped to the chosen year/range (Scenario 4),
      without a full page reload.
- [ ] T021 Component test: control options match API metadata, not a hardcoded constant.
- [ ] T022 [P] Lock-icon treatment on restricted layers per T002's resolution (FR-011).

## Phase 4a — Search (FR-014, resolved)
- [ ] T022a `apps/web/lib/search-api.ts` — typed client for spec `002`'s `/api/search` endpoint.
- [ ] T022b `apps/web/components/SearchBar.tsx` — header search input, `⌘K` shortcut, renders
      mixed attribute-match and geocode-match results.
- [ ] T022c Wire result selection to map fly-to (Scenario 9).
- [ ] T022d Component test: both result types render and both trigger fly-to from one input.

## Phase 5 — Context Panel
- [ ] T023 `apps/web/components/ContextPanel/EmptyState.tsx` — Layers, Legend, Dataset info
      (design system §8 empty state).
- [ ] T024 [P] `apps/web/components/ContextPanel/FeatureState.tsx` — name/layer, mono
      coordinates, properties table, computed area/length, action buttons (Zoom To, Copy
      coordinates, Export where authorized).
- [ ] T025 `apps/web/components/ContextPanel/ContextPanel.tsx` — container switching between the
      two states; responsive rail (desktop, 360px) / bottom sheet (mobile, 40% height, expands on
      selection) per design system §8.1.
- [ ] T026 Panel closes gracefully if the selected feature's layer becomes inaccessible
      mid-session (Edge Case from spec.md) rather than showing stale restricted data.
- [ ] T027 Component tests for both states + responsive breakpoints (Scenarios 5–6).
- [ ] T027a `apps/web/components/ExportMenu.tsx` — PDF/Excel/CSV export action (FR-018), reachable
      from both the Context Panel (per-feature) and `ThemeFilterPanel.tsx` (per-theme/dataset),
      wired to spec `002`'s export endpoint.

## Phase 6 — Design System Completion (remaining §10 build-order items)
- [ ] T028 [P] Theme-aware map background via `setPaintProperty`, not `setStyle` (design system
      §3) — preserves camera position across theme switches with no save/restore code.
- [ ] T029 [P] Loading skeleton matching the map's footprint, replacing the "Loading map…" string
      (design system §3).
- [ ] T030 [P] Apply spacing, elevation, and motion tokens across all new and existing components
      (design system §4).
- [ ] T031 [P] Apply the Lucide icon vocabulary (design system §6), including a lock icon for
      T022 if not already in that table.

## Phase 7 — Accessibility (Constitution + design system §9)
- [ ] T032 Every icon-only control has an `aria-label`.
- [ ] T033 Visible focus ring on all interactive elements, including map controls.
- [ ] T034 Layer list is keyboard-reachable independent of clicking the canvas.
- [ ] T035 Colour-independent layer identity verified in the legend and on-map (label/casing
      alongside colour).
- [ ] T036 `prefers-reduced-motion` respected across all motion added in Phase 6.
- [ ] T037 Manual keyboard-only and screen-reader smoke test (Project_Document §11 success
      criterion).
- [ ] T037a Confirmed breakpoints implemented per mockup: Desktop ≥1280px (sidebar + right rail),
      Tablet 768–1279px, Mobile ≤767px (bottom tab bar: Map / Layers / Legend / Menu) (FR-020).

## Phase 8 — Admin UI (resolved in scope — FR-019)
- [ ] T038 `apps/web/lib/admin-api.ts` — typed client for spec `002`'s admin write API.
- [ ] T039 `apps/web/app/(dashboard)/admin/users/` — Users screen, gated to `admin` role
      (redirect or 403 page for any other role, including anonymous).
- [ ] T040 `apps/web/components/admin/` — CRUD forms for roles, layers, themes, permissions,
      users.
- [ ] T041 E2E test: a role/layer/permission created via the Admin UI is immediately reflected
      in the Layers panel with zero code change (end-to-end proof of Principle I from the UI
      side, complementing Backend spec `002` T029).
- [ ] T042 Component test: non-admin roles never see the `Users` sidebar item and are blocked
      from the route directly (defense in depth alongside Backend `002`'s 403).

## Dependencies
- Phase 1 requires Backend spec `002` Phase 1 deployed to the dev environment.
- Phase 1a can proceed in parallel with Phase 1 (mostly static UI), but the theme toggle's
  state-preservation (T009e) depends on Phase 1's filter-state plumbing.
- Phase 3 / 3a require Backend spec `002` Phase 3 / 3a (metadata + theme/statistics endpoints).
- T015a (Zoom to Layer) requires `LayerMetadata.bounds` from Backend spec `002` T013.
- Phase 4 is blocked on T002 (Open Item 1 resolution).
- Phase 4a requires Backend spec `002` Phase 5a (search endpoint).
- Phase 5's T027a requires Backend spec `002` Phase 5 (export endpoint).
- Phase 8 requires Backend spec `002` Phase 5b (admin write API).
- Phase 7 runs last but tests functionality introduced in every earlier phase — do not treat it
  as a final bolt-on; individual `aria-label`/focus-ring work should land with each component's
  own task where practical.
