## Project Architecture

Shetrunjay Hills is a monorepo Web GIS dashboard: Next.js/MapLibre frontend, Go API, PostGIS
database, with database-driven role-based access control (RBAC).

- **`apps/web`** — Next.js 14+ (App Router), TypeScript strict, Tailwind CSS, shadcn/ui. Node 24,
  pnpm. MapLibre GL JS is client-only (`next/dynamic({ ssr: false })`) — never import it in a
  server component.
- **`apps/api`** — Go, chi router, pgx. Layout: `cmd/api` (entrypoint), `internal/handlers`,
  `internal/repository` (DB query layer), `internal/models`, `internal/db` (pgx pool).
- **`infra/postgis-init`** — `init.sql`: schema, RBAC tables (`roles`, `users`, `layers`,
  `role_layer_permissions`), seed data.
- **Infra** — Docker Compose wires `postgis` + `api` + `web`.

**Core invariant: no roles, layers, or permissions are hardcoded in API or frontend code.** They
are rows in Postgres — adding a role or layer must be a data change (a migration/seed insert), not
a code change. Any handler, query, or component that special-cases a role name or layer name by
string is a bug, not a shortcut.

## Coding Rules

- **Go (`apps/api`)**: all DB access goes through `internal/repository`, never raw SQL in
  handlers. Layer geometries leave the DB as GeoJSON via `ST_AsGeoJSON` — don't hand-roll
  geometry serialization. JWT carries `role_id`/`role_name`; auth middleware injects role into
  request context, handlers read it from there.
- **Handler testability**: handlers depend on a small interface naming only the repository
  methods they use (e.g. `userGetter`, `layersGetter`, `pinger`), not `*repository.Repository`
  directly — this lets `go test` fake the DB layer with no live connection. Mirror this pattern
  for new handlers rather than taking the concrete repository type.
- **CORS**: hand-rolled in `internal/handlers/middleware.go` (`CORS`) rather than a new
  dependency — a few header lines covered the Next.js dev origin; don't reach for a CORS package
  unless requirements outgrow that.
- **Frontend (`apps/web`)**: fetches to the API always send the Bearer token from
  `localStorage`; no token → redirect to `/login`. Only add shadcn components actually used by a
  page.
- **Schema changes**: role/layer/permission changes are seed or migration rows in
  `infra/postgis-init/init.sql`, not conditionals in Go or TypeScript.
- **Verification over trust**: after touching the layers API or auth, manually verify (curl or
  browser) as more than one mock role — a change that only works for one role is incomplete,
  since permissions are supposed to vary by row, not by code path.
- **Scope discipline**: PMTiles basemaps and real ecological/historical data are explicitly out
  of scope (see README Future Enhancements) — don't pull them in unless asked.

## Git Workflow & Autonomous Branching

You (Claude Code) must strictly adhere to the following Git workflow for every task you execute:

1. **Never commit to main:** Before writing or modifying any code, run `git status`. If you are on the `main` branch, you MUST immediately create and switch to a new branch.
2. **Branch naming convention:** Use the following prefixes based on the task type:
   - `feature/<kebab-case-name>` (for new endpoints, UI components, etc.)
   - `bugfix/<kebab-case-name>` (for fixing broken code)
   - `docs/<kebab-case-name>` (for updating README or standard documentation)
   - `chore/<kebab-case-name>` (for tooling, docker updates, or dependency bumps)
3. **Commit messages:** Use Conventional Commits format (e.g., `feat: add postgis init script`, `fix: resolve next.js dynamic import ssr bug`).
4. **Micro-commits:** Do not wait until the entire task is done to commit. Commit logically chunked milestones (e.g., commit the DB init script before moving on to the Go routing code).
