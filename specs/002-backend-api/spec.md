# Feature Specification: Backend API — Public Access, Filtering & Tiled Delivery

**Feature branch**: `002-backend-api`
**Status**: Draft — depends on `001-database-rbac-temporal`. Admin write API, export formats, and
search are now confirmed in scope (FRD v0.2 §11) — Open Items 2–3 below resolved.
**Input**: FRD.md v0.2 §6.1–§6.8, §7 (NFR-2, NFR-7); Project_Document.md v0.2 §5

## Overview

The Go API currently assumes every request carries a valid bearer token and returns full
GeoJSON for the three small mock layers in one response. This spec covers the API-layer changes
needed to (a) serve public/anonymous callers without a token, with server-side enforcement of
what they may see, (b) support layer/year/attribute filtering, and (c) move high-volume layer
delivery from full-GeoJSON to a tiled or paginated strategy so the ~40-year dataset doesn't
regress the API into the "1 MB+ response" territory the design system already flags as a trigger.

## User Scenarios & Testing

### Scenario 1 — Anonymous request succeeds
A request to `GET /api/layers` with no `Authorization` header succeeds (200), returning the
public layer set, rather than the current behavior a caller assuming "no token → reject" would
expect.

**Acceptance**: Contract test — no-token request returns 200 and only public layers, never 401.

