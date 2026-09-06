// The 14-theme catalog from the FRD (§1). Enabled themes get a working
// filter/stats UI; the rest are listed but disabled until built.
export interface ThemeDef {
  key: string;
  label: string;
  enabled: boolean;
}

export const THEMES: ThemeDef[] = [
  { key: "forest_cover", label: "Forest Cover", enabled: true },
];
