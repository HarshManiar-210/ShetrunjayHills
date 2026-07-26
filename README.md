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

- [x] Repository query joining `layers` + `role_layer_permissions` by role, using `ST_AsGeoJSON`
- [x] `GET /api/layers`: build GeoJSON `FeatureCollection` from authorized layers
- [x] CORS middleware for the Next.js dev origin
- [x] Manual verification: curl as each of the 3 users, confirm correct layer counts

Verified against the real `db` container: `go build`/`go vet`/`go test` pass, and curling
`/api/layers` (behind the `Auth` middleware, same JWTs as Phase 3) as each mock user returns the
right `FeatureCollection` size — `regular_user`→2 features (`city_border`, `roads`),
`admin_user`/`support_user`→3 (adds `metro_train`). No-token requests return `401`; an `OPTIONS`
preflight from the `http://localhost:3000` origin returns `204` with the CORS headers set.

### Phase 5 — Frontend scaffolding

_Files: `apps/web/` (create-next-app output), `apps/web/.env.local.example`_

- [x] `create-next-app` in `apps/web` (App Router, TS strict, Tailwind)
- [x] `shadcn` init + only the components needed (button, input, card, dialog, label)
- [x] Base layout, root page, `.env.local.example` with `NEXT_PUBLIC_API_URL`

Verified: `pnpm build` and `pnpm lint` pass from the repo root (workspace-filtered to `web`).
`shadcn`'s `form` component pulls in react-hook-form/zod, which the login page below doesn't
need, so it was skipped in favor of plain controlled inputs; `dialog` and `label` were added
instead to support the login page.

### Phase 6 — Auth UI

_Files: `apps/web/app/login/page.tsx`_

- [x] `/login` page: email/password form (superseding the original "3 quick-login buttons" spec
      per explicit request), with a "Forgot Password?" link opening a modal pointing to support
- [x] POST to `/api/login`, store JWT in `localStorage`
- [x] Redirect to `/login` when no token present (root page checks `localStorage` and redirects)

Verified: curled `/api/login` as `regular_user`/`admin_user`/`support_user` (password
`password123` for all three per `infra/postgis-init/init.sql`) — each returns a valid JWT.
Drove the actual `/login` page with Playwright against the running dev server: submitting
`admin_user`/`password123` stores the token in `localStorage` and redirects to `/`; screenshotted
the page at desktop (1280px) and mobile (390px) widths and in both light/dark
`prefers-color-scheme` to confirm the split-panel layout collapses correctly on small screens and
themes render correctly; the "Forgot Password?" modal shows the support contact.

### Phase 6.1 — UI improvements

_Files: `apps/web/app/page.tsx`, `apps/web/app/login/page.tsx`, `apps/web/components/theme-toggle.tsx`,
`apps/web/lib/auth.ts`, `apps/web/app/globals.css`_

- [x] Settings dialog on the authenticated page showing the logged-in username + role (decoded from
      the JWT), with a Logout button that clears the token and redirects to `/login`
- [x] Manual light/dark theme toggle button, persisted in `localStorage`, defaulting to OS
      preference on first visit
- [x] Login screen validation: field relabeled to "Username" (the backend has no real email
      addresses, only usernames like `regular_user`), rejects empty/whitespace-only submissions
      with an inline error before hitting the API

Verified with Playwright against the running dev server: submitting whitespace-only
username/password shows the inline "Username and password are required." error without hitting
the API; logging in as `admin_user`, clicking the theme toggle flips the `dark` class on `<html>`
and persists `theme=dark` to `localStorage`; opening Settings shows "Logged in as admin_user
(admin)"; clicking Log out clears the token and redirects to `/login`. No console errors in any
case. `pnpm build`/`pnpm lint` pass.

### Phase 7 — Map dashboard

_Files: `apps/web/components/Map.tsx`, `apps/web/app/(dashboard)/map/page.tsx`_

- [x] MapLibre component loaded via `next/dynamic({ ssr: false })`
- [x] Fetch `/api/layers` with Bearer token
- [x] Render each geometry type as a MapLibre GeoJSON source/layer (blank canvas, no basemap tiles
      yet — see Future Enhancements)

`/map` lives in a new `apps/web/app/(dashboard)/` route group (`layout.tsx` carries the header —
theme toggle, Settings/Logout — moved out of the old root page; `apps/web/app/page.tsx` is now a
thin redirect to `/map` or `/login` based on token presence). Geometries are split client-side by
`feature.geometry.type` into two GeoJSON sources (polygons, lines) rather than using MapLibre
filter expressions — `["==", ["geometry-type"], "Polygon"]` filters silently matched nothing.
`maplibre-gl` is pinned to `^5.24.0`; **do not upgrade to 6.x** — `6.0.0` (its first stable
release) never fires the map's `load`/`isStyleLoaded` state under Next.js/Turbopack bundling
(confirmed via a raw unbundled ESM reproduction outside Next.js, where 6.0.0 also hangs but 5.24.0
renders correctly), so nothing paints even though data reaches the source. The map view fits to
the data's bounds (computed client-side) rather than a hardcoded center/zoom.

Verified: `pnpm build`/`pnpm lint` pass. Playwright against a running dev server and again against
a production `next build`/`next start` — logged in as each of the 3 mock users and confirmed the
canvas renders the correct feature count per role (`regular_user` → polygon + 1 line,
`admin_user`/`support_user` → polygon + 2 lines), no console errors.

### Phase 8 — Docker Compose integration

_Files: `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`_

- [x] Full `docker-compose.yml`: `postgis`, `api`, `web` services
- [x] Dockerfiles for api (multi-stage Go build) and web (Next.js build)
- [x] Wire env vars / service DNS (api ↔ db, browser ↔ api)
- [x] End-to-end smoke test: `docker compose up`, log in as each user, confirm correct layers render

`apps/web/Dockerfile` builds with the repo root as context (pnpm workspace) and uses Next's
`output: "standalone"` (set in `next.config.ts`) for a lean runtime image. `NEXT_PUBLIC_API_URL`
is passed as a build `ARG`/`ENV` — Next.js inlines `NEXT_PUBLIC_*` vars into the client bundle at
build time, so it can't be a plain runtime env var. It's set to `http://localhost:8080`, not an
internal service DNS name, because the *browser* (running on the host) calls the api directly via
its published port — same reasoning as the existing hardcoded CORS origin
(`http://localhost:3000`) in `apps/api/internal/handlers/middleware.go`, which needed no changes.
Only `api → db` uses container-internal DNS (`db:5432`).

Verified against the real stack: `docker compose up --build -d` builds and starts all 3
containers; `/healthz` and `/login` return `200` on their published ports; curled `/api/login` as
each of the 3 mock users; drove the actual dockerized `/map` page with Playwright logged in as
each user and confirmed the correct per-role feature count renders with no console errors;
`docker compose logs` clean for both `api` and `web`.

### Phase 9 — Polish/docs

_Files: `README.md`_

- [ ] Run instructions (`docker compose up`) + mock credentials table
- [ ] Basic error/loading states on frontend fetches
- [ ] Optional: one Go test for the RBAC repository query

## Future Enhancements (out of scope for now)

- Real PMTiles basemap (protocol handler + hosted `.pmtiles` file) under the GeoJSON layers
- Real ecological/historical data replacing the Ahmedabad mock geometries
