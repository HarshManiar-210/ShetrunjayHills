# Implementation Plan: Frontend — Public Map, Design System, Time Control & Context Panel

**Spec**: `spec.md` (this directory) | **Constitution**: `/.specify/memory/constitution.md`
**Depends on**: `002-backend-api` (public endpoints, filtering, metadata) which depends on
`001-database-rbac-temporal`.

## Technical Context

- **Framework**: Next.js 14+ (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Node 24,
  pnpm.
- **Map**: MapLibre GL JS, client-only via `next/dynamic({ ssr: false })` — never imported in a
  server component.
- **State**: React state/hooks for map/filter/selection state; no browser storage decision is
  made by this plan for persistence (Open Item 2) — implement session-only first, add persistence
  behind a clear flag once that item resolves.
- **Testing**: component tests (existing project convention, extend as needed) + E2E for the
  scenarios in `spec.md` (framework TBD if not already established in the repo — Playwright is a
  reasonable default given Next.js).

## Constitution Check

| Principle | Compliance approach |
|---|---|
| I. Data-Driven Configuration | FR-002/FR-003 explicitly remove the last hardcoded layer-name `match` expression — this plan treats that removal as a named, tested task (Phase 2), not an incidental side effect. |
| III. Server-Side Authorization | The frontend's job is to *render* what the API returns, never to locally re-implement access decisions (e.g. never fetch a restricted layer "just in case" and hide it client-side). |
| IV. Design System Fidelity | Every visual task in this plan cites the specific `docs/design-system.md` section it implements — no component ships with an undocumented style choice. |
| VI. Verification Across States | Test plan (spec.md Scenarios 1–6) explicitly covers anonymous, authenticated, and mid-session login transition — not just the logged-in happy path. |
| VII. Scope Discipline | Search/export/admin-UI (previously gated Open Items) are now confirmed scope (FRD v0.2) and appear in the structure below as planned work, not speculative build-ahead. What remains genuinely gated: the tile-consumption path (Backend `002` Open Item 1) and locked-vs-hidden layer treatment (this spec's Open Item 1). |

No deviations requiring Complexity Tracking.

## Project Structure

```
apps/web/
├── app/
│   ├── globals.css                    # MODIFY — light+dark palette + --radius (FR-008/013)
│   ├── layout.tsx                     # MODIFY — --font-sans/--font-mono fix (FR-008)
│   ├── login/                         # MODIFY — post-login state preservation (FR-005)
│   ├── (dashboard)/map/               # MODIFY — remove unconditional auth redirect (FR-001)
│   └── (dashboard)/admin/users/       # NEW — Admin UI, `admin`-role-gated (FR-019)
├── components/
│   ├── Sidebar.tsx                    # NEW — Dashboard/Layers/Users(admin)/About/Logout (FR-012)
│   ├── Header.tsx                     # NEW — search bar, theme toggle, role avatar (FR-013/014)
│   ├── Map.tsx                        # MODIFY — remove hardcoded match, camera-fit-once (FR-003/004)
│   ├── LayerPanel.tsx                 # NEW/MODIFY — theme-grouped, metadata-driven (FR-002/011/017),
│   │                                  #   overflow menu: Zoom to Layer + Transparency slider (FR-021)
│   ├── DatasetInfoCard.tsx            # NEW — persistent dataset metadata card (FR-015)
│   ├── LegendCard.tsx                 # NEW — floating legend, independent of LayerPanel (FR-016)
│   ├── ThemeFilterPanel.tsx           # NEW — filter_config-driven controls (year/satellite/
│   │                                  #   raster-vector/village/zone-grid/fauna/sub_theme) + stats (FR-017)
│   ├── SearchBar.tsx                  # NEW — attribute + geocode search, ⌘K (FR-014)
│   ├── TimeControl.tsx                # NEW — continuous year slider (FR-007)
│   ├── ExportMenu.tsx                 # NEW — PDF/Excel/CSV action (FR-018)
│   ├── ContextPanel/
│   │   ├── ContextPanel.tsx           # NEW — two-state container (FR-006)
│   │   ├── EmptyState.tsx             # NEW — Layers/Legend/Dataset info
│   │   └── FeatureState.tsx           # NEW — attributes/coordinates/actions
│   ├── admin/                         # NEW — Users screen: role/layer/theme/permission CRUD forms
│   └── ui/                            # shadcn components — add only what's used (existing rule)
├── lib/
│   ├── auth.ts                        # MODIFY — anonymous-aware fetch wrapper (FR-001/005)
│   ├── layers-api.ts                  # NEW — typed client for spec 002's metadata/feature endpoints
│   ├── themes-api.ts                  # NEW — typed client for spec 002's theme/statistics endpoints
│   ├── search-api.ts                  # NEW — typed client for spec 002's search endpoint
│   └── admin-api.ts                   # NEW — typed client for spec 002's admin write API
```

## Phase 0 — Research
- Confirm Backend spec `002`'s metadata/theme/search/admin endpoint shapes are finalized before
  building the corresponding components against them, to avoid a rewrite.
- Resolve Open Item 1 (locked-but-listed vs. hidden) before building the lock-icon treatment —
  affects whether `LayerPanel.tsx` ever receives restricted-layer data at all. Still pending.
- Reconcile `docs/design-system.md` against the 30 July 2026 mockup (sidebar, header, cards,
  palettes, breakpoints) — this plan treats the mockup as authoritative until that document is
  updated (Constitution Principle IV, v1.1.0 note), but the document itself should be edited as
  part of this phase, not left stale.

## Phase 1 — Design Outputs
- `quickstart.md` — how to run the frontend against a locally-migrated, seeded backend (specs
  `001`+`002`) and manually verify Scenarios 1–6.
- Component contracts (props/state shape) for `LayerPanel`, `TimeControl`, `ContextPanel` —
  documented inline via TypeScript interfaces rather than a separate contracts file, consistent
  with frontend convention.

## Complexity Tracking

None.
