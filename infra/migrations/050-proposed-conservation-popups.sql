-- Proposed Conservation Sites: solid outlines (were tinted fills) whose popups
-- show Feature, Volume (m³, not Matipala) and Zone. Restates init.sql; apply to
-- an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/050-proposed-conservation-popups.sql
--
-- Idempotent: plain UPDATEs by key.

UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{"Name:Feature","Volume:Volume(m³)","Zone_2:Zone"}'
    WHERE key IN ('proposedVantalavadi', 'proposedCheckdam');
UPDATE static_overlays SET kind = 'outline', solid = true, popup_fields = '{"Name:Feature","Zone_2:Zone"}'
    WHERE key = 'proposedMatipala';
