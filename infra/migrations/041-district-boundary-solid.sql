-- District Boundary: a solid outline whose popup shows only District. Restates
-- init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/041-district-boundary-solid.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET solid = true, popup_fields = '{District}' WHERE key = 'districtBoundary';
