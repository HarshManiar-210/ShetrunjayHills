# Shetrunjay Hills — Web GIS Dashboard

A monorepo GIS dashboard for Shetrunjay Hills: a Next.js/MapLibre frontend backed by a Go API,
serving map layers from PostGIS with database-driven role-based access control (RBAC).

No roles, layers, or permissions are hardcoded in the API or frontend — they're all rows in
Postgres, so adding a new role or layer is a data change, not a code change.

## Tech Stack

- **Frontend** (`apps/web`): Next.js 14+ (App Router), TypeScript (strict), Tailwind CSS,
  shadcn/ui. Node 24, pnpm.
- **Backend** (`apps/api`): Go, chi router, pgx.
- **GIS**: MapLibre GL JS (client-side only, via `next/dynamic({ ssr: false })`), PostGIS.
- **Infra**: Docker Compose (postgis + api + web).

## Folder Tree (target)

```
.
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── app/
│   │   │   ├── login/              # /login page
│   │   │   └── (dashboard)/map/    # map dashboard page
│   │   └── components/             # MapLibre map component, ui components
│   └── api/                        # Go backend
│       ├── cmd/api/                # entrypoint (main.go)
│       ├── internal/
│       │   ├── handlers/           # HTTP handlers (login, layers)
│       │   ├── repository/         # DB query layer
│       │   ├── models/             # structs (User, Role, Layer, Permission)
│       │   └── db/                 # pgx pool setup
│       └── go.mod
├── infra/
│   └── postgis-init/
│       └── init.sql                # schema + RBAC + mock data
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

## Mock RBAC Model

- **Roles**: `regular_user`, `admin`, `support_team` — one mock user each.
- **Layers**: `city_border` (Polygon), `roads` (LineString), `metro_train` (LineString) — mock
  geometries around Ahmedabad.
- **Permissions**: `regular_user` → `city_border` + `roads`. `admin` and `support_team` → all
  three.

## Phases

Each phase is checked off once implemented and verified. Files listed are the primary ones each
phase touches.

### Phase 0 — Repo scaffolding & tooling

_Files: `pnpm-workspace.yaml`, root `package.json`, `.editorconfig`, `.nvmrc`, `.gitignore`_

- [x] `pnpm-workspace.yaml` listing `apps/*`
- [x] Root `package.json` with workspace-level `dev` script
- [x] Create `apps/web`, `apps/api`, `infra/postgis-init` directories
- [x] `.editorconfig` + `.nvmrc` pinning Node 24
- [x] Extend `.gitignore` with Go-specific entries (binaries, `apps/api/tmp`)
- [x] Single Go module at `apps/api/go.mod`
      (`github.com/HarshManiar-210/ShetrunjayHills/apps/api`, `go 1.26`)

### Phase 1 — Database layer

_Files: `infra/postgis-init/init.sql`, `docker-compose.yml` (db service only)_

- [x] `init.sql`: `CREATE EXTENSION postgis`, tables `roles`, `users`, `layers` (geometry column),
      `role_layer_permissions`
- [x] Seed 3 roles, 3 users (bcrypt-hashed passwords), 3 Ahmedabad geometries, permission rows
- [x] Standalone `docker-compose.yml` with just the `postgis` service to validate the init script
      (host port `5433` — a local Postgres 17 already held `5432`; containers added in Phase 8
      still reach it at `db:5432`)

Verified against a real container: schema matches, `ST_GeometryType`/`ST_IsValid` pass for all 3
layers, `ST_AsGeoJSON` output is correct, RBAC join returns `regular_user`→2 layers,
`admin`/`support_team`→3, and data survives a container restart.

**Mock credentials** (password `password123` for all three):

| Username        | Role            |
|-----------------|-----------------|
| `regular_user`  | `regular_user`  |
| `admin_user`    | `admin`         |
| `support_user`  | `support_team`  |

### Phase 2 — Go backend core

_Files: `apps/api/cmd/api/main.go`, `apps/api/internal/db`, `apps/api/internal/models`,
`apps/api/internal/repository`_

- [x] `cmd/api/main.go`: config from env, pgx pool, chi router, graceful shutdown
- [x] `internal/db`: pgx pool helper
- [x] `internal/models`: `User`, `Role`, `Layer`, `Permission` structs
- [x] `internal/repository`: base query layer
- [x] `GET /healthz`

Verified against the real `db` container from Phase 1: `go build`/`go vet`/`go test` pass, and the
running binary's `/healthz` returns `200` once the pgx pool can ping Postgres.

### Phase 3 — Auth

_Files: `apps/api/internal/handlers/login.go`, `apps/api/internal/repository`,
`apps/api/internal/handlers/middleware.go`_

- [x] `GetUserByUsername` repository query
- [x] `POST /api/login`: bcrypt password compare, issue signed JWT (`role_id`, `role_name`)
- [x] Auth middleware: validate JWT, inject role into request context

Verified against the real `db` container: `go test ./...` passes (login and middleware table-driven
tests), and curling `/api/login` as `regular_user`/`admin_user`/`support_user` returns a JWT whose
decoded claims carry the correct `role_id`/`role_name` per user; wrong password and unknown
username both return `401`.

### Phase 4 — Layers API

_Files: `apps/api/internal/repository/layers.go`, `apps/api/internal/handlers/layers.go`_

- [ ] Repository query joining `layers` + `role_layer_permissions` by role, using `ST_AsGeoJSON`
- [ ] `GET /api/layers`: build GeoJSON `FeatureCollection` from authorized layers
- [ ] CORS middleware for the Next.js dev origin
- [ ] Manual verification: curl as each of the 3 users, confirm correct layer counts

### Phase 5 — Frontend scaffolding

_Files: `apps/web/` (create-next-app output), `apps/web/.env.local.example`_

- [ ] `create-next-app` in `apps/web` (App Router, TS strict, Tailwind)
- [ ] `shadcn` init + only the components needed (button, input, card, form)
- [ ] Base layout, root page, `.env.local.example` with `NEXT_PUBLIC_API_URL`

### Phase 6 — Auth UI

_Files: `apps/web/app/login/page.tsx`_

- [ ] `/login` page with 3 buttons ("Log in as regular_user / admin / support_team")
- [ ] POST to `/api/login`, store JWT in `localStorage`
- [ ] Redirect to `/login` when no token present

### Phase 7 — Map dashboard

_Files: `apps/web/components/Map.tsx`, `apps/web/app/(dashboard)/map/page.tsx`_

- [ ] MapLibre component loaded via `next/dynamic({ ssr: false })`
- [ ] Fetch `/api/layers` with Bearer token
- [ ] Render each geometry type as a MapLibre GeoJSON source/layer (blank canvas, no basemap tiles
      yet — see Future Enhancements)

### Phase 8 — Docker Compose integration

_Files: `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`_

- [ ] Full `docker-compose.yml`: `postgis`, `api`, `web` services
- [ ] Dockerfiles for api (multi-stage Go build) and web (Next.js build)
- [ ] Wire env vars / service DNS (api ↔ db, browser ↔ api)
- [ ] End-to-end smoke test: `docker compose up`, log in as each user, confirm correct layers render

### Phase 9 — Polish/docs

_Files: `README.md`_

- [ ] Run instructions (`docker compose up`) + mock credentials table
- [ ] Basic error/loading states on frontend fetches
- [ ] Optional: one Go test for the RBAC repository query

## Future Enhancements (out of scope for now)

- Real PMTiles basemap (protocol handler + hosted `.pmtiles` file) under the GeoJSON layers
- Real ecological/historical data replacing the Ahmedabad mock geometries
