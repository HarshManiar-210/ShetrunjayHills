// Package models holds the DB-backed structs shared across handlers and
// repositories. Rows, not code, define which roles/layers/permissions exist.
package models

import "encoding/json"

type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"`
	RoleID       int    `json:"role_id"`
	// RoleName is populated by queries that join roles; empty otherwise.
	RoleName string `json:"role_name,omitempty"`
}

type Layer struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	GeoJSON string `json:"geometry"`
}

// StaticOverlay is a base-layer/watershed/raster reference asset — its
// FilePath is resolved against DATA_ROOT server-side and never serialized to
// the client; the client fetches the asset itself through OverlayData by Key.
type StaticOverlay struct {
	ID    int    `json:"id"`
	Key   string `json:"key"`
	Label string `json:"label"`
	// GroupID is the layer_groups row this overlay sits under in the sidebar.
	// The frontend assembles the tree from the group list; a layer knows only
	// its own parent.
	GroupID   int    `json:"group_id"`
	AssetType string `json:"asset_type"`
	Kind      string `json:"kind,omitempty"`
	Color     string `json:"color,omitempty"`
	FilePath  string `json:"-"`
	// Status is 'available' or 'pending' — a pending row announces a layer
	// whose data hasn't been delivered yet (no kind/color/file_path).
	Status string `json:"status"`
	// MinLon/MinLat/MaxLon/MaxLat (SW/NE corners) place a raster overlay on
	// the map, and give a vector overlay's extent so the frontend can frame a
	// layer without first downloading its geometry. nil on a 'pending' row,
	// which has no file to describe.
	MinLon *float64 `json:"min_lon,omitempty"`
	MinLat *float64 `json:"min_lat,omitempty"`
	MaxLon *float64 `json:"max_lon,omitempty"`
	MaxLat *float64 `json:"max_lat,omitempty"`
	// ColorField + Categories replace the flat Color above for a layer whose
	// features carry their own class (Forest Cover FSI's density classes,
	// Forest Type FSI's species types): ColorField names the GeoJSON property
	// holding that class, and Categories is that class's value/label/color
	// rows, straight out of the DB. nil/nil for every flat-colour row.
	ColorField string          `json:"color_field,omitempty"`
	Categories json.RawMessage `json:"categories,omitempty"`
	// SizeBytes is the asset's size on disk, filled in by the Overlays
	// handler rather than stored in the DB — statting the file cannot drift
	// out of step with it the way a seeded column would. Lets the frontend
	// warn before someone switches on a layer big enough to stall their tab
	// (the tree survey is ~166 MB) without hardcoding which keys are heavy.
	// 0 for a 'pending' row, which has no file.
	SizeBytes int64 `json:"size_bytes,omitempty"`
	// Tiled reports that the asset is a PMTiles archive rather than a whole
	// GeoJSON file, so the frontend adds it as a vector-tile source and lets
	// MapLibre stream only the current viewport. Derived from the file
	// extension here, not seeded, for the same reason as SizeBytes: it is a
	// fact about the delivered file, and this keeps "which layers are tiled"
	// out of the frontend as a hardcoded key list (CLAUDE.md's invariant).
	Tiled bool `json:"tiled,omitempty"`
}

// LayerGroup is a node in the sidebar's tree. ParentID is nil for a
// top-level heading. Ordering, nesting and labels are all rows, so the
// sidebar's structure changes without touching Go or TypeScript.
type LayerGroup struct {
	ID        int    `json:"id"`
	Key       string `json:"key"`
	Label     string `json:"label"`
	ParentID  *int   `json:"parent_id,omitempty"`
	SortOrder int    `json:"sort_order"`
}
