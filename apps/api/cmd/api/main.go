package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/db"
	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/handlers"
	"github.com/HarshManiar-210/ShetrunjayHills/apps/api/internal/repository"
)

// pinger is the subset of *repository.Repository the healthz handler needs,
// kept as an interface so the handler can be tested without a live DB.
type pinger interface {
	Ping(ctx context.Context) error
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://shetrunjay:shetrunjay@localhost:5433/shetrunjay"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	// No default: a built-in fallback means any deployment that forgets to set
	// this accepts tokens forged with a secret that's public in this repo.
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET must be set")
	}
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}
	// Root static overlay file_path values (e.g. "vector-data/Roads.geojson")
	// resolve against. Compose mounts vector-data/raster-data at /data/* and
	// sets DATA_ROOT=/data; the default assumes `go run`/`go test` from
	// apps/api against a repo checkout, where both live under ../../apps.
	dataRoot := os.Getenv("DATA_ROOT")
	if dataRoot == "" {
		dataRoot = "../../apps"
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.NewPool(ctx, databaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	repo := repository.New(pool)

	r := chi.NewRouter()
	r.Use(handlers.CORS(corsOrigin))
	// Ahead of every route: the overlay GeoJSON files are the bulk of what
	// this API serves and compress several times over, so the download is
	// what a layer switch mostly waits on.
	r.Use(handlers.Gzip)
	r.Get("/healthz", healthzHandler(repo))
	r.Post("/api/login", handlers.Login(repo, []byte(jwtSecret)))

	// Everything that the frontend itself fetches (and so can attach a
	// Bearer token to) requires a logged-in user — RequireLogin rejects a
	// missing or invalid token with 401 rather than falling back to a
	// public role.
	r.Group(func(r chi.Router) {
		r.Use(handlers.RequireLogin([]byte(jwtSecret)))
		r.Get("/api/layer-groups", handlers.LayerGroups(repo))
		r.Get("/api/smc-stats", handlers.SmcStats(repo))
		r.Get("/api/overlays", handlers.Overlays(repo, dataRoot))
		r.Get("/api/overlays/{key}/stats", handlers.OverlayStats(repo, dataRoot))
		r.Get("/api/layers", handlers.Layers(repo))
	})

	// The one exception: overlay bytes (GeoJSON/raster/pmtiles) are handed
	// to MapLibre as a bare URL, not fetched by our own code, specifically
	// so the fetch, JSON parse and tile indexing run off the main thread —
	// see Map.tsx. MapLibre's own fetch carries no Authorization header, so
	// gating this one on the same Bearer token would 401 every layer for a
	// logged-in user too. Left open until that's solved properly (a
	// same-site session cookie, most likely) rather than gated in a way
	// that just breaks the map.
	r.Get("/api/overlays/{key}/data", handlers.OverlayData(repo, dataRoot))

	srv := &http.Server{Addr: ":" + port, Handler: r}

	go func() {
		log.Printf("listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func healthzHandler(p pinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := p.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("db unreachable"))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}
}
