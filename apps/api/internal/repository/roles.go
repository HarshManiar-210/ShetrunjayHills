package repository

import (
	"context"
	"fmt"
)

// GetRoleIDByName resolves a role's id from its name — used at startup to
// pin down which row represents the anonymous/no-token role, so the auth
// middleware never hardcodes a role id.
func (r *Repository) GetRoleIDByName(ctx context.Context, name string) (int, error) {
	var id int
	err := r.pool.QueryRow(ctx, `SELECT id FROM roles WHERE name = $1`, name).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("repository: get role id by name: %w", err)
	}
	return id, nil
}