### Scenario 2 — Token expiry degrades, doesn't break
A request with an expired/invalid token is treated as anonymous (falls back to public layers),
not rejected outright, matching FR-1.5 in the FRD ("session/token expiry degrades gracefully to
public view").

**Acceptance**: Contract test — expired token behaves identically to no token for read endpoints.

### Scenario 3 — Role-scoped and year-scoped query compose
An authenticated `support_team` request for a time-enabled layer with `?year=2010` returns only
that role's permitted layers, filtered to 2010's data, in one round trip.

**Acceptance**: Contract test combining both dimensions in a single request.

### Scenario 4 — Large layer served as tiles, not one blob
A high-volume layer's geometry is requested through a tile endpoint (`/api/tiles/{layer}/{z}/{x}/{y}`)
rather than the full-collection endpoint once that layer crosses the size trigger, and the
full-collection endpoint still exists for small layers (backward compatible with the current
three mock layers).

**Acceptance**: Load test / response-size assertion; MapLibre source config differs by layer size
class, which the API communicates via a `delivery: "geojson" | "mvt"` field on the layer's
metadata endpoint (data-driven, not a frontend-hardcoded list — Constitution Principle I).

### Edge Cases
- A layer has `delivery: "mvt"` but no MVT function/index exists yet — the endpoint must fail
  loudly in dev/test (500 with a clear message), not silently serve an empty tile.
- A filter combination (role + year + bbox) matches zero features — 200 with an empty
  FeatureCollection, not 404.
- Export endpoint (Scenario not detailed here — see Requirements FR-006) must apply the same
  role filtering as the read endpoints; there is no separate, laxer export code path.

## Requirements

- **FR-001**: The auth middleware MUST resolve a missing or invalid token to the anonymous role
  rather than rejecting the request, for all read endpoints that have a public-accessible subset.
- **FR-002**: Every layer/feature read endpoint MUST filter results using the caller's resolved
  role via the repository layer from spec `001`; no handler may bypass this filter.
- **FR-003**: The API MUST support filtering layer/feature queries by year or year range via
  query parameters, delegating to the year-scoped repository methods from spec `001`.
- **FR-004**: The API MUST support filtering by layer/category via query parameters or distinct
  per-layer endpoints (design choice left to Phase 1; either satisfies the FRD's FR-3.1).
- **FR-005**: The API MUST expose enough layer metadata (id, name, category, color, fill_opacity,
  delivery mode, available years, geometry bounds/extent) for the frontend to build the layer
  panel, time control, and the "Zoom to Layer" action (Dashboard_workflow.docx's common function
  list, spec `001`) without hardcoding any of that information client-side.
- **FR-006**: Export endpoints (where authorized) MUST apply identical role-based filtering to
  read endpoints — an export is not a separate trust boundary.
- **FR-007**: The API SHOULD expose a tile endpoint (`ST_AsMVT`-backed) for layers whose data
  volume crosses the design system's stated ~1 MB trigger, alongside the existing full-GeoJSON
  endpoint for small layers.
- **FR-008**: **Resolved — in scope for v1.** Write endpoints for roles/layers/permissions/users
  (admin management) MUST exist, backing the confirmed Admin UI (FRD FR-7.2). These endpoints
  still only ever change data rows — no role/layer/theme name is ever hardcoded in the handler.
- **FR-009**: All endpoints MUST continue to satisfy the existing handler-testability pattern
  (Constitution Principle II) — new handlers depend on narrow repository interfaces, not the
  concrete repository type.
- **FR-010**: The API MUST expose per-theme filter options (`year`, `satellite`, `raster_toggle`/
  `vector_toggle`, `village`, `zone`/`grid`, `fauna`, `sub_theme` — see spec `001`'s 14-Theme
  Filter & Output Catalog for the exact per-theme mapping, e.g. Forest Status uses
  `raster_toggle`/`vector_toggle`, Cadastral Map uses `village`, Watershed uses `sub_theme`)
  driven by each theme's `filter_config` (spec `001` FR-009) — the handler reads which filters
  apply from data, never a per-theme `switch`/`if theme == "..."` branch.
- **FR-011**: The API MUST expose a per-theme statistics endpoint (spec `001`'s `theme_statistics`,
  FR-010) returning area/zone/grid-wise figures for the selected theme/year/scope.
- **FR-012**: **Resolved — export in PDF, Excel, and CSV** for authenticated/authorized roles
  (FRD FR-6.1, Open Item 5). GeoJSON/KML/Shapefile remain a possible later addition, not required
  for v1.
- **FR-013**: **Resolved — general search in scope.** The API MUST support a search endpoint
  covering both layer-attribute search (survey number, village name, feature ID) and free-text
  place/coordinate lookup (FRD FR-5.1/5.3), the latter via a geocoding provider (TBD — see Open
  Items).

## Key Entities (API-level DTOs, not DB tables)
- `LayerMetadata` — id, name, category, color, fill_opacity, delivery mode, available years/range,
  bounds (bbox, backs the "Zoom to Layer" common function — FR-005).
- `FeatureCollection` (GeoJSON) — existing shape, extended with per-feature `properties.color`
  where applicable.
- `Theme` — id, name, filter_config (JSONB per spec `001`'s catalog), data_format.
- `AuthContext` — resolved role, injected into request context by middleware (existing pattern,
  extended to include the anonymous case).

## Client-side-only functions (no new endpoint — noted for traceability to `Dashboard_workflow.docx`)
- **Layer Transparency**: per-layer opacity, applied client-side via MapLibre
  `setPaintProperty` (Frontend spec `003`) — no backend field beyond the existing `fill_opacity`
  default.
- **Identify Feature Tool**: satisfied by the existing feature-click flow — `FeatureCollection`
  properties already returned by the read endpoints are sufficient; no separate query endpoint.

## Non-Goals (this spec)
- The tiling *database* function itself (covered by spec `001`, FR-008 there).
- The frontend's consumption of `delivery: "mvt"` vs `"geojson"` (covered by spec `003`).
- Building a full admin UI (see Open Item 2).

## Open Items

### Resolved (FRD v0.2 §11)
- ~~**Admin write API**~~ — resolved: in scope for v1 (FR-008).
- ~~**Export formats**~~ — resolved: PDF, Excel, CSV (FR-012).
- ~~**Search**~~ — resolved: general place/coordinate + layer-attribute search, in scope (FR-013).

### Still open
1. **Tile endpoint necessity for v1**: does the initial real dataset actually cross the
   ~1 MB trigger, or can full-GeoJSON delivery ship first with tiling as a fast-follow? The
   14-theme catalog (FRD §6.8) makes this more likely than the original 3-mock-layer estimate, but
   actual per-theme data volume is still pending TGIS delivery.
2. **Geocoding provider**: which third-party place/coordinate search service to integrate for
   FR-013's free-text lookup (not currently in the stack) — cost, coverage of the Shetrunjay/
   Palitana area, and API key management need a decision.
3. **Rate limiting** on now-public endpoints: public endpoints were previously implicitly
   protected by requiring auth; going public may need basic rate limiting to prevent abuse
   (NFR-7) — confirm whether this is in scope for v1 or acceptable to defer to infra-level
   protection (e.g. a reverse proxy).
4. **Audit logging** (FRD Open Item 7, still open): if confirmed needed, this spec's write
   endpoints (FR-008) and restricted-layer reads both need an audit-log hook.
