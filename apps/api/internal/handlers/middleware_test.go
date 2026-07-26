package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

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
	validToken := signToken(t, secret, jwt.MapClaims{"role_id": float64(2), "role_name": "admin"})
	wrongSecretToken := signToken(t, []byte("other-secret"), jwt.MapClaims{"role_id": float64(2), "role_name": "admin"})

	cases := []struct {
		name   string
		header string
		want   int
	}{
		{"missing header", "", http.StatusUnauthorized},
		{"not bearer", "Token abc", http.StatusUnauthorized},
		{"invalid token", "Bearer not-a-jwt", http.StatusUnauthorized},
		{"wrong secret", "Bearer " + wrongSecretToken, http.StatusUnauthorized},
		{"valid token", "Bearer " + validToken, http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var gotRoleID int
			var gotRoleName string
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				gotRoleID, _ = RoleIDFromContext(r.Context())
				gotRoleName, _ = RoleNameFromContext(r.Context())
				w.WriteHeader(http.StatusOK)
			})

			req := httptest.NewRequest(http.MethodGet, "/protected", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			w := httptest.NewRecorder()

			Auth(secret)(next).ServeHTTP(w, req)

			if w.Code != tc.want {
				t.Fatalf("status = %d, want %d", w.Code, tc.want)
			}
			if tc.want == http.StatusOK {
				if gotRoleID != 2 || gotRoleName != "admin" {
					t.Errorf("context = (%d, %q), want (2, %q)", gotRoleID, gotRoleName, "admin")
				}
			}
		})
	}
}
