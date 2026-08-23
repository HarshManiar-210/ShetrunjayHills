// The 14-theme catalog from the FRD (§1). Enabled themes get a working
// filter/stats UI; the rest are listed but disabled until built.
export interface ThemeDef {
  key: string;
  label: string;
  enabled: boolean;
}

export const THEMES: ThemeDef[] = [
  { key: "forest_cover", label: "Forest Cover", enabled: true },
  { key: "forest_type", label: "Forest Type", enabled: false },
  { key: "vegetation_change", label: "Vegetation Change", enabled: false },
  { key: "fragmentation", label: "Fragmentation", enabled: false },
  { key: "lulc", label: "LULC", enabled: false },
  { key: "forest_status", label: "Forest Status", enabled: false },
  { key: "cadastral_map", label: "Cadastral Map", enabled: false },
  { key: "tree_count", label: "Tree Count", enabled: false },
  { key: "tree_species", label: "Tree Species", enabled: false },
  { key: "tree_height", label: "Tree Height Classification", enabled: false },
  { key: "watershed", label: "Watershed", enabled: false },
  { key: "wildlife_corridor", label: "Wildlife Corridor", enabled: false },
  { key: "habitat_suitability", label: "Habitat Suitability Model", enabled: false },
  { key: "carbon_stock", label: "Carbon Stock", enabled: false },
];
