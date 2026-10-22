-- Forest Boundary popup: expand from F_TYPE alone to the five fields the
-- client asked for. Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/058-forest-boundary-popup-fields.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{"F_SNO:Forest Survey Number",F_TYPE,SECTION,RANGE,DIVISION}' WHERE key = 'forestBoundary';
