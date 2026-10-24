-- Polygon prominence: the frontend's default polygon fill rises from 0.15 to
-- 0.35 and its default edge from 0.75 to 1.5 px (Map.tsx), so thematic
-- polygons read clearly. The framing layers that cover most of the map --
-- Study Area (on by default), District, Taluka, Tree Grid -- keep the lighter
-- 0.15 here so they don't wash out the layers drawn above them.
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/067-polygon-prominence.sql
--
-- Idempotent: only rows without their own fill_opacity are touched.

UPDATE static_overlays SET fill_opacity = 0.15
WHERE key IN ('studyArea', 'districtBoundary', 'talukaBoundary', 'treeGrid') AND fill_opacity IS NULL;
