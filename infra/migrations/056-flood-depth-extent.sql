-- Flood Depth: per-image bounds. The five PNGs are cut to different heights
-- (4798-5222 px at 8192 wide), so one shared extent stretches some of them.
-- 1/2/5/10 m are fitted to Streams.geojson (flood water lies on the drainage
-- lines): their flooded pixels average ~10-22 m from a stream, against ~40 m
-- on the client's corrected extent 71.727678,21.452812 : 71.823911,21.512044,
-- whose east edge sits ~250 m too far east and south edge ~175 m too far
-- south. 0.5 m follows the streams too loosely to fit and keeps that extent.
-- Replaces migration 037's "Flood All Layers" extent, ~4 km south.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/056-flood-depth-extent.sql
--
-- Idempotent: plain UPDATEs by key.

BEGIN;
UPDATE static_overlays SET min_lon=71.727678, min_lat=21.452812, max_lon=71.823911, max_lat=21.512044 WHERE key='flood0_5m';
UPDATE static_overlays SET min_lon=71.7282297, min_lat=21.4544679, max_lon=71.8213600, max_lat=21.5124344 WHERE key='flood1m';
UPDATE static_overlays SET min_lon=71.7277826, min_lat=21.4543953, max_lon=71.8213511, max_lat=21.5123328 WHERE key='flood2m';
UPDATE static_overlays SET min_lon=71.7277128, min_lat=21.4543664, max_lon=71.8213571, max_lat=21.5123994 WHERE key='flood5m';
UPDATE static_overlays SET min_lon=71.7281620, min_lat=21.4543791, max_lon=71.8218351, max_lat=21.5125551 WHERE key='flood10m';
COMMIT;
