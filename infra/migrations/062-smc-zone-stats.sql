-- Adds the client's SMC Statistics table (smc_zone_counts): existing and
-- potential soil & moisture conservation structures per study-area zone,
-- shown in the Statistics panel while an SMC layer is on. See init.sql for
-- why it is stored as delivered rather than counted from the layers' files.
--
-- This restates a change already made in infra/postgis-init/init.sql. That
-- file only runs when Postgres initialises an empty data directory, so a
-- database that already exists needs the statements below run against it:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/062-smc-zone-stats.sql
--
-- Idempotent: the table is created if missing and its rows replaced whole.

BEGIN;
-- The client's SMC Statistics table: how many of each soil & moisture
-- conservation structure stand in each study-area zone, existing and
-- potential. Stored as delivered rather than counted from the layers' files,
-- because a structure is not always one feature -- each Causeway is drawn as
-- two parallel bars, so its file holds 72 features for 37 causeways. The other
-- six layers' counts match their files feature for feature.
--
-- One row per zone per SMC layer. `set_label` is the table's own column
-- heading for the layer's set (Existing / Potential) and `column_order` its
-- column position; the structure itself is named by its overlay's label, so
-- the existing and potential Checkdam share a column. A new zone or structure
-- is a row here, not a code change.
CREATE TABLE IF NOT EXISTS smc_zone_counts (
    overlay_id      INTEGER NOT NULL REFERENCES static_overlays (id) ON DELETE CASCADE,
    zone_no         INTEGER NOT NULL,
    zone_name       TEXT NOT NULL,
    set_label       TEXT NOT NULL,
    column_order    INTEGER NOT NULL DEFAULT 0,
    structure_count INTEGER NOT NULL CHECK (structure_count >= 0),
    PRIMARY KEY (overlay_id, zone_no)
);

DELETE FROM smc_zone_counts;
INSERT INTO smc_zone_counts (overlay_id, zone_no, zone_name, set_label, column_order, structure_count)
SELECT o.id, v.zone_no, v.zone_name, v.set_label, v.column_order, v.structure_count
FROM (VALUES
    ('checkDam', 1, 'Main Temple Ridge', 'Existing', 1, 10),
    ('checkDam', 2, 'Jivapar-Rohishala Escarpment', 'Existing', 1, 18),
    ('checkDam', 3, 'Ghetipag Escarpment', 'Existing', 1, 20),
    ('checkDam', 4, 'Six-Gau Ridge', 'Existing', 1, 14),
    ('checkDam', 5, 'Khodiyar-Gheti Plateau', 'Existing', 1, 14),
    ('checkDam', 6, 'Kanjarda Hill Complex', 'Existing', 1, 3),
    ('proposedCheckdam', 1, 'Main Temple Ridge', 'Potential', 1, 1),
    ('proposedCheckdam', 2, 'Jivapar-Rohishala Escarpment', 'Potential', 1, 3),
    ('proposedCheckdam', 3, 'Ghetipag Escarpment', 'Potential', 1, 1),
    ('proposedCheckdam', 4, 'Six-Gau Ridge', 'Potential', 1, 3),
    ('proposedCheckdam', 5, 'Khodiyar-Gheti Plateau', 'Potential', 1, 1),
    ('proposedCheckdam', 6, 'Kanjarda Hill Complex', 'Potential', 1, 0),
    ('vantalawadi', 1, 'Main Temple Ridge', 'Existing', 2, 5),
    ('vantalawadi', 2, 'Jivapar-Rohishala Escarpment', 'Existing', 2, 1),
    ('vantalawadi', 3, 'Ghetipag Escarpment', 'Existing', 2, 4),
    ('vantalawadi', 4, 'Six-Gau Ridge', 'Existing', 2, 1),
    ('vantalawadi', 5, 'Khodiyar-Gheti Plateau', 'Existing', 2, 2),
    ('vantalawadi', 6, 'Kanjarda Hill Complex', 'Existing', 2, 2),
    ('proposedVantalavadi', 1, 'Main Temple Ridge', 'Potential', 2, 4),
    ('proposedVantalavadi', 2, 'Jivapar-Rohishala Escarpment', 'Potential', 2, 2),
    ('proposedVantalavadi', 3, 'Ghetipag Escarpment', 'Potential', 2, 5),
    ('proposedVantalavadi', 4, 'Six-Gau Ridge', 'Potential', 2, 3),
    ('proposedVantalavadi', 5, 'Khodiyar-Gheti Plateau', 'Potential', 2, 0),
    ('proposedVantalavadi', 6, 'Kanjarda Hill Complex', 'Potential', 2, 3),
    ('matiPala', 1, 'Main Temple Ridge', 'Existing', 3, 55),
    ('matiPala', 2, 'Jivapar-Rohishala Escarpment', 'Existing', 3, 12),
    ('matiPala', 3, 'Ghetipag Escarpment', 'Existing', 3, 36),
    ('matiPala', 4, 'Six-Gau Ridge', 'Existing', 3, 65),
    ('matiPala', 5, 'Khodiyar-Gheti Plateau', 'Existing', 3, 0),
    ('matiPala', 6, 'Kanjarda Hill Complex', 'Existing', 3, 25),
    ('proposedMatipala', 1, 'Main Temple Ridge', 'Potential', 3, 12),
    ('proposedMatipala', 2, 'Jivapar-Rohishala Escarpment', 'Potential', 3, 12),
    ('proposedMatipala', 3, 'Ghetipag Escarpment', 'Potential', 3, 1),
    ('proposedMatipala', 4, 'Six-Gau Ridge', 'Potential', 3, 10),
    ('proposedMatipala', 5, 'Khodiyar-Gheti Plateau', 'Potential', 3, 0),
    ('proposedMatipala', 6, 'Kanjarda Hill Complex', 'Potential', 3, 8),
    ('causeway', 1, 'Main Temple Ridge', 'Existing', 4, 1),
    ('causeway', 2, 'Jivapar-Rohishala Escarpment', 'Existing', 4, 13),
    ('causeway', 3, 'Ghetipag Escarpment', 'Existing', 4, 4),
    ('causeway', 4, 'Six-Gau Ridge', 'Existing', 4, 4),
    ('causeway', 5, 'Khodiyar-Gheti Plateau', 'Existing', 4, 11),
    ('causeway', 6, 'Kanjarda Hill Complex', 'Existing', 4, 4)
) AS v (overlay_key, zone_no, zone_name, set_label, column_order, structure_count)
JOIN static_overlays o ON o.key = v.overlay_key;
COMMIT;
