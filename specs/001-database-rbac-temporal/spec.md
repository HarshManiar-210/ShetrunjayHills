# Feature Specification: Database Schema — Public Access, RBAC Migration & Temporal Data Model

**Feature branch**: `001-database-rbac-temporal`
**Status**: Draft — Open Items 1–3 below resolved (FRD.md v0.2 §11); no longer blocked on data
shape, year coverage, or role list. Proceed with schema design.
**Input**: FRD.md v0.2 §6.1, §6.4, §6.7, §6.8, §8; Project_Document.md v0.2 §5, §6, §9

## Overview

The database currently models `roles`, `users`, `layers`, and `role_layer_permissions` as static,
non-temporal rows for three mock roles and three mock layers around Ahmedabad. This spec covers
the schema evolution required to support (a) a real anonymous/public access tier enforced at the
data layer, (b) the real Shetrunjay Hills role set (**3 roles**: `public`, `regular_user`,
`admin` — `support_team` dropped) and the **14-theme layer catalog** (FRD §6.8: Forest Cover,
Forest Type, Vegetation Change, Fragmentation, LULC, Forest Status, Cadastral Map, Tree Count,
Tree Species, Tree Height, Watershed, Wildlife Corridor, Habitat Suitability, Carbon Stock, plus
8 base/reference layers), and (c) a **continuous** temporal (year) dimension so ~40 years of
ecological data can be queried and rendered without one row per feature per year colliding with
performance. This is the foundation spec — the backend and frontend specs both depend on the
shapes defined here.

## User Scenarios & Testing

### Scenario 1 — Anonymous read of public layers
An unauthenticated caller queries layers and receives only rows whose permission chain includes
the anonymous/public role, with no code path capable of returning a restricted layer to that
caller regardless of query parameters supplied.

**Acceptance**: A repository-level query executed with the anonymous role returns exactly the
public layer set; the same query with `admin` returns the full set; no test requires touching
application code to add or remove a layer from either result — only seed/migration data.

### Scenario 2 — Admin adds a new role without a deploy
An admin inserts a new row into `roles` and corresponding `role_layer_permissions` rows. On the
next request, a user with that role sees exactly the layers granted, with zero code changes.

**Acceptance**: Verified via the repository integration test suite, not manual code inspection.

### Scenario 3 — Querying a layer at a specific year
A caller requests a time-enabled layer (e.g. forest density) for year 2005. The query returns
only that year's geometries/attributes, not a blended or most-recent-year fallback, and returns
an explicit "no data for this year" result (not an error) if 2005 has no assessment.

**Acceptance**: Repository test asserts empty-but-successful result for an off-year query.

### Scenario 4 — Layer styling is data, not code
A layer's line/fill colour and opacity are read from the `layers` table (or its year-scoped
equivalent), never matched by name in application code.

**Acceptance**: `color` and `fill_opacity` (or year-scoped equivalents) are present in every
query result feature's properties.

### Edge Cases
- A layer exists but has zero permission rows (not even for `admin`) — must not error, must
  return empty, and should be flagge-able as a data-hygiene issue (out of scope to auto-detect
  in v1, but must not crash).
- A year filter outside any layer's data range returns empty, not the nearest year.
- A role is deleted while users still hold a JWT referencing it — token validation must reject
  gracefully (role no longer resolves to any permissions), not throw a 500.

## Requirements

- **FR-001**: The system MUST represent an anonymous/public caller as a real row-backed role
  (not an application-level special case), so `role_layer_permissions` governs its access exactly
  like any other role.
- **FR-002**: The system MUST NOT hardcode any role name, layer name, or year value in a query,
  migration guard, or application-level conditional; all such values are data.
- **FR-003**: The system MUST support querying layer geometries scoped to a caller's role AND
  (where applicable) a specific year or year range, in a single repository call.
- **FR-004**: The system MUST store per-layer styling (colour, fill opacity) as queryable columns
  or a year-scoped equivalent, not derivable only in application code.
