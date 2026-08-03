# Tasks: Backend API — Public Access, Filtering & Tiled Delivery

**Input**: `spec.md`, `plan.md` (this directory)
**Depends on**: `001-database-rbac-temporal` Phase 2 (anonymous role) and Phase 4 (temporal
queries) being complete.
**Legend**: `[P]` = parallelizable within its phase.

## Phase 0 — Alignment
- [ ] T001 Confirm spec `001`'s repository method signatures match this spec's handler needs;
      file any interface adjustments against spec `001` before proceeding.
- [ ] T002 Resolve remaining Open Item (tile endpoint necessity for v1) — determines whether
      Phase 4 below is in scope now or deferred. (Admin/export/search are no longer conditional —
      confirmed scope, FRD v0.2.)

## Phase 1 — Anonymous Access (unblocks Frontend spec 003 Phase 1)
- [ ] T003 `apps/api/internal/handlers/middleware.go` — change token-missing/invalid handling
      from reject to anonymous-role fallback for public-reachable routes.
- [ ] T004 [P] Handler test: `GET /api/layers` with no `Authorization` header → 200, public
      layers only.
- [ ] T005 [P] Handler test: `GET /api/layers` with an expired token → 200, public layers only
      (same as T004 — regression guard for FR's "degrades gracefully" requirement).
- [ ] T006 [P] Handler test: `GET /api/layers` with each real role's valid token → 200, that
      role's full permitted set (per Constitution Principle VI — every role, not just one).
- [ ] T007 Manual verification pass (curl) across anonymous + every role; record output in the
      PR description per the existing project's verification convention.

## Phase 2 — Filtering (year, category)
- [ ] T008 [P] `apps/api/internal/handlers/layers.go` — add `?year=` query param, delegate to
      spec `001`'s year-scoped repository method.
- [ ] T009 [P] Add `?year_from=&year_to=` range variant, delegate to spec `001`'s range method.
- [ ] T010 [P] Add category/layer-group filtering (design per FR-004's endpoint-vs-param choice,
      finalized in `plan.md` Phase 1).
- [ ] T011 Handler tests: combined role + year filter in one request (Scenario 3 from spec.md).
- [ ] T012 Handler test: filter combination matching zero features returns 200 + empty
      FeatureCollection, not 404 (Edge Case from spec.md).

## Phase 3 — Layer Metadata Endpoint (unblocks Frontend spec 003's layer panel + time control)
- [ ] T013 `apps/api/internal/models/layer.go` — `LayerMetadata` DTO: id, name, category, color,
      fill_opacity, delivery mode, available years/range, bounds (bbox — backs Frontend spec
      `003`'s "Zoom to Layer" action).
- [ ] T014 `apps/api/internal/handlers/layers.go` — `GET /api/layers/metadata` (or fold into
      existing `GET /api/layers` response shape — decide in review) returning `LayerMetadata[]`,
      role-filtered.
- [ ] T015 Handler test: metadata response never includes a layer the caller's role can't see,
      even in metadata-only form (no "ghost" restricted layers leaking existence).

## Phase 3a — Theme Filters & Statistics (unblocks Frontend spec 003's per-theme filter UI)
- [ ] T013a `apps/api/internal/models/theme.go` — `Theme` DTO: id, name, filter_config,
      data_format.
- [ ] T013b `apps/api/internal/handlers/themes.go` — `GET /api/themes` (role-filtered, drives
      the 14-theme layer panel without hardcoding theme names, per FR-010).
- [ ] T013c `apps/api/internal/handlers/themes.go` — `GET /api/themes/{id}/statistics`, filtered
      by year and zone/grid/village scope where applicable (FR-011).
- [ ] T013d Handler test: filter_config drives which query params a theme accepts (e.g.
      Cadastral Map accepts `village`, Wildlife Corridor accepts `fauna`, Forest Status accepts
      `raster_toggle`/`vector_toggle`, Watershed accepts `sub_theme` — full mapping in spec `001`'s
      14-Theme Filter & Output Catalog) — reading from data, not a per-theme `switch` in the
      handler (Constitution Principle I).

## Phase 4 — Tiled Delivery (conditional on T002 resolving remaining Open Item as "needed now")
- [ ] T016 `apps/api/internal/handlers/tiles.go` — `GET /api/tiles/{id}/{z}/{x}/{y}`, delegates
      to spec `001`'s `ST_AsMVT`-backed query.
- [ ] T017 Handler test: request for a layer with `delivery: "mvt"` returns a valid MVT binary.
- [ ] T018 Handler test: request for a layer with `delivery: "mvt"` but no MVT support wired up
      yet fails loudly (500, clear message) — not a silently empty tile (Edge Case from spec.md).
- [ ] T019 Role filtering applies identically to tile requests as to GeoJSON requests — test
      explicitly, since it's a separate code path from T003–T012.

## Phase 5 — Export (resolved: PDF, Excel, CSV — FR-012)
- [ ] T020 `apps/api/internal/handlers/export.go` — role-filtered export endpoint supporting
      `?format=pdf|xlsx|csv`.
- [ ] T021 Handler test: export applies the same role filter as the read endpoints (FR-012) —
      attempt export as a role without permission on a given layer, expect denial, not a filtered-
      but-still-served response.
- [ ] T021a Handler test: each of the 3 formats produces a well-formed file for a sample
      layer/theme-statistics export.

## Phase 5a — Search (resolved: layer-attribute + place/coordinate — FR-013)
- [ ] T024 `apps/api/internal/handlers/search.go` — `GET /api/search?q=` covering layer-attribute
      matches (survey number, village name, feature ID).
- [ ] T025 Integrate a geocoding provider (Open Item 2 — TBD which) for free-text place/coordinate
      lookup, behind the same handler.
- [ ] T026 Handler test: search results are role-filtered — a restricted layer's features never
      appear in an anonymous caller's search results.

## Phase 5b — Admin Write API (resolved in scope — FR-008)
- [ ] T027 `apps/api/internal/handlers/admin.go` — CRUD endpoints for roles, layers, themes,
      permissions, users, gated to `admin` role only.
- [ ] T028 Handler test: non-admin roles (including anonymous) get 403 on every admin route.
- [ ] T029 Handler test: a role/layer/permission created via the admin API is immediately visible
      to the read endpoints (Phase 1–3) with zero code change — end-to-end proof of Principle I.

## Phase 6 — Verification
- [ ] T022 Full `go test ./...` run against spec `001`'s fully-migrated schema.
- [ ] T023 Rate-limiting decision (Open Item 3) implemented or explicitly deferred with a
      written note in this file's Open Items tracking.
- [ ] T030 If audit logging (FRD Open Item 7) is confirmed needed, add a hook to Phase 5b's write
      endpoints and to restricted-layer reads; otherwise leave unimplemented and note the decision.

## Dependencies
- Phase 1 blocks Frontend spec 003 Phase 1 (removing the login-redirect requirement).
- Phase 2 blocks Frontend spec 003's filter UI.
- Phase 3 / 3a block Frontend spec 003's layer panel, time control, and per-theme filter/stats UI
  (they need metadata to render without hardcoding).
- Phase 4 is conditional — do not block other phases on it.
- Phase 5 / 5a / 5b block Frontend spec 003's export action, search bar, and Admin (`Users`)
  screen respectively.
