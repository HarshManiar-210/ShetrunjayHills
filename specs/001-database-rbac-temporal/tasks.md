# Tasks: Database Schema — Public Access, RBAC Migration & Temporal Data Model

**Input**: `spec.md`, `plan.md` (this directory)
**Legend**: `[P]` = can run in parallel with other `[P]` tasks in the same phase (touches
different files, no shared dependency). Tasks without `[P]` are sequential.

## Phase 0 — Blocking Decisions
- [x] T001 ~~Confirm Open Items 1–3 (data shape, year coverage, role list) with client/TGIS~~ —
      **resolved 30 July 2026** (FRD v0.2 §11): mixed raster/vector/point per theme; continuous
      year range; 3 final roles (`public`/`regular_user`/`admin`). Phases 4–5 are unblocked.
- [ ] T002 Decide migration tooling (ordered `.sql` vs. library) per `plan.md` Phase 0.

## Phase 1 — Migration Infrastructure
- [ ] T003 Create `infra/migrations/` directory and a documented convention (naming, up-only vs.
      up/down) in `infra/migrations/README.md`.
- [ ] T004 Add a `make`/`pnpm`/shell script to apply pending migrations against the local
      Compose `postgis` service, referenced from the repo root README.

## Phase 2 — Anonymous / Public Access (unblocks Backend spec 002 Phase 1)
- [ ] T005 `infra/migrations/001_anonymous_role.sql` — insert an anonymous/public role row.
- [ ] T006 [P] `infra/migrations/002_public_permissions.sql` — grant the anonymous role
      `role_layer_permissions` rows for the three existing mock layers (as a mechanism test, ahead
      of real data).
- [ ] T007 [P] Repository integration test: `apps/api/internal/repository/*_test.go` — query as
      anonymous role returns exactly the public layer set.
- [ ] T008 Repository integration test: query as `admin` still returns the full set (regression
      guard on T005/T006).

## Phase 3 — Layer Styling as Data (unblocks Frontend spec 003 Phase 2)
- [ ] T009 [P] `infra/migrations/003_layer_style_columns.sql` — add `color`, `fill_opacity`,
      `category` columns to `layers` if not already present.
- [ ] T010 [P] Seed/update existing three mock layers with real colour values (from
      `docs/design-system.md` §2 GIS layer colour table) as a rehearsal for the real dataset.
- [ ] T011 Repository test: layer query result includes `color`/`fill_opacity` in every returned
      feature's properties, sourced from the DB, not a Go constant.

## Phase 4 — Temporal Dimension (unblocked — Open Items 1–2 resolved)
- [ ] T012 Finalize `LayerFeature`/`LayerSnapshot` table DDL: continuous year column (real
      date/year type, FR-005a), JSONB properties, per `plan.md` Phase 0 decision tree.
- [ ] T013 `infra/migrations/004_temporal_dimension.sql` — create the table, indexes on
      `(layer_id, year)`.
- [ ] T014 [P] Repository method + test: query features for a layer scoped to a specific year
      (any year in range, not just a discrete set).
- [ ] T015 [P] Repository method + test: query returns empty (not error) for a year with no data.
- [ ] T016 Repository method + test: query supports a year *range* (for FR-003's range case and
      Backend spec 002's filtering endpoint).
- [ ] T016a `infra/migrations/004a_themes.sql` — create `themes` table (FR-009: id, name,
      filter_config JSONB, data_format) and add nullable `theme_id` to `layers`.
- [ ] T016b `infra/migrations/004b_theme_statistics.sql` — create `theme_statistics` table
      (FR-010: theme_id, year, scope, payload JSONB).

## Phase 5 — Real Data Migration (unblocked — Open Item 3 resolved)
- [ ] T017 `infra/migrations/005_real_roles.sql` — insert the 3 confirmed roles: `public`,
      `regular_user`, `admin`.
- [ ] T018 `infra/migrations/006_real_themes_and_layers.sql` — insert the 14 confirmed themes
      (`spec.md`'s 14-Theme Filter & Output Catalog: Forest Cover, Forest Type, Vegetation Change,
      Fragmentation, LULC, Forest Status, Cadastral Map, Tree Count, Tree Species, Tree Height,
      Watershed [+ sub-theme layers: Streams, Geology, Potential SMC/Mati Pala/Check Dam/Pond],
      Wildlife Corridor, Habitat Suitability Model, Carbon Stock) with each theme's `filter_config`
      row, plus the 8 base/reference layers (Roads, Rivers, Railways, Canals, Grid, Village
      Boundaries, Zone Boundaries, SOI Toposheets), with categories and styling.
- [ ] T019 `infra/migrations/007_real_permissions.sql` — insert the confirmed
      role-to-layer permission matrix (Project_Document.md §6) — per-theme public/restricted
      split still needs client sign-off at the individual-layer level; seed a reasonable default
      (e.g. boundaries/roads/rivers public, sensitive wildlife/survey layers restricted) and flag
      it as adjustable data, not a blocker.
- [ ] T020 Decommission the Ahmedabad mock seed data from the default local-dev seed path, or
      move it behind a `SEED_MOCK_DATA=true` flag for developer convenience — do not delete the
      mock-data migration files themselves (useful as a reference/rehearsal fixture).

## Phase 6 — Verification (Constitution Principle VI)
- [ ] T021 Run the full repository test suite against a freshly-migrated database (`go test
      ./...` per README's documented command).
- [ ] T022 Manual verification: query layers as each real role (including anonymous) and confirm
      the returned set matches the intended permission matrix — sign off before Backend spec 002
      begins consuming these queries in handlers.

## Dependencies
- Phase 0 blocks everything.
- Phase 2 blocks Backend spec 002's auth-fallback work.
- Phase 3 blocks Frontend spec 003's data-driven layer styling work.
- Phase 4 blocks Backend spec 002's year-filter endpoint and Frontend spec 003's time control.
- Phase 5 depends on Phase 2–4 table shapes being final.
