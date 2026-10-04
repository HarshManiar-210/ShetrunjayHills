-- Streams: the popup shows only Stream Order and Length. Restates init.sql;
-- apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/040-streams-popup.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{strmOrder,Length}' WHERE key = 'streams';
