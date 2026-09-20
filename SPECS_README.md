# Shatrunjay Hills — Spec-Kit Files

This is a spec-kit-style (`.specify/` + `specs/`) breakdown of the Web GIS Dashboard, split by
app as requested: database, backend, frontend. Drop this into the root of the monorepo — it's
additive to the existing `README.md` and `CLAUDE.md`, and `constitution.md` was written to be
consistent with `CLAUDE.md`'s existing rules rather than replace them.

As of 30 July 2026, `FRD.md` and `Project_Document.md` are at v0.2 and `constitution.md` at
v1.1.0, incorporating the client's `Dashboard_workflow.docx` (14-theme layer catalog) and a
dashboard visual mockup. The specs below (`001`–`003`) still reflect the v0.1/1.0.0 state and
need updating to match — see each spec's own Open Items / Constitution Check section.

## Layout

```
.specify/
└── memory/
    └── constitution.md          # Project principles — read this first
specs/
├── 001-database-rbac-temporal/  # PostGIS schema: public access, real RBAC, 40-year time dimension
│   ├── spec.md                  # What & why (user scenarios, requirements, open items)
│   ├── plan.md                  # How (technical context, constitution check, structure)
│   └── tasks.md                 # Ordered, dependency-aware task checklist
├── 002-backend-api/             # Go API: anonymous fallback, filtering, tiled delivery
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
└── 003-frontend-web-dashboard/  # Next.js/MapLibre: public map, design system, time control
    ├── spec.md
    ├── plan.md
    └── tasks.md
```

## Build order

The three specs are numbered in dependency order, not arbitrarily:

**001 (database) → 002 (backend) → 003 (frontend)**

Each spec's `plan.md` states its dependency explicitly, and each `tasks.md` states which of its
own phases block which phase in the next spec — e.g. `001` Phase 2 (anonymous role) unblocks
`002` Phase 1, which unblocks `003` Phase 1.

## Before any implementation starts

**Update (30 July 2026):** 6 of the original 9 Open Items are now resolved — data shape,
year coverage (continuous), final role list (`public`/`regular_user`/`admin`, 3 total), admin UI
(built, not manual ops), export formats (PDF/Excel/CSV), and search (needed). See `FRD.md` §11 and
`Project_Document.md` §9 for the resolutions, and `FRD.md` §6.8 for the client's 14-theme layer
catalog (`Dashboard_workflow.docx`) that replaces the placeholder layer grouping this spec-kit was
originally written against.

`001`'s `tasks.md` Phase 0 (T001) previously gated on all 9 items; it should now be updated to
gate only on the 3 still-open items — audit logging, hosting environment, and filter-state
persistence — none of which block schema/role/layer work, only the specific features tied to
them (see `Project_Document.md` §9 "Still open" for what each blocks).

**Update (31 July 2026):** the `Dashboard_workflow.docx` 14-theme catalog referenced above by
citation only is now transcribed in full — `specs/001-database-rbac-temporal/spec.md`'s new
"14-Theme Filter & Output Catalog" section gives the concrete `filter_config` keys, data format,
and outputs for all 14 themes plus the 8 base/reference layers, and `specs/002-backend-api` /
`specs/003-frontend-web-dashboard` have been updated to reference it (FR-010, FR-017) instead of
the generic "year, satellite/drone source, village, zone/grid, fauna" placeholder. Two dashboard
functions from that document that weren't previously named as their own requirement — **Zoom to
Layer** and **Layer Transparency** — are now `003`'s FR-021 (Scenario 11); **Identify Feature
Tool** is recorded as already satisfied by the existing feature-click flow (`003`'s FR-022, no new
work). Still not resolved by this update: `FRD.md` and `Project_Document.md` themselves remain
absent from this repository — only their citations and this one source document exist here.

## Using this with `/specify`, `/plan`, `/tasks` commands

If your spec-kit tooling supports regenerating or extending these via slash commands, treat the
existing `spec.md` files as the `/specify` output already accepted — running `/plan` again should
extend `plan.md`'s Phase 1 outputs (`data-model.md`, `contracts/`, `quickstart.md`) rather than
regenerate the whole file, since the Constitution Check and Project Structure sections already
reflect the real codebase (per the FRD/Project Document this was derived from), not a generic
template.
