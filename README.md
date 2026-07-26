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

## Running the app

```
docker compose up --build
```

This starts `postgis` (host port `5433`), `api` (`http://localhost:8080`), and `web`
(`http://localhost:3000`). Once all three are up, open `http://localhost:3000` and log in with
one of the mock users below.

**Mock credentials** (password `password123` for all three):

| Username        | Role            | Sees layers                              |
|-----------------|-----------------|-------------------------------------------|
| `regular_user`  | `regular_user`  | `city_border`, `roads`                     |
| `admin_user`    | `admin`         | `city_border`, `roads`, `metro_train`      |
| `support_user`  | `support_team`  | `city_border`, `roads`, `metro_train`      |

To run the API's Go test suite, including the RBAC repository integration test, against the
running `db` container:

```
cd apps/api
DATABASE_URL=postgres://shetrunjay:shetrunjay@localhost:5433/shetrunjay go test ./...
```

### API environment

| Variable       | Required | Default (when unset)                    |
|----------------|----------|-----------------------------------------|
| `DATABASE_URL` | no       | `postgres://…@localhost:5433/shetrunjay` |
| `JWT_SECRET`   | **yes**  | none — the API exits if it's not set     |
| `CORS_ORIGIN`  | no       | `http://localhost:3000`                  |
| `PORT`         | no       | `8080`                                   |

`JWT_SECRET` has no built-in fallback on purpose: a default would mean any deployment that forgot
to set it accepted tokens forged with a secret published in this repo. Compose supplies a
local-only value so `docker compose up` stays a single command — override both it and `CORS_ORIGIN`
from the shell or a root `.env` for anything that isn't your laptop:

```
JWT_SECRET=$(openssl rand -hex 32) CORS_ORIGIN=https://your.host docker compose up --build
```

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

## Implementation Notes

Gotchas and non-obvious decisions worth knowing before touching the corresponding area.

**Backend**

- Layer geometries leave the DB as GeoJSON via `ST_AsGeoJSON`; the RBAC join in
  `internal/repository` filters `layers` by `role_layer_permissions` for the caller's role.
- CORS is hand-rolled in `apps/api/internal/handlers/middleware.go` for the
  `http://localhost:3000` origin rather than pulling in a CORS package.

**Frontend**

- `maplibre-gl` is pinned to `^5.24.0` — **do not upgrade to 6.x**. `6.0.0` (its first stable
  release) never fires the map's `load`/`isStyleLoaded` state under Next.js/Turbopack bundling
  (confirmed via a raw unbundled ESM reproduction outside Next.js, where 6.0.0 also hangs but
  5.24.0 renders correctly), so nothing paints even though data reaches the source.
- Geometries returned by `/api/layers` are split client-side by `feature.geometry.type` into two
  GeoJSON sources (polygons, lines) rather than using MapLibre filter expressions —
  `["==", ["geometry-type"], "Polygon"]` filters silently matched nothing.
- The map view fits to the data's bounds (computed client-side) rather than a hardcoded
  center/zoom.

**Docker**

- `apps/web/Dockerfile` builds with the repo root as context (pnpm workspace) and uses Next's
  `output: "standalone"` for a lean runtime image.
- `NEXT_PUBLIC_API_URL` is passed as a build `ARG`/`ENV`, not a runtime env var — Next.js inlines
  `NEXT_PUBLIC_*` vars into the client bundle at build time. It's set to
  `http://localhost:8080` (not an internal service DNS name) because the *browser*, running on
  the host, calls the API directly via its published port — same reasoning as the hardcoded CORS
  origin above. Only `api → db` uses container-internal DNS (`db:5432`).

## Future Enhancements (out of scope for now)

- Real PMTiles basemap (protocol handler + hosted `.pmtiles` file) under the GeoJSON layers
- Real ecological/historical data replacing the Ahmedabad mock geometries
