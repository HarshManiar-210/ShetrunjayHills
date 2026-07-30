<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Spec-kit: planned frontend work

Root-level `CLAUDE.md` and the project constitution (`/.specify/memory/constitution.md`) govern
this app; this file only adds Next.js-specific notes above. For planned work on `apps/web`, the
source of truth is `/specs/003-frontend-web-dashboard/` (`spec.md`, `plan.md`, `tasks.md`) —
public map access, the design-system rollout, and time-control UI are scoped there, in dependency
order after `/specs/001-database-rbac-temporal/` and `/specs/002-backend-api/`. Read `spec.md`'s
Open Items and `plan.md`'s Constitution Check before starting a task from `tasks.md`.

`plan.md` cites the design system as `docs/design-system.md`; the actual file in this repo is
`/DESIGN.md` (root-level) — treat that as the same document until the spec text is corrected.
