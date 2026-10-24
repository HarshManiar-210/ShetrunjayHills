-- Forest Cover FSI / Forest Type FSI as rasters instead of vector polygons,
-- and Forest Type FSI's re-delivered statistics. See init.sql.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/069-fsi-rasters.sql
--
-- Idempotent: groups inserted if missing, rows updated by key, statistics
-- replaced whole.

BEGIN;
INSERT INTO layer_groups (key, label, parent_id, sort_order) VALUES
    ('forest-cover-fsi', 'Forest Cover FSI 2023', grp('forest-layers'), 7),
    ('forest-type-fsi',  'Forest Type FSI 2023',  grp('forest-layers'), 8)
ON CONFLICT (key) DO NOTHING;
UPDATE static_overlays SET group_id = grp('forest-cover-fsi'), asset_type = 'raster', sort_order = 1,
    kind = NULL, color = NULL, color_field = NULL, categories = NULL, popup_fields = NULL,
    fill_opacity = NULL, outline_color = NULL, line_width = NULL, solid = false,
    file_path = 'raster-data/fsi/forest-cover-fsi.png',
    min_lon = 71.7285383, min_lat = 21.4506621, max_lon = 71.8213545, max_lat = 21.5126668
WHERE key = 'forestCoverFSI';
UPDATE static_overlays SET group_id = grp('forest-type-fsi'), asset_type = 'raster', sort_order = 1,
    kind = NULL, color = NULL, color_field = NULL, categories = NULL, popup_fields = NULL,
    fill_opacity = NULL, outline_color = NULL, line_width = NULL, solid = false,
    file_path = 'raster-data/fsi/forest-type-fsi.png',
    min_lon = 71.7285383, min_lat = 21.4506621, max_lon = 71.8213545, max_lat = 21.5126668
WHERE key = 'forestTypeFSI';

-- Forest Type FSI's statistics, re-delivered over the whole study area
-- (3393.60 ha) rather than the forest alone: the same seven types plus the
-- rest of the study area as "Other". Forest Cover FSI's are unchanged.
DELETE FROM overlay_class_stats WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'forestTypeFSI');
INSERT INTO overlay_class_stats (overlay_id, class_value, label, class_group, area_ha, percentage, sort_order)
SELECT o.id, v.class_value, v.label, NULL, v.area_ha, v.percentage, v.sort_order
FROM (VALUES
    ('3B/C2 Southern moist mixed deciduous forest', '3B/C2 Southern moist mixed deciduous forest', 1.03, 0.03, 1),
    ('5/DS4 Dry Grassland', '5/DS4 Dry Grassland', 256.54, 7.56, 2),
    ('5/E1 Anogeissus pendula Forest', '5/E1 Anogeissus pendula Forest', 501.25, 14.771, 3),
    ('5/E 8c Salvadora-T amarix scrub', '5/E 8c Salvadora-Tamarix scrub', 8.82, 0.26, 4),
    ('Acacia senegal forest', 'Acacia senegal forest', 1576.94, 46.468, 5),
    ('6/E4 Salvadora scrub', '6/E4 Salvadora scrub', 9.78, 0.288, 6),
    ('Water', 'Water', 8.34, 0.246, 7),
    ('Other', 'Other', 1030.89, 30.377, 8)
) AS v (class_value, label, area_ha, percentage, sort_order)
JOIN static_overlays o ON o.key = 'forestTypeFSI';
COMMIT;
