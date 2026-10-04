-- Existing Soil & Moisture Conservation: solid outlines (were tinted fills)
-- whose popups show Feature (and Vantalavadi's volume, in m³). Restates
-- init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/049-existing-conservation-popups.sql
--
-- Idempotent: plain UPDATEs by key.

UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{Feature}'
    WHERE key IN ('matiPala', 'checkDam', 'causeway');
UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{Feature,"VolumeVolume:Volume(m³)"}'
    WHERE key = 'vantalawadi';
