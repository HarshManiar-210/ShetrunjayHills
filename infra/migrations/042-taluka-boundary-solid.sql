-- Taluka Boundary: a solid outline whose popup shows District and Taluka.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/042-taluka-boundary-solid.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET solid = true, popup_fields = '{District,Taluka}' WHERE key = 'talukaBoundary';
