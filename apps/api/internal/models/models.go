// Package models holds the DB-backed structs shared across handlers and
// repositories. Rows, not code, define which roles/layers/permissions exist.
package models

type Role struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"`
	RoleID       int    `json:"role_id"`
}

type Layer struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	GeoJSON string `json:"geometry"`
}

type Permission struct {
	RoleID  int `json:"role_id"`
	LayerID int `json:"layer_id"`
}
