package repository

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TestGetLayersByRoleID_RBAC is an integration test against a real Postgres
// (the docker-compose `postgis` service) — skipped when DATABASE_URL isn't
// set, e.g. in CI environments without the DB container running.
func TestGetLayersByRoleID_RBAC(t *testing.T) {
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

	cases := []struct {
		roleName    string
		wantCount   int
		wantMissing string
	}{
		{"regular_user", 2, "metro_train"},
		{"admin", 3, ""},
		{"support_team", 3, ""},
	}

	for _, tc := range cases {
		t.Run(tc.roleName, func(t *testing.T) {
			var roleID int
			if err := pool.QueryRow(ctx, `SELECT id FROM roles WHERE name = $1`, tc.roleName).Scan(&roleID); err != nil {
				t.Fatalf("look up role id: %v", err)
			}

			layers, err := repo.GetLayersByRoleID(ctx, roleID)
			if err != nil {
				t.Fatalf("GetLayersByRoleID: %v", err)
			}
			if len(layers) != tc.wantCount {
				t.Errorf("len(layers) = %d, want %d", len(layers), tc.wantCount)
			}
			for _, l := range layers {
				if l.GeoJSON == "" {
					t.Errorf("layer %q has empty GeoJSON", l.Name)
				}
				if tc.wantMissing != "" && l.Name == tc.wantMissing {
					t.Errorf("role %q should not see layer %q", tc.roleName, tc.wantMissing)
				}
			}
		})
	}
}
