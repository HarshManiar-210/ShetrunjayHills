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
