# Implementation Plan: Backend API — Public Access, Filtering & Tiled Delivery

**Spec**: `spec.md` (this directory) | **Constitution**: `/.specify/memory/constitution.md`
**Depends on**: `001-database-rbac-temporal` (repository methods, anonymous role, temporal schema)

## Technical Context

- **Language**: Go, `chi` router, `pgx`.
- **Structure**: `apps/api/cmd/api` (entrypoint), `internal/handlers`, `internal/repository`,
  `internal/models`, `internal/db` — existing layout, unchanged.
- **Testing**: `go test ./...`, handler tests via fake repository interfaces (existing pattern),
  repository integration tests against a live `DATABASE_URL` (spec `001`'s test suite, extended).
- **Auth**: JWT (`role_id`/`role_name` claims), `JWT_SECRET` required with no default (unchanged).

## Constitution Check

| Principle | Compliance approach |
|---|---|
| II. Repository Pattern | New handlers (year filter, tile endpoint, layer metadata) depend on narrow interfaces extending spec `001`'s repository methods — no raw SQL added to `internal/handlers`. |
| III. Server-Side Authorization | FR-001/FR-002 make the anonymous-fallback + role-filter behavior the middleware's job, not each handler's — one place to get right, verified once. |
| VI. Verification Across States | Test plan explicitly includes anonymous, expired-token, and each real role — not just the "happy path" authenticated case. |
| VII. Scope Discipline | Tile endpoint (FR-007) remains a SHOULD, gated on Open Item 1 (actual data volume) — this plan does not build it speculatively ahead of confirmed need. Admin write API, export, and search (previously conditional) are now confirmed scope (FRD v0.2), so they move from "if" to planned work below — that's a resolved product decision, not scope creep. |

No deviations requiring Complexity Tracking.

## Project Structure

```
apps/api/
├── internal/
│   ├── handlers/
│   │   ├── middleware.go        # MODIFY — anonymous fallback (FR-001)
│   │   ├── layers.go            # MODIFY — year/category filters, metadata endpoint (FR-003–005)
│   │   ├── themes.go            # NEW — per-theme filter_config + statistics (FR-010–011)
│   │   ├── tiles.go             # NEW (conditional on Open Item 1) — MVT endpoint (FR-007)
│   │   ├── export.go            # NEW/MODIFY — role-filtered export, PDF/Excel/CSV (FR-012)
│   │   ├── search.go            # NEW — attribute + place/coordinate search (FR-013)
│   │   └── admin.go             # NEW — roles/layers/permissions/users write API (FR-008)
│   ├── repository/
│   │   ├── layers.go            # EXTEND — consumes spec 001's year-scoped methods
│   │   └── themes.go            # NEW — consumes spec 001's themes/theme_statistics tables
│   └── models/
│       ├── layer.go             # EXTEND — LayerMetadata DTO (delivery mode, available years)
│       └── theme.go             # NEW — Theme DTO (filter_config, data_format)
```

## Phase 0 — Research
- Confirm with spec `001` whether the repository methods it delivers (`GetLayersForRole`,
  year-scoped variants, theme/stat queries) match the query shapes this spec's handlers need;
  adjust either side's interface before Phase 2 starts, not after.
- Resolve remaining Open Item (tile endpoint necessity) before committing engineering time to
  `tiles.go` — the admin/export/search decisions no longer block Phase 0 (resolved FRD v0.2).
- Pick a geocoding provider for `search.go`'s free-text lookup (Open Item 2, still pending).

## Phase 1 — Contracts

Representative endpoint contracts (finalized signatures land in `contracts/` once Phase 0
closes):

```
GET  /api/layers                  → LayerMetadata[]  (role-filtered, no year dimension)
GET  /api/layers/{id}/features    → FeatureCollection (role- and year-filtered via ?year=)
GET  /api/themes                  → Theme[]          (id, name, filter_config, data_format)
GET  /api/themes/{id}/statistics  → ThemeStatistic    (year/scope-filtered via query params)
GET  /api/tiles/{id}/{z}/{x}/{y}  → MVT binary        (conditional — Open Item 1)
GET  /api/layers/{id}/export      → file (pdf|xlsx|csv, role-filtered — FR-012)
GET  /api/search?q=               → SearchResult[]    (attribute + place/coordinate — FR-013)
POST /api/auth/login              → existing, unchanged
GET|POST|PATCH|DELETE /api/admin/{roles|layers|permissions|users} → admin write API (FR-008)
```

- Auth middleware change: replace "no token → 401" with "no/invalid token → role = anonymous" for
  every route registered as publicly-reachable; routes not intended to ever be public (if any)
  remain explicitly gated — this is a routing-table decision, not a blanket global change, so a
  genuinely private-only endpoint doesn't accidentally become public.

## Phase 1 — Design Outputs
- `contracts/openapi.yaml` (or equivalent) — full endpoint list with request/response shapes.
- `quickstart.md` — curl examples for anonymous, expired-token, and each role, mirroring the
  Constitution's Principle VI verification requirement so it's copy-pasteable during review.

## Complexity Tracking

None.
