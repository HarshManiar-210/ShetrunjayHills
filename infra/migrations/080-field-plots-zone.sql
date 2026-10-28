-- Field Plots zone: the redelivered FieldPlots.geojson carries each plot's
-- zone (Zone / ZName), so the popup gains a Zone row after growing stock.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/080-field-plots-zone.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET popup_fields = '{"Grid No.:Grid Number","Name:Plot Number","Growing St:Grid Growing Stock","ZName:Zone"}' WHERE key = 'fieldPlots';
