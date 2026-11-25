-- Growing Stock re-delivered: an eight-class map (0 - 19, blue to dark
-- green) replaces the five-class one. The PNG is cropped to its opaque
-- footprint and narrowed to 8192 px (nearest neighbour, so class colours stay
-- exact), its anti-aliased edge (0.13% of pixels) snapped to the eight
-- legend colours with hard alpha -- blended or semi-transparent edge pixels
-- pushed it past rasterstats' 64-colour limit, so it read as photographic and
-- showed no class shares. Its bounds are refitted to the study-area outline by
-- tools/prepare-study-area-rasters.py (IoU 0.9988), within ~2 m of the old
-- ones. The legend's classes live in apps/web/lib/legend-config.ts. Restates
-- init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/094-growing-stock-redelivery.sql
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET min_lon = 71.7284723, min_lat = 21.4519475, max_lon = 71.8218132, max_lat = 21.5120057 WHERE key = 'growingStock';
