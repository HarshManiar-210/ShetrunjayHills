-- Roads: the popup shows Category and the road's name (NAME, captioned "Road
-- Name"; a "Field:Label" entry captions the row). Restates init.sql; apply to
-- an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/044-roads-popup.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{Category,"NAME:Road Name"}' WHERE key = 'roads';
