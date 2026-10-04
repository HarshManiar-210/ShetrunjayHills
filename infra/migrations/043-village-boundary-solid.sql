-- Village Boundary: a solid outline whose popup shows District, Taluka and
-- Village. Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/043-village-boundary-solid.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET solid = true, popup_fields = '{District,Taluka,Village}' WHERE key = 'villages';
