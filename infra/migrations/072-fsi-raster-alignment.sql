-- Forest Cover / Forest Type FSI 2023 rasters: fitted to the study-area
-- outline (IoU 0.954, EPSG:4326 grid) by tools/prepare-study-area-rasters.py,
-- moving the bounds from migration 069 by 16-73 m (both images sat ~55-70 m
-- too tall). The served PNGs are also clipped to the outline: at ~24 m
-- cells, those straddling the boundary otherwise poke past it. Delivered
-- images kept in apps/raster-data/originals/fsi.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/072-fsi-raster-alignment.sql
--
-- Idempotent: plain UPDATEs by key.

BEGIN;
UPDATE static_overlays SET min_lon=71.7281248, min_lat=21.4511923, max_lon=71.8216458, max_lat=21.5121722 WHERE key='forestCoverFSI';
UPDATE static_overlays SET min_lon=71.7281062, min_lat=21.4513183, max_lon=71.8215115, max_lat=21.5120283 WHERE key='forestTypeFSI';
COMMIT;