- **FR-005**: The system MUST version time-enabled layer data by year/date such that a later
  correction to one year's data does not silently overwrite or become indistinguishable from a
  prior year's published record. *(Exact mechanism — append-only snapshot vs. update-with-audit —
  is an implementation choice now, not a blocked Open Item; the year column itself is a real
  date/year type supporting arbitrary values, per FR-005a.)*
- **FR-005a**: The year/date column MUST support **continuous** values (any year in range), not an
  enum of discrete assessment years — resolved per FRD §11 item 2. Years without data return an
  explicit empty result (Scenario 3), never a nearest-year fallback or an enum constraint error.
- **FR-006**: The system MUST support the real Shetrunjay Hills role set (3 roles: `public`,
  `regular_user`, `admin`) and the 14-theme layer catalog + base/reference layers (FRD §6.8)
  replacing the Ahmedabad mock data as seed/migration rows, without altering table shapes
  established for the mock data where those shapes already generalize (e.g. `roles`,
  `role_layer_permissions`).
- **FR-007**: Migrations MUST be additive and reversible where practical (up/down), consistent
  with treating schema evolution as a first-class, reviewable artifact.
- **FR-008**: The system SHOULD support geometry delivery suitable for tiling (`ST_AsMVT`) as an
  alternative to full `ST_AsGeoJSON` responses for high-volume layers, without requiring a second,
  parallel schema — see Backend spec (002) for the endpoint that consumes this.
- **FR-009**: Each theme's per-filter behaviour (year, satellite/drone source, village, zone/grid,
  fauna selection) MUST be representable as rows/columns, not per-theme code branches — e.g. a
  `themes` table with a `filter_config` (JSONB) column describing which filters apply, rather than
  a switch statement keyed on theme name (Principle I).
- **FR-010**: Each theme MUST support a queryable **statistics** result (area/zone/grid-wise, per
  FRD §6.8's Outputs column) — either precomputed rows refreshed on data load, or a view/query
  computed on demand; either satisfies this requirement, choice is an implementation decision.

## Key Entities

- **Role** — id, name (`public` | `regular_user` | `admin`), is_public/anonymous marker,
  description. Final, closed set of 3 for v1 (still data rows, not an enum in code).
- **User** — id, username, password hash, role_id.
- **Theme** — id, name (one of the 14, FRD §6.8), filter_config (JSONB — which of Year/
  Satellite/Village/Zone/Grid/Fauna apply), data_format (raster | vector | point | mixed).
- **Layer** — id, name, theme_id (nullable for base/reference layers), geometry_type, color,
  fill_opacity, description, category (for panel grouping per design system §2).
- **RoleLayerPermission** — role_id, layer_id (join; existing pattern, unchanged shape).
- **LayerFeature / LayerSnapshot** — geometry, properties (JSONB), year (real date/year type,
  continuous — FR-005a), layer_id. The temporal entity; per-theme storage strategy (raster tile
  reference vs. vector rows vs. point rows) varies by `Theme.data_format`.
- **ThemeStatistic** — theme_id, year, zone/grid/village scope (nullable), computed stat payload
  (JSONB) — backs FR-010's per-theme statistics output.

## Non-Goals (this spec)
- The specific raster storage/serving mechanism (tile server, `ST_AsMVT` vs. a dedicated raster
  pipeline) for raster-format themes — schema only needs a reference/pointer column; the serving
  mechanism is a Backend spec (002) / infra decision.
- Building the admin UI that writes these rows — this spec only requires that the rows are
  writable via migration/seed/SQL; Backend spec (002) covers the authenticated write API (now
  confirmed in scope — FRD FR-7.2).

## Open Items — resolved (FRD v0.2 §11)
1. ~~**Data shape**~~ — resolved: mixed raster/vector/point, varies per theme (`Theme.data_format`,
   FRD §6.8).
2. ~~**Year coverage**~~ — resolved: continuous (FR-005a).
3. ~~**Final role list**~~ — resolved: `public`, `regular_user`, `admin` (3 total).

No open items remain for this spec's schema design; proceed to `plan.md` Phase 1.
