# Implementation Plan: Database Schema — Public Access, RBAC Migration & Temporal Data Model

**Spec**: `spec.md` (this directory) | **Constitution**: `/.specify/memory/constitution.md`

## Technical Context

- **Language/Engine**: PostgreSQL + PostGIS (version matching current `postgis` Compose service).
- **Migration mechanism**: SQL files under `infra/postgis-init` today (init-only). This plan
  introduces a proper forward-migration directory (e.g. `infra/migrations/NNN_description.sql`)
  so schema changes after initial seed are reviewable and reversible, rather than continuing to
  edit the single `init.sql` in place — `init.sql` becomes "migration 000" for fresh environments.
- **Testing**: Go's repository integration test suite (`apps/api`, `go test ./...` against
  `DATABASE_URL`), extended with cases for the anonymous role and year-scoped queries.
- **Target**: local Docker Compose `postgis` service for dev; deployment target TBD (Project
  Document §9 item 8).

## Constitution Check

| Principle | Compliance approach |
|---|---|
| I. Data-Driven Configuration | Anonymous role, new layers, and years are exclusively rows/migrations — no schema design here introduces a code-level name check. |
| II. Repository Pattern | This spec only touches schema; it does not add SQL to handlers. Backend spec (002) is responsible for keeping new queries inside `internal/repository`. |
| III. Server-Side Authorization | The anonymous role's permission rows are the enforcement mechanism the backend spec relies on — this is where that guarantee is actually created. |
| V. Positional Accuracy | Any tiling support (`ST_AsMVT`) is additive alongside full-precision `ST_AsGeoJSON`, not a replacement — see FR-008. |
| VII. Scope Discipline | Raw raster serving (tile server/pipeline) stays out of this spec even though raster-format themes are now confirmed (FRD §6.8) — the schema stores a reference/pointer column only; the serving mechanism is Backend spec (002)/infra work. |

No deviations requiring Complexity Tracking.

## Project Structure

```
infra/
├── postgis-init/
│   └── init.sql                  # existing — becomes baseline/migration 000 for fresh envs
├── migrations/                   # NEW — forward migrations from this point on
│   ├── 001_anonymous_role.sql
│   ├── 002_layer_styling_columns.sql   # if not already present from design-system work
│   ├── 003_layer_categories.sql
│   ├── 004_temporal_dimension.sql      # continuous year column (resolved — FR-005a)
│   ├── 004a_themes.sql                 # NEW — 14-theme catalog + filter_config (FR-009)
│   ├── 004b_theme_statistics.sql       # NEW — per-theme stats output (FR-010)
│   └── 005_real_role_layer_seed.sql    # 3 roles + 14 themes + base layers (resolved)
```

## Phase 0 — Research (resolved — 30 July 2026)

- ~~Confirm Open Items 1–3 from `spec.md` with the client/TGIS.~~ **Done** — see `spec.md` Open
  Items section and FRD v0.2 §11.
- Decide migration tooling: raw `.sql` files run in order (simplest, matches current project
  style) vs. a Go migration library (e.g. `golang-migrate`). Recommendation: start with ordered
  `.sql` files to match the project's existing simplicity bias (Constitution's engineering
  constraints favor minimal added dependencies); revisit only if migration state tracking becomes
  a real pain point.
- `LayerFeature`/`LayerSnapshot` table shape, now that data shape is confirmed **mixed**: one
  table, continuous `year` column (real date/year type, indexed `(layer_id, year)`), geometry
  column, JSONB `properties` — works for vector polygon and point-data themes directly.
  Raster-format themes (e.g. NDVI-style layers within Forest Cover/LULC) store a reference/pointer
  in the same table shape (e.g. a tile/asset URL in `properties`) rather than a second parallel
  schema; the actual tile-serving mechanism is Backend spec (002)'s concern, not this schema's.
  Point data at high volume (e.g. per-tree LiDAR points under Tree Count/Species/Height) may
  warrant a partitioned table later — defer that decision to when real point counts are known,
  per Constitution Principle VII (don't speculatively over-build).

## Phase 1 — Design Outputs

- `data-model.md` (ready to generate — Open Items resolved) — entity list, columns, indexes,
  constraints for: `roles` (3 rows), `users`, `themes` (14 rows — `filter_config` values per
  `spec.md`'s 14-Theme Filter & Output Catalog), `layers` (14 themes' layers + 8 base/reference
  layers, Watershed's sub-themes as same-`theme_id` rows distinguished by `category`),
  `theme_statistics`, `role_layer_permissions`, and the new temporal entity.
- `contracts/` — not applicable at the database layer directly; the query *shapes* the backend
  spec's contracts depend on are documented here as repository method signatures (Go interfaces),
  e.g.:
  ```go
  type LayersGetter interface {
      GetLayersForRole(ctx context.Context, roleID int, year *int) ([]Layer, error)
  }
  ```
- `quickstart.md` — how to run the new migrations locally against the Compose `postgis` service
  and verify with `go test` (repository integration suite).

## Complexity Tracking

None — no principle violations required by this design.
