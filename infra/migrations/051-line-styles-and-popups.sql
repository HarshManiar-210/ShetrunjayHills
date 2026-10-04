-- Adds static_overlays.dashed, then sets popups and line styles for Fireline,
-- Geology, Dykes, Greenwash, Forest Cover/Type FSI, Geomorphology, Lineaments,
-- Wildlife Corridor, Study Area and Grazing Land. Restates init.sql; apply to
-- an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/051-line-styles-and-popups.sql
--
-- Idempotent: an IF NOT EXISTS column and plain UPDATEs by key.

ALTER TABLE static_overlays ADD COLUMN IF NOT EXISTS dashed BOOLEAN NOT NULL DEFAULT false;

-- Popups and symbology for the Drone Analysis / Geology / boundary layers.
-- Fireline: dotted line (already), Length and Zone.
UPDATE static_overlays SET popup_fields = '{length_km,Zone}' WHERE key = 'fireline';
-- Geology, Dykes, Greenwash and the FSI layers: solid lines (polygon ones were tinted fills).
UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{"lithologic:Geology Type"}' WHERE key = 'geology';
UPDATE static_overlays SET solid = true, popup_fields = '{"lithology:Dyke Type"}' WHERE key = 'dyke';
UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{"area:Greenwash Area"}' WHERE key = 'greenwash';
UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{"Type:Forest Cover Category"}' WHERE key = 'forestCoverFSI';
UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{"Type:Forest Type Category"}' WHERE key = 'forestTypeFSI';
-- Geomorphology: dotted boundary; Lineaments: dotted line.
UPDATE static_overlays SET kind = 'outline', dotted = true, popup_fields = '{"descriptio:Geomorphology Type"}' WHERE key = 'geomorphology';
UPDATE static_overlays SET dotted = true, popup_fields = '{"l1descript:Lineament"}' WHERE key = 'lineament';
-- Wildlife Corridor: solid line, Length (the file has no Zone column).
UPDATE static_overlays SET solid = true, popup_fields = '{Length}' WHERE key = 'wildlifeCorridorLines';
-- Study Area: Name and Area.
UPDATE static_overlays SET popup_fields = '{Name,area}' WHERE key = 'studyArea';
-- Grazing Land: dashed boundary.
UPDATE static_overlays SET kind = 'outline', dashed = true WHERE key = 'grazingLand';
