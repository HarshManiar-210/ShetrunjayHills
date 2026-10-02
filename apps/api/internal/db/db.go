// Package db sets up the pgx connection pool used by internal/repository.
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// How long NewPool keeps retrying the first ping. Compose waits for the
// database to be healthy on `up`, but not when Docker itself restarts both
// containers (Docker Desktop restarting, the machine waking): the API then
// starts beside a Postgres still replaying its WAL, and a single failed ping
// left it exited inside a container that still reported "Up".
const (
	pingTimeout  = 30 * time.Second
	pingInterval = time.Second
)

// NewPool creates and pings a pgx pool against databaseURL, retrying the
// ping for up to pingTimeout while the database finishes starting.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("db: create pool: %w", err)
	}

	deadline := time.Now().Add(pingTimeout)
	for {
		err = pool.Ping(ctx)
		if err == nil {
			return pool, nil
		}
		if time.Now().After(deadline) {
			break
		}
		select {
		case <-ctx.Done():
			pool.Close()
			return nil, fmt.Errorf("db: ping: %w", ctx.Err())
		case <-time.After(pingInterval):
		}
	}

	pool.Close()
	return nil, fmt.Errorf("db: ping: %w", err)
}
