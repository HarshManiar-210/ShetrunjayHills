-- Both Vantalavadi layers show their Volume when clicked. Restates init.sql;
-- apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/038-vantalavadi-volume-popup.sql
--
-- Idempotent: plain UPDATEs by key.

UPDATE static_overlays SET popup_fields = '{VolumeVolume}' WHERE key = 'vantalawadi';
UPDATE static_overlays SET popup_fields = '{Volume,Zone_2}' WHERE key = 'proposedVantalavadi';
