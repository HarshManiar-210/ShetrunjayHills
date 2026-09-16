package handlers

import (
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func signToken(t *testing.T, secret []byte, claims jwt.MapClaims) string {
	t.Helper()
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

func TestAuth(t *testing.T) {
	secret := []byte("test-secret")
	const publicRoleID = 4
	validToken := signToken(t, secret, jwt.MapClaims{"role_id": float64(2), "role_name": "admin"})
	wrongSecretToken := signToken(t, []byte("other-secret"), jwt.MapClaims{"role_id": float64(2), "role_name": "admin"})
	noRoleToken := signToken(t, secret, jwt.MapClaims{"role_name": "admin"})
	stringRoleToken := signToken(t, secret, jwt.MapClaims{"role_id": "2"})
	expiredToken := signToken(t, secret, jwt.MapClaims{
		"role_id": float64(2),
		"exp":     time.Now().Add(-time.Hour).Unix(),
	})

	cases := []struct {
		name        string
		header      string
		want        int
		wantRoleID  int
		checkRoleID bool
	}{
		// No Authorization header at all is anonymous, not invalid — it
		// resolves to the public role rather than failing.
		{"missing header", "", http.StatusOK, publicRoleID, true},
		{"not bearer", "Token abc", http.StatusUnauthorized, 0, false},
		{"invalid token", "Bearer not-a-jwt", http.StatusUnauthorized, 0, false},
		{"wrong secret", "Bearer " + wrongSecretToken, http.StatusUnauthorized, 0, false},
		{"expired token", "Bearer " + expiredToken, http.StatusUnauthorized, 0, false},
		// Signed by us, but no usable role — must not fall through as role 0.
		{"missing role_id claim", "Bearer " + noRoleToken, http.StatusUnauthorized, 0, false},
		{"non-numeric role_id claim", "Bearer " + stringRoleToken, http.StatusUnauthorized, 0, false},
		{"valid token", "Bearer " + validToken, http.StatusOK, 2, true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var gotRoleID int
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				gotRoleID, _ = RoleIDFromContext(r.Context())
				w.WriteHeader(http.StatusOK)
			})

			req := httptest.NewRequest(http.MethodGet, "/protected", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			w := httptest.NewRecorder()

			Auth(secret, publicRoleID)(next).ServeHTTP(w, req)

			if w.Code != tc.want {
				t.Fatalf("status = %d, want %d", w.Code, tc.want)
			}
			if tc.checkRoleID && gotRoleID != tc.wantRoleID {
				t.Errorf("role_id in context = %d, want %d", gotRoleID, tc.wantRoleID)
			}
		})
	}
}

func TestCORS(t *testing.T) {
	reached := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reached = true
		w.WriteHeader(http.StatusOK)
	})
	handler := CORS("https://gis.example.com")(next)

	t.Run("echoes the configured origin", func(t *testing.T) {
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/layers", nil))

		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://gis.example.com" {
			t.Errorf("allow-origin = %q, want the configured origin", got)
		}
		if !reached {
			t.Error("next handler not reached on a normal request")
		}
	})

	t.Run("preflight short-circuits", func(t *testing.T) {
		reached = false
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, httptest.NewRequest(http.MethodOptions, "/api/layers", nil))

		if w.Code != http.StatusNoContent {
			t.Errorf("status = %d, want %d", w.Code, http.StatusNoContent)
		}
		if reached {
			t.Error("preflight reached the next handler; it should short-circuit")
		}
	})
}

// jsonBody is a handler that writes `body` as JSON — the shape of every
// compressible response this API actually serves.
func jsonBody(body string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/geo+json")
		w.Write([]byte(body))
	})
}

func TestGzipCompressesJSON(t *testing.T) {
	// Repetitive like real GeoJSON, so a failure to compress is unambiguous.
	body := strings.Repeat(`{"type":"Feature","properties":{},"geometry":null},`, 200)

	req := httptest.NewRequest(http.MethodGet, "/api/overlays/roads/data", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()

	Gzip(jsonBody(body)).ServeHTTP(rec, req)

	res := rec.Result()
	if got := res.Header.Get("Content-Encoding"); got != "gzip" {
		t.Fatalf("Content-Encoding = %q, want gzip", got)
	}
	if got := res.Header.Get("Vary"); got != "Accept-Encoding" {
		t.Errorf("Vary = %q, want Accept-Encoding", got)
	}
	// A stale Content-Length describing the *uncompressed* body would
	// truncate the response at the client.
	if got := res.Header.Get("Content-Length"); got != "" {
		t.Errorf("Content-Length = %q on an encoded body, want it dropped", got)
	}

	if rec.Body.Len() >= len(body) {
		t.Errorf("encoded body is %d bytes, not smaller than the %d-byte original", rec.Body.Len(), len(body))
	}

	zr, err := gzip.NewReader(rec.Body)
	if err != nil {
		t.Fatalf("body is not a gzip stream: %v", err)
	}
	got, err := io.ReadAll(zr)
	if err != nil {
		t.Fatalf("read gzip body: %v", err)
	}
	if string(got) != body {
		t.Error("decompressed body does not round-trip to the original")
	}
}

func TestGzipPassesThrough(t *testing.T) {
	body := strings.Repeat("x", 4096)

	tests := []struct {
		name        string
		acceptEnc   string
		rangeHeader string
		contentType string
	}{
		// A client that never offered gzip must not be sent it.
		{name: "no accept-encoding", contentType: "application/geo+json"},
		{name: "gzip refused", acceptEnc: "gzip;q=0", contentType: "application/geo+json"},
		// PNG rasters are already compressed — gzip would only cost CPU.
		{name: "already-compressed type", acceptEnc: "gzip", contentType: "image/png"},
		// Encoding a body invalidates the byte offsets a range request asked for.
		{name: "range request", acceptEnc: "gzip", rangeHeader: "bytes=0-99", contentType: "application/geo+json"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/overlays/ortho/data", nil)
			if tt.acceptEnc != "" {
				req.Header.Set("Accept-Encoding", tt.acceptEnc)
			}
			if tt.rangeHeader != "" {
				req.Header.Set("Range", tt.rangeHeader)
			}
			rec := httptest.NewRecorder()

			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", tt.contentType)
				w.Write([]byte(body))
			})
			Gzip(next).ServeHTTP(rec, req)

			res := rec.Result()
			if got := res.Header.Get("Content-Encoding"); got != "" {
				t.Errorf("Content-Encoding = %q, want none", got)
			}
			if rec.Body.String() != body {
				t.Error("body was altered on a pass-through response")
			}
			// Set even when nothing was compressed: a cache must not hand an
			// uncompressed hit to a client that did ask for gzip.
			if got := res.Header.Get("Vary"); got != "Accept-Encoding" {
				t.Errorf("Vary = %q, want Accept-Encoding", got)
			}
		})
	}
}

func TestGzipLeavesBodylessResponsesAlone(t *testing.T) {
	// A 304 has no body to encode, and ServeFile answers a repeat request for
	// an unchanged overlay file with exactly this.
	req := httptest.NewRequest(http.MethodGet, "/api/overlays/roads/data", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()

	Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/geo+json")
		w.WriteHeader(http.StatusNotModified)
	})).ServeHTTP(rec, req)

	if got := rec.Result().Header.Get("Content-Encoding"); got != "" {
		t.Errorf("Content-Encoding = %q on a 304, want none", got)
	}
	if rec.Body.Len() != 0 {
		t.Errorf("304 carried a %d-byte body", rec.Body.Len())
	}
}
