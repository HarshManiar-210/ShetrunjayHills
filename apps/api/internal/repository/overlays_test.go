package repository

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TestStaticOverlays is an integration test against a real Postgres (the
// docker-compose `postgis` service) — skipped when DATABASE_URL isn't set.
func TestStaticOverlays(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set; skipping repository integration test")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	repo := New(pool)

	overlays, err := repo.GetStaticOverlays(ctx)
	if err != nil {
		t.Fatalf("GetStaticOverlays: %v", err)
	}
	if len(overlays) == 0 {
		t.Fatal("expected seeded static overlays, got none")
	}
	for _, o := range overlays {
		if o.FilePath != "" {
			t.Errorf("overlay %q: FilePath leaked from GetStaticOverlays, want empty", o.Key)
		}
	}

	path, err := repo.GetStaticOverlayFilePath(ctx, "roads")
	if err != nil {
		t.Fatalf("GetStaticOverlayFilePath(roads): %v", err)
	}
	if path != "vector-data/Roads.geojson" {
		t.Errorf("path = %q, want vector-data/Roads.geojson", path)
	}

	if _, err := repo.GetStaticOverlayFilePath(ctx, "does_not_exist"); !errors.Is(err, pgx.ErrNoRows) {
		t.Errorf("err = %v, want pgx.ErrNoRows", err)
	}
}
