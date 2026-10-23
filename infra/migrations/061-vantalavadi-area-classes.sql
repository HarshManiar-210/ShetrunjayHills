-- Existing Water Conservation and Proposed Conservation Sites: every layer
-- solid-filled, and both Vantalavadi layers' re-delivered files (with areaM;
-- the existing one also renames its volume column VolumeVolu) classed by area
-- into five equal-interval classes. Adds static_overlays.fill_opacity,
-- which is what lets these fill layers be solid while the rest stay a light
-- wash, and .outline_color, for the SMC layers' black edges. Both sets' SMC
-- files are re-delivered too, prepared by tools/prepare-smc.py.
-- See init.sql for both.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay --     < infra/migrations/061-vantalavadi-area-classes.sql
--
-- Idempotent: an IF NOT EXISTS column and a plain UPDATE by key.

BEGIN;
ALTER TABLE static_overlays
    ADD COLUMN IF NOT EXISTS fill_opacity DOUBLE PRECISION CHECK (fill_opacity BETWEEN 0 AND 1),
    ADD COLUMN IF NOT EXISTS outline_color TEXT;
UPDATE static_overlays SET kind = 'fill', fill_opacity = 1, color = '#128ed8', color_field = 'areaM',
    categories = '[
        {"value": "425-4373", "label": "425 – 4373 SqM", "min": 425, "max": 4373, "color": "#a2e4ff"},
        {"value": "4373-8321", "label": "4373 – 8321 SqM", "min": 4373, "max": 8321, "color": "#67adf0"},
        {"value": "8321-12270", "label": "8321 – 12270 SqM", "min": 8321, "max": 12270, "color": "#128ed8"},
        {"value": "12270-16218", "label": "12270 – 16218 SqM", "min": 12270, "max": 16218, "color": "#2e57c4"},
        {"value": "16218-20166", "label": "16218 – 20166 SqM", "min": 16218, "max": 20166, "color": "#0216b1"}
    ]'::jsonb,
    popup_fields = '{Feature,"VolumeVolu:Volume(m³)","areaM:Area (SqM)"}',
    min_lon = 71.737555, min_lat = 21.474284, max_lon = 71.819679, max_lat = 21.510452
WHERE key = 'vantalawadi';
-- Every Existing Water Conservation layer (Matipala, Vantalavadi, Checkdam,
-- Causeway) is drawn solid-filled rather than as a light wash.
UPDATE static_overlays SET fill_opacity = 1 WHERE group_id = grp('existing-water-conservation');
-- Proposed Vantalavadi: classed by area (areaM) into five equal-interval
-- classes, like Existing Vantalavadi. The client's legend printed the third
-- class as "1955 - 2866"; the classes are 931 m² wide, so its upper bound is
-- 2886, where the fourth class starts.
UPDATE static_overlays SET color = '#9d5ec0', color_field = 'areaM',
    categories = '[
        {"value": "93-1024", "label": "93 – 1024 SqM", "min": 93, "max": 1024, "color": "#e9cefd"},
        {"value": "1024-1955", "label": "1024 – 1955 SqM", "min": 1024, "max": 1955, "color": "#c7a3f3"},
        {"value": "1955-2886", "label": "1955 – 2886 SqM", "min": 1955, "max": 2886, "color": "#9d5ec0"},
        {"value": "2886-3817", "label": "2886 – 3817 SqM", "min": 2886, "max": 3817, "color": "#6e18b3"},
        {"value": "3817-4748", "label": "3817 – 4748 SqM", "min": 3817, "max": 4748, "color": "#411270"}
    ]'::jsonb,
    popup_fields = '{"Name:Feature","Volume:Volume(m³)","Zone_2:Zone","areaM:Area (SqM)"}'
WHERE key = 'proposedVantalavadi';

-- Every Proposed Conservation Sites layer (Matipala, Vantalavadi, Checkdam)
-- is drawn solid-filled too.
UPDATE static_overlays SET fill_opacity = 1 WHERE group_id = grp('proposed-conservation-sites');
-- Existing SMC (Check Dam, Causeway, Matipala): the client's symbology, a solid
-- fill in each structure's colour inside a solid black outline. The files were
-- re-delivered with Zone and areaHa; tools/prepare-smc.py adds each feature's
-- grid cell (GridNum, from Zones.geojson) and Causeway's area, which it lacks.
-- Popups gain Grid Number, Zone Number and Area (Ha).
UPDATE static_overlays SET color = '#08fbc0', outline_color = '#000000' WHERE key = 'checkDam';
UPDATE static_overlays SET color = '#f9cf08', outline_color = '#000000' WHERE key = 'causeway';
UPDATE static_overlays SET color = '#f2319c', outline_color = '#000000' WHERE key = 'matiPala';
UPDATE static_overlays SET popup_fields = '{Feature,"GridNum:Grid Number","Zone:Zone Number","areaHa:Area (Ha)"}'
    WHERE key IN ('checkDam', 'causeway', 'matiPala');
UPDATE static_overlays SET popup_fields = '{Feature,"VolumeVolu:Volume(m³)","areaM:Area (SqM)","GridNum:Grid Number","Zone:Zone Number","areaHa:Area (Ha)"}'
    WHERE key = 'vantalawadi';
-- Proposed SMC (Check Dam, Matipala): the client's symbology, a solid fill in
-- each structure's colour inside a solid black outline (Vantalavadi keeps its
-- area classes). tools/prepare-smc.py adds each feature's grid cell (GridNum).
-- Popups gain Grid Number and Area (Ha); Zone_2 is the zone number.
UPDATE static_overlays SET color = '#05f8f8', outline_color = '#000000' WHERE key = 'proposedCheckdam';
UPDATE static_overlays SET color = '#ff00ff', outline_color = '#000000' WHERE key = 'proposedMatipala';
UPDATE static_overlays SET popup_fields = '{"Name:Feature","GridNum:Grid Number","Zone_2:Zone Number","areaHa:Area (Ha)"}'
    WHERE key = 'proposedMatipala';
UPDATE static_overlays SET popup_fields = '{"Name:Feature","Volume:Volume(m³)","GridNum:Grid Number","Zone_2:Zone Number","areaHa:Area (Ha)"}'
    WHERE key = 'proposedCheckdam';
UPDATE static_overlays SET popup_fields = '{"Name:Feature","Volume:Volume(m³)","areaM:Area (SqM)","GridNum:Grid Number","Zone_2:Zone Number","areaHa:Area (Ha)"}'
    WHERE key = 'proposedVantalavadi';
COMMIT;
