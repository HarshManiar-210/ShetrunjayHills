-- TOF re-delivered (TOF_with_SpeciesGuj.parquet): new extent, species and
-- Gujarati name in the popup, and the client's TOF area statistics. The
-- tiles themselves are apps/vector-data/tree-outside-forest.pmtiles, rebuilt
-- from the new file. See init.sql.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/070-tof-redelivery.sql
--
-- Idempotent: a plain UPDATE by key; the statistics are replaced whole.

BEGIN;
UPDATE static_overlays SET
    popup_fields = '{"TOF_Class:TOF Class","Max_Height:Max Height","Predicted_SN:Species","GujaratiName:Gujarati Name"}',
    min_lon = 71.728527, min_lat = 21.451974, max_lon = 71.821770, max_lat = 21.510731
WHERE key = 'treesOutsideForests';

-- TOF area statistics (delivered table, 192.56 ha in all). Its fourth row was
-- labelled "Linear TOF" a second time; it is Built-up TOF (confirmed).
DELETE FROM overlay_class_stats WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'treesOutsideForests');
INSERT INTO overlay_class_stats (overlay_id, class_value, label, class_group, area_ha, percentage, sort_order)
SELECT o.id, v.class_value, v.class_value, NULL, v.area_ha, v.area_ha / 192.56 * 100, v.sort_order
FROM (VALUES
    ('Scattered TOF', 58.64, 1),
    ('Linear TOF', 3.71, 2),
    ('Block TOF', 129.96, 3),
    ('Built-up TOF', 0.25, 4)
) AS v (class_value, area_ha, sort_order)
JOIN static_overlays o ON o.key = 'treesOutsideForests';
COMMIT;
