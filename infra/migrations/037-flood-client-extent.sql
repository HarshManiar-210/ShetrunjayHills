-- Flood Depth: use the client's authoritative "Flood All Layers" extent for all
-- five images, replacing the Streams.geojson fit from migration 025.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/037-flood-client-extent.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET min_lon=71.7282, min_lat=21.4169, max_lon=71.8245, max_lat=21.4756
WHERE key IN ('flood0_5m','flood1m','flood2m','flood5m','flood10m');
