package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const ctxKeyRoleID contextKey = "role_id"

// RoleIDFromContext reads the role_id injected by Auth.
func RoleIDFromContext(ctx context.Context) (int, bool) {
	v, ok := ctx.Value(ctxKeyRoleID).(int)
	return v, ok
}

// CORS allows a single browser origin to call the API with a Bearer token.
// Takes the origin so a deployment isn't pinned to the dev server's; still
// hand-rolled rather than pulling in a CORS package.
func CORS(origin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Auth validates the Bearer JWT and injects role_id/role_name into the
// request context for downstream handlers to read.
func Auth(jwtSecret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}

			token, err := jwt.Parse(
				strings.TrimPrefix(header, "Bearer "),
				func(t *jwt.Token) (any, error) { return jwtSecret, nil },
				jwt.WithValidMethods([]string{"HS256"}),
			)
			if err != nil || !token.Valid {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			// Fail closed: a signed token with a missing or non-numeric
			// role_id would otherwise pass through as role 0 and be served an
			// empty layer set instead of being rejected.
			roleID, ok := claims["role_id"].(float64)
			if !ok {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), ctxKeyRoleID, int(roleID))

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
