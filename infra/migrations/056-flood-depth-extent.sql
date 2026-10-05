-- Flood Depth: the client's corrected extent for all five depth images,
-- EPSG:4326 71.727678,21.452812 : 71.823911,21.512044. It replaces the
-- "Flood All Layers" extent from migration 037 (71.7282,21.4169 :
-- 71.8245,21.4756), which put the flooding ~4 km south of the hills.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/056-flood-depth-extent.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET min_lon=71.727678, min_lat=21.452812, max_lon=71.823911, max_lat=21.512044
WHERE key IN ('flood0_5m','flood1m','flood2m','flood5m','flood10m');
