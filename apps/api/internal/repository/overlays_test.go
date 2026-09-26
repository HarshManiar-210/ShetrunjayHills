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

// TestOverlayClassStats checks the delivered statistics come back in API
// units, and that GetStaticOverlays flags which overlays have them.
func TestOverlayClassStats(t *testing.T) {
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

	stats, err := repo.GetOverlayClassStats(ctx, "forestCoverFSI")
	if err != nil {
		t.Fatalf("GetOverlayClassStats: %v", err)
	}
	if len(stats) == 0 {
		t.Fatal("expected delivered statistics for forestCoverFSI, got none")
	}
	var share float64
	for _, s := range stats {
		share += s.Share
	}
	if share < 0.99 || share > 1.01 {
		t.Errorf("shares sum to %v, want ~1", share)
	}

	none, err := repo.GetOverlayClassStats(ctx, "does_not_exist")
	if err != nil || len(none) != 0 {
		t.Errorf("unknown key: got %d rows, err %v; want none, nil", len(none), err)
	}

	overlays, err := repo.GetStaticOverlays(ctx)
	if err != nil {
		t.Fatalf("GetStaticOverlays: %v", err)
	}
	for _, o := range overlays {
		if o.Key == "forestCoverFSI" && !o.HasStats {
			t.Error("forestCoverFSI: HasStats = false, want true")
		}
		if o.Key == "roads" && o.HasStats {
			t.Error("roads: HasStats = true, want false")
		}
	}
}
