-- Trees legend: each species row gains its Gujarati name and its tree count,
-- and the legend reads "Scientific Name (Gujarati Name) - Count" with the
-- 822,994-tree total under it (the frontend sums `count`). Figures are from
-- the delivered Tree_Stats_Guj.parquet (one row per tree; Predicted_SN and
-- GujaratiName counted). Scientific names follow the client's species table,
-- e.g. Acacia nilotica is listed as Vachellia nilotica.
--
-- `aliases` are further Predicted_SN spellings drawn in the same class
-- (Prosopis juliflora under Neltuma juliflora, "Albizia Amara" under Albizia
-- amara, ...); their trees are in that row's count. Species the old seed
-- listed that the delivered data has no trees for are dropped. Restates
-- infra/postgis-init/init.sql; apply to an existing database with:
--
--   docker compose exec -T db psql -U shetrunjay -d shetrunjay \
--     < infra/migrations/081-tree-species-gujarati-counts.sql
--
-- Idempotent: a plain UPDATE by key. Unnamed trees fall through to `color`.

UPDATE static_overlays SET color_field = 'Predicted_SN',
    categories = '[
        {"value": "Acacia nilotica", "aliases": ["Vachellia nilotica"], "label": "Vachellia nilotica", "gujaratiName": "બાવળ", "count": 73331, "color": "#76b7b2"},
        {"value": "Ailanthus excelsa", "label": "Ailanthus excelsa", "gujaratiName": "અરડૂસો", "count": 6817, "color": "#e6550d"},
        {"value": "Albizia amara", "aliases": ["Albizia Amara"], "label": "Albizia amara", "gujaratiName": "સિરિસ", "count": 902, "color": "#7b4173"},
        {"value": "Anogeissus latifolia", "label": "Anogeissus latifolia", "gujaratiName": "ધાવડો", "count": 50633, "color": "#edc948"},
        {"value": "Azadirachta indica", "label": "Azadirachta indica", "gujaratiName": "લીમડો", "count": 24920, "color": "#b07aa1"},
        {"value": "Bahunia", "label": "Bauhinia sp.", "gujaratiName": "કાંચનાર/અસુંદરો", "count": 357, "color": "#843c39"},
        {"value": "Balanites roxburghii", "label": "Balanites roxburghii", "gujaratiName": "ઇંગોરિયો", "count": 8438, "color": "#8c6d31"},
        {"value": "Bambusa vulgaris", "label": "Bambusa vulgaris", "gujaratiName": "વાંસ", "count": 2454, "color": "#637939"},
        {"value": "Boswellia serrata", "label": "Boswellia serrata", "gujaratiName": "સલાઈ ગૂગળ", "count": 12327, "color": "#9c755f"},
        {"value": "Butea monosperma", "label": "Butea monosperma", "gujaratiName": "ખાખરો / કેસૂડો", "count": 206503, "color": "#f28e2b"},
        {"value": "Dichrostachys cinerea", "label": "Dichrostachys cinerea", "gujaratiName": "મોરઢુંધિયું", "count": 142705, "color": "#e15759"},
        {"value": "Diospyros melanoxylon", "aliases": ["Diospyros melanoxylon Roxb."], "label": "Diospyros melanoxylon", "gujaratiName": "ટીમરુ", "count": 826, "color": "#f7b6d2"},
        {"value": "Euphorbia", "label": "Euphorbia sp.", "gujaratiName": "થોર", "count": 96, "color": "#c5b0d5"},
        {"value": "Ficus benghalensis", "aliases": ["Ficus bengalensis"], "label": "Ficus benghalensis", "gujaratiName": "વડ", "count": 1974, "color": "#98df8a"},
        {"value": "Ficus benjamina L.", "label": "Ficus benjamina", "gujaratiName": "વડ", "count": 65670, "color": "#59a14f"},
        {"value": "Ficus religiosa", "label": "Ficus religiosa", "gujaratiName": "પીપળો", "count": 6, "color": "#ffbb78"},
        {"value": "Fugeea Sp", "label": "Flueggea sp.", "gujaratiName": "શીવણી", "count": 1564, "color": "#aec7e8"},
        {"value": "Lannea coromandelica (Houtt.) Merr.", "label": "Lannea coromandelica", "gujaratiName": "મોદડ", "count": 1584, "color": "#bcbd22"},
        {"value": "Leucaena leucocephala", "label": "Leucaena leucocephala", "gujaratiName": "સુબાવળ", "count": 4153, "color": "#7f7f7f"},
        {"value": "Mangifera indica", "label": "Mangifera indica", "gujaratiName": "આંબો", "count": 8968, "color": "#17becf"},
        {"value": "Neltuma juliflora", "aliases": ["Prosopis juliflora"], "label": "Neltuma juliflora", "gujaratiName": "જંગલી બાવળ", "count": 25416, "color": "#8c564b"},
        {"value": "Senegalia senegal", "label": "Senegalia senegal", "gujaratiName": "ઘોરાળ બાવળ", "count": 179313, "color": "#4e79a7"},
        {"value": "Senna cericulata", "label": "Senna auriculata", "gujaratiName": "આવળ", "count": 4014, "color": "#2ca02c"},
        {"value": "Unidentified", "label": "Unidentified", "gujaratiName": "અજ્ઞાત", "count": 23, "color": "#bab0ac"}
    ]'::jsonb
WHERE key = 'treeStatistics';
