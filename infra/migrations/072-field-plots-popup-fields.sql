-- Field Plots popup: expand from the plot name alone to grid number, plot
-- number (Name) and the grid's growing stock. Restates init.sql; apply to an
-- existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/072-field-plots-popup-fields.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{"Grid No.:Grid Number","Name:Plot Number","Growing St:Grid Growing Stock"}' WHERE key = 'fieldPlots';
