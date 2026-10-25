-- Greenwash Area's outline back to the original bright green (#00ff4b) —
-- 019-vector-legend-colors.sql's #00340a is close enough to Study Area
-- Boundary's own near-black outline that the two were hard to tell apart.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/078-greenwash-bright-green.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET color = '#00ff4b' WHERE key = 'greenwash';
