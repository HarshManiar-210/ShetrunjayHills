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
	ID        int    `json:"id"`
	Key       string `json:"key"`
	Label     string `json:"label"`
	Section   string `json:"section"`
	AssetType string `json:"asset_type"`
	Kind      string `json:"kind,omitempty"`
	Color     string `json:"color,omitempty"`
	FilePath  string `json:"-"`
}
