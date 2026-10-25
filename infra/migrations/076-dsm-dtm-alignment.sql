-- DSM and DTM carried the same ~98m east/28m north displacement as
-- Orthomosaic (see 075-orthomosaic-alignment.sql) and got the identical
-- correction: each archive's own zoom-19 tiles extracted, geotransform
-- re-stamped by the same delta (no resampling), zoom 10-19 re-tiled. This
-- row's bounds are cosmetic for a tiled raster (the archive's own tile grid
-- places it), but restated here to keep "fit to layer" accurate. Restates
-- init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/076-dsm-dtm-alignment.sql
--
-- The corrected DSM.pmtiles/DTM.pmtiles themselves still need to be copied
-- onto the server the same way Orthomosaic's was.
--
-- Idempotent: a plain UPDATE by key.

UPDATE static_overlays SET min_lon = 71.7258930, min_lat = 21.4500615, max_lon = 71.8231094, max_lat = 21.5125858 WHERE key = 'dsm';
UPDATE static_overlays SET min_lon = 71.7262540, min_lat = 21.4504527, max_lon = 71.8225077, max_lat = 21.5116530 WHERE key = 'dtm';
