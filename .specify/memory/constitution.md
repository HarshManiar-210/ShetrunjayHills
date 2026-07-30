<!--
Sync Impact Report
- Version: (none) → 1.1.0
- Rationale: initial ratification of the constitution, derived directly from the project's
  existing CLAUDE.md rules so specs/001-003 (which cite Principles I-VII) have a real backing
  document. Bumped straight to 1.1.0 rather than 1.0.0 because SPECS_README.md (30 July 2026)
  already describes this constitution at v1.1.0, incorporating the client's Dashboard_workflow.docx
  14-theme layer catalog and dashboard mockup into Principle IV's Design System Fidelity guidance.
- Principles added: I. Data-Driven Configuration, II. Repository Pattern,
  III. Server-Side Authorization, IV. Design System Fidelity, V. Positional Accuracy,
  VI. Verification Across States, VII. Scope Discipline
- Templates requiring follow-up: specs/001-database-rbac-temporal/*, specs/002-backend-api/*,
  specs/003-frontend-web-dashboard/* already reference these principles by name/number — no
  renumbering needed. No other .specify templates exist yet in this repo.
- Deferred: this document does not itself resolve the FRD.md/Project_Document.md gap noted in
  SPECS_README.md — those source documents are referenced by the specs but are not present in
  this repository as of this writing.
-->

# Shetrunjay Hills Constitution

## Core Mission

Shetrunjay Hills is a Web GIS dashboard presenting ecological and historical layer data over
Shetrunjay Hills, gated by database-driven role-based access control. Every principle below
exists to protect one property: **who can see what, and what a layer looks like, is data — never
a code path.**

## Principles

### I. Data-Driven Configuration

Roles, layers, themes, permissions, and their styling are rows in Postgres, not identifiers in
Go or TypeScript source. Adding or changing a role, layer, or theme MUST be achievable as a
migration/seed insert alone. Any handler, repository query, or component that special-cases a
role name, layer name, or theme name by string literal is a bug, not a shortcut — this includes
`switch`/`match` statements keyed on those names in either `apps/api` or `apps/web`.

### II. Repository Pattern

All database access in `apps/api` goes through `internal/repository`; handlers never issue raw
SQL. Handlers depend on a small interface naming only the repository methods they use (e.g.
`layersGetter`, `userGetter`), not the concrete `*repository.Repository` type, so `go test` can
fake the DB layer without a live connection. New handlers extend this pattern rather than
introducing a parallel data-access style.

### III. Server-Side Authorization

Access decisions are made once, server-side — the auth middleware validates the JWT and injects
`role_id`/`role_name` into request context; handlers and repository queries read the role from
there and let `role_layer_permissions` govern the result set. The frontend's job is to render
what the API returns; it MUST NOT re-implement or duplicate an access decision (e.g. fetching a
restricted layer "just in case" and hiding it client-side is a violation, not a defense-in-depth
measure).

### IV. Design System Fidelity

`apps/web` visual work follows `DESIGN.md` (tagged `[now]`/`[next]`/`[later]` per that document's
own convention — nothing is built ahead of its tag). Where a client-supplied mockup and the
written design system diverge, the mockup is authoritative until the document is updated to
match, and updating the document is part of the same unit of work rather than left stale (v1.1.0
note, informed by the 14-theme layer catalog and dashboard mockup incorporated 30 July 2026). Only
add a shadcn/ui component when a page actually uses it. All pages and components MUST render
correctly across mobile, tablet, and desktop viewports (responsive Tailwind utilities, not fixed
pixel widths or desktop-only layouts); purely decorative panels may hide on small viewports, but
functional content must stay usable at every width.

### V. Positional Accuracy

Layer geometry leaves the database as GeoJSON via `ST_AsGeoJSON` (or, where a spec explicitly
adds tiling, `ST_AsMVT` as an additional delivery format alongside it, never a replacement for
full-precision output). Geometry serialization is never hand-rolled in application code, and no
schema or endpoint change may silently trade positional accuracy for convenience.

### VI. Verification Across States

A change to the layers API or auth path is not done until it has been manually verified (curl or
browser) as more than one role — including the anonymous/public caller where applicable — because
permissions are supposed to vary by row, not by code path. A change that only works for one role,
or that only exercises the authenticated happy path, is incomplete. Automated test suites for
this area should mirror the same spread of states (anonymous, expired-token, each real role).

### VII. Scope Discipline

Build what the current spec requires, not what might be needed later. PMTiles basemaps and real
ecological/historical data are explicitly out of scope unless a spec brings them into scope by
name (see each spec's own Non-Goals section, and README's Future Enhancements). Features,
abstractions, error handling, and fallbacks are added for scenarios that can actually occur, not
speculative future requirements — three similar lines beat a premature abstraction, and a
gated/deferred item stays deferred until its stated trigger is hit, not built ahead of need.

## Engineering Constraints

- CORS is hand-rolled in `internal/handlers/middleware.go`; do not reach for a CORS dependency
  unless requirements outgrow a few header lines.
- Schema changes (roles, layers, permissions) are migration/seed rows in `infra/postgis-init` (or
  `infra/migrations`, once introduced), never conditionals in application code.
- Frontend API calls always send the Bearer token from `localStorage`; no token routes to
  `/login`.
- MapLibre GL JS is client-only (`next/dynamic({ ssr: false })`) — never imported in a server
  component.

## Governance

This constitution supersedes ad-hoc practice for anything it explicitly addresses; where it is
silent, `CLAUDE.md` and `RULES.md` govern. Amendments land as a change to this file with a version
bump (MAJOR: a principle is removed or redefined incompatibly; MINOR: a principle or material
section is added; PATCH: wording/clarification with no behavioral change) and a Sync Impact Report
comment at the top of the diff. Every `specs/*/plan.md`'s "Constitution Check" section is the
enforcement point — a plan that cannot show compliance, or an explicit, justified deviation under
Complexity Tracking, does not proceed to task breakdown.

**Version**: 1.1.0 | **Ratified**: 2026-07-30 | **Last Amended**: 2026-07-30
