// Package repository is the sole DB access layer — handlers never issue raw
// SQL, they call into a Repository method instead.
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Ping reports whether the underlying DB connection is alive.
func (r *Repository) Ping(ctx context.Context) error {
	return r.pool.Ping(ctx)
}
