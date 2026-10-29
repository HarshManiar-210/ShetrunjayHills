-- Client ask: every SMC layer's popup metadata should show Area (SqM)
-- instead of Area (Ha). Covers both Existing SMC (Check Dam, Causeway,
-- Matipala, Vantalavadi) and Proposed SMC (Check Dam, Matipala, Vantalavadi).
--
-- Causeway's served GeoJSON lacked an areaM property (only areaHa), so
-- tools/prepare-smc.py was extended to backfill areaM the same way it
-- already backfilled areaHa, and re-run against the served file:
--
--   python3 tools/prepare-smc.py existing apps/vector-data/causeway-existing-water-conservation.geojson
--
-- Every other SMC file already carried areaM in its delivery. Restates
-- init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/085-smc-area-sqm.sql
--
-- Idempotent: plain UPDATE by key.

BEGIN;

UPDATE static_overlays SET popup_fields = '{Feature,"GridNum:Grid Number","Zone:Zone Number","areaM:Area (SqM)"}'
    WHERE key IN ('checkDam', 'causeway', 'matiPala');
UPDATE static_overlays SET popup_fields = '{Feature,"VolumeVolu:Volume(m³)","areaM:Area (SqM)","GridNum:Grid Number","Zone:Zone Number"}'
    WHERE key = 'vantalawadi';

UPDATE static_overlays SET popup_fields = '{"Name:Feature","GridNum:Grid Number","Zone_2:Zone Number","areaM:Area (SqM)"}'
    WHERE key = 'proposedMatipala';
UPDATE static_overlays SET popup_fields = '{"Name:Feature","Volume:Volume(m³)","GridNum:Grid Number","Zone_2:Zone Number","areaM:Area (SqM)"}'
    WHERE key = 'proposedCheckdam';
UPDATE static_overlays SET popup_fields = '{"Name:Feature","Volume:Volume(m³)","areaM:Area (SqM)","GridNum:Grid Number","Zone_2:Zone Number"}'
    WHERE key = 'proposedVantalavadi';

COMMIT;
