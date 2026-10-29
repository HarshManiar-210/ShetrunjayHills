-- Geomorphology (GSI layer): client ask is "Solid line and Solid fill" --
-- the fill was already solid (065-geomorphology-symbology.sql), but the
-- outline was still drawing dotted. 051-line-styles-and-popups.sql had set
-- dotted = true for a since-replaced dotted-boundary treatment, and 065
-- never cleared it when it moved geomorphology to a solid fill + solid
-- black outline -- Map.tsx's `patterned` check reads dotted regardless of
-- `solid`, so the leftover flag kept the outline dotted.
--
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/086-geomorphology-solid-outline.sql
--
-- Idempotent: plain UPDATE by key.

UPDATE static_overlays SET dotted = false WHERE key = 'geomorphology';
