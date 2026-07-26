package repository

import (
	"context"
	"fmt"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/models"
)

// GetUserByUsername looks up a user and their role name for auth. Returns
// pgx.ErrNoRows (wrapped) when no such username exists.
func (r *Repository) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	var u models.User

	err := r.pool.QueryRow(ctx, `
		SELECT users.id, users.username, users.password_hash, users.role_id, roles.name
		FROM users
		JOIN roles ON roles.id = users.role_id
		WHERE users.username = $1
	`, username).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.RoleID, &u.RoleName)
	if err != nil {
		return nil, fmt.Errorf("repository: get user by username: %w", err)
	}

	return &u, nil
}
