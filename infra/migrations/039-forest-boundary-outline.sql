-- Forest Boundary: a solid outline (was a tinted fill) whose popup shows only
-- F_TYPE. Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/039-forest-boundary-outline.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{F_TYPE}' WHERE key = 'forestBoundary';
