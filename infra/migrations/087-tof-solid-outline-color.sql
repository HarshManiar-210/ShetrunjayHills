-- Client ask: TOF (Trees Outside Forests) line will be solid, fill as it is.
-- 079-tof-solid-symbology.sql already set solid = true (no animated edge),
-- but never set outline_color -- without it the edge falls back to each
-- feature's own fill colour, which on ~400k densely packed tree-crown
-- polygons reads as no visible edge at all. Setting it to black gives every
-- class a genuinely visible solid line; fill colours are untouched.
--
-- Restates init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/087-tof-solid-outline-color.sql
--
-- Idempotent: plain UPDATE by key.

UPDATE static_overlays SET outline_color = '#000000' WHERE key = 'treesOutsideForests';
