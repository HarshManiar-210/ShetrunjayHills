package handlers

import (
	"net/http"
	"net/http/httptest"
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
