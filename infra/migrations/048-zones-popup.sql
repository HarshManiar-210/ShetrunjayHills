-- Zones: a solid outline whose popup shows only the zone's name. Restates
-- init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/048-zones-popup.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET solid = true, popup_fields = '{"ZName:Zone Name"}' WHERE key = 'zones';
