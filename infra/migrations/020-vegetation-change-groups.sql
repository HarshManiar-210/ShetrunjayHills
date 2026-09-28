-- Vegetation Change statistics: each transition's group is now derived from
-- its two density codes (towards denser = Improvement, sparser = Degradation,
-- same = Stable) rather than copied from the spreadsheet, whose headings
-- misfiled three rows. The panel heads each run of one group, so the moved
-- rows' sort_order changes too. See tools/prepare-class-stats.py.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/020-vegetation-change-groups.sql
--
-- Idempotent: plain UPDATEs by overlay key and class value.

BEGIN;
UPDATE overlay_class_stats SET class_group = 'Improvement', sort_order = 9
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'NF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 10
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'VDF-MDF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 11
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'VDF-OF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 12
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'VDF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 13
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'MDF-OF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 14
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'MDF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 15
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'MDF-NF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 16
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'OF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 17
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'OF-NF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 18
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1980_1989') AND class_value = 'SCRUB-NF';
UPDATE overlay_class_stats SET class_group = 'Improvement', sort_order = 5
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1989_1998') AND class_value = 'OF-MDF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 6
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1989_1998') AND class_value = 'VDF-MDF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 7
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1989_1998') AND class_value = 'VDF-NF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 8
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1989_1998') AND class_value = 'MDF-OF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 9
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1989_1998') AND class_value = 'MDF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 10
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_1989_1998') AND class_value = 'MDF-NF';
UPDATE overlay_class_stats SET class_group = 'Improvement', sort_order = 7
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'NF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 8
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'VDF-MDF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 9
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'VDF-OF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 10
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'VDF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 11
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'MDF-OF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 12
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'MDF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 13
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'OF-SCRUB';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 14
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'OF-NF';
UPDATE overlay_class_stats SET class_group = 'Degradation', sort_order = 15
    WHERE overlay_id = (SELECT id FROM static_overlays WHERE key = 'vegetation_change_2025_2026') AND class_value = 'SCRUB-NF';
COMMIT;
