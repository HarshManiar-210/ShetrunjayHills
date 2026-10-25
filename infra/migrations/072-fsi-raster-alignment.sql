-- Forest Cover / Forest Type FSI 2023 rasters: placed by fitting each
-- raster's forest pixels to the same classes' georeferenced vector polygons
-- (apps/vector-data/forest-*-FSI.geojson), so class edges line up across the
-- whole layer, not just at its rim; tools/prepare-study-area-rasters.py
-- ("4326-clip" + VECTOR_REFS). An outline-only fit, the first version of
-- this migration, matched the rim but left the interior tens of metres off.
-- The served PNGs are also clipped to the study-area outline: at ~24 m
-- cells, those straddling the boundary otherwise poke past it. Delivered
-- images kept in apps/raster-data/originals/fsi.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/072-fsi-raster-alignment.sql
--
-- Idempotent: plain UPDATEs by key.

BEGIN;
UPDATE static_overlays SET min_lon=71.7283031, min_lat=21.4511155, max_lon=71.8217109, max_lat=21.5125335 WHERE key='forestCoverFSI';
UPDATE static_overlays SET min_lon=71.7283274, min_lat=21.4509208, max_lon=71.8217617, max_lat=21.5124803 WHERE key='forestTypeFSI';
COMMIT;
