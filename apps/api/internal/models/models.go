// Package models holds the DB-backed structs shared across handlers and
// repositories. Rows, not code, define which roles/layers/permissions exist.
package models

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
	ID        int      `json:"id"`
	Key       string   `json:"key"`
	Label     string   `json:"label"`
	Section   string   `json:"section"`
	AssetType string   `json:"asset_type"`
	Kind      string   `json:"kind,omitempty"`
	Color     string   `json:"color,omitempty"`
	FilePath  string   `json:"-"`
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
	// SizeBytes is the asset's size on disk, filled in by the Overlays
	// handler rather than stored in the DB — statting the file cannot drift
	// out of step with it the way a seeded column would. Lets the frontend
	// warn before someone switches on a layer big enough to stall their tab
	// (the tree survey is ~166 MB) without hardcoding which keys are heavy.
	// 0 for a 'pending' row, which has no file.
	SizeBytes int64 `json:"size_bytes,omitempty"`
}
