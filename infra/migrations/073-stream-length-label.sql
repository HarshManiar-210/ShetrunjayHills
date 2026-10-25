-- Stream Network: label the Length row "Length (Meters)" instead of the
-- unit trailing the value. Restates init.sql; apply to an existing database
-- with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/073-stream-length-label.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{strmOrder,"Length:Length (Meters):m"}' WHERE key = 'streams';
