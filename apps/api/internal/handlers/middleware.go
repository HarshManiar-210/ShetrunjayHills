package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	ctxKeyRoleID   contextKey = "role_id"
	ctxKeyRoleName contextKey = "role_name"
)

// RoleIDFromContext reads the role_id injected by Auth.
func RoleIDFromContext(ctx context.Context) (int, bool) {
	v, ok := ctx.Value(ctxKeyRoleID).(int)
	return v, ok
}

// RoleNameFromContext reads the role_name injected by Auth.
func RoleNameFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(ctxKeyRoleName).(string)
	return v, ok
}

// CORS allows the Next.js dev server to call the API with a Bearer token
// from the browser.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
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
				func(t *jwt.Token) (interface{}, error) { return jwtSecret, nil },
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
			roleID, _ := claims["role_id"].(float64)
			roleName, _ := claims["role_name"].(string)

			ctx := context.WithValue(r.Context(), ctxKeyRoleID, int(roleID))
			ctx = context.WithValue(ctx, ctxKeyRoleName, roleName)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
