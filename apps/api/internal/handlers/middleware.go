package handlers

import (
	"compress/gzip"
	"context"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"

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
			// Range/Accept-Ranges: the pmtiles client reads a tile archive
			// with Range requests and needs to see the 206's range headers
			// back. Range is safelisted in newer browsers but not all, and
			// Content-Range is never exposed unless asked for.
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Range")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Auth validates the Bearer JWT and injects role_id/role_name into the
// request context for downstream handlers to read. A request with no
// Authorization header at all is anonymous, not invalid — it's injected
// with publicRoleID instead of being rejected. A header that IS present but
// malformed, expired, or wrongly signed still fails closed with 401: that's
// a failed auth attempt, not the "no token" case.
func Auth(jwtSecret []byte, publicRoleID int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				ctx := context.WithValue(r.Context(), ctxKeyRoleID, publicRoleID)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
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

// Overlay GeoJSON is the heaviest thing this API serves — the Streams and
// Watersheds files are tens of megabytes of ASCII coordinates, and the tree
// survey is far larger still. Uncompressed, the download dominates the time
// between flipping a switch and seeing the layer; gzipped, those same files
// go over the wire several times smaller. Hand-rolled for the same reason
// CORS above is: it is a small, well-understood amount of code, and the
// alternative is a dependency for it.
//
// BestSpeed rather than the default level: on text this size the cheapest
// level already gets most of the ratio, and the levels above it cost more
// server CPU per request than they save the client in transfer.
var gzipWriterPool = sync.Pool{
	New: func() any {
		w, _ := gzip.NewWriterLevel(io.Discard, gzip.BestSpeed)
		return w
	},
}

// compressible reports whether a response body is worth gzipping. The PNG
// rasters this API also serves are already compressed — running them through
// gzip burns CPU to make them very slightly bigger.
func compressible(contentType string) bool {
	mediaType, _, _ := strings.Cut(contentType, ";")
	mediaType = strings.ToLower(strings.TrimSpace(mediaType))
	if strings.HasPrefix(mediaType, "text/") {
		return true
	}
	switch mediaType {
	case "application/json", "application/geo+json", "application/javascript", "image/svg+xml":
		return true
	}
	return false
}

// acceptsGzip parses Accept-Encoding far enough to tell an offer of gzip from
// an explicit refusal of it ("gzip;q=0"), which is the only weight that
// changes the answer here.
func acceptsGzip(header string) bool {
	for _, part := range strings.Split(header, ",") {
		token, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		if !strings.EqualFold(strings.TrimSpace(token), "gzip") {
			continue
		}
		for _, param := range strings.Split(params, ";") {
			key, value, ok := strings.Cut(strings.TrimSpace(param), "=")
			if !ok || !strings.EqualFold(strings.TrimSpace(key), "q") {
				continue
			}
			if weight, err := strconv.ParseFloat(strings.TrimSpace(value), 64); err == nil && weight == 0 {
				return false
			}
		}
		return true
	}
	return false
}

// gzipResponseWriter decides whether to compress at WriteHeader time rather
// than up front, because the thing that decides it — Content-Type — is set by
// the handler (or, for a file, sniffed by http.ServeFile) and isn't known
// when the middleware wraps the writer.
type gzipResponseWriter struct {
	http.ResponseWriter
	gz          *gzip.Writer
	wroteHeader bool
	compressing bool
}

func (w *gzipResponseWriter) WriteHeader(status int) {
	if w.wroteHeader {
		return
	}
	w.wroteHeader = true

	// 204 and 304 carry no body to encode, and a body that already has an
	// encoding must not be wrapped in a second one.
	bodyless := status == http.StatusNoContent || status == http.StatusNotModified
	if bodyless || w.Header().Get("Content-Encoding") != "" || !compressible(w.Header().Get("Content-Type")) {
		w.ResponseWriter.WriteHeader(status)
		return
	}

	w.compressing = true
	w.Header().Set("Content-Encoding", "gzip")
	// The encoded length isn't known until the body has been written, and
	// http.ServeFile has already set the *un*encoded one — left in place it
	// would truncate the response at the client.
	w.Header().Del("Content-Length")
	// Byte offsets into the compressed stream are not the offsets a range
	// request over the plain file asked for, so stop advertising range
	// support on a response we are about to encode.
	w.Header().Del("Accept-Ranges")

	w.gz = gzipWriterPool.Get().(*gzip.Writer)
	w.gz.Reset(w.ResponseWriter)
	w.ResponseWriter.WriteHeader(status)
}

func (w *gzipResponseWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	if w.compressing {
		return w.gz.Write(b)
	}
	return w.ResponseWriter.Write(b)
}

// Flush keeps http.Flusher working through the wrapper — without it a
// streaming handler's writes would sit in the gzip window indefinitely.
func (w *gzipResponseWriter) Flush() {
	if w.compressing {
		w.gz.Flush()
	}
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// close finishes the gzip stream (writing its trailer) and returns the writer
// to the pool. Called via defer in Gzip, so it runs even if the handler panics.
func (w *gzipResponseWriter) close() {
	if w.gz == nil {
		return
	}
	w.gz.Close()
	gzipWriterPool.Put(w.gz)
	w.gz = nil
}

// Gzip compresses text and JSON responses for clients that accept it.
func Gzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set unconditionally, including on the pass-through paths below: a
		// cache that stored an uncompressed response must not later hand it
		// to a client that asked for gzip, or the reverse.
		w.Header().Add("Vary", "Accept-Encoding")

		// A range request asks for byte offsets into the file as it is on
		// disk; encoding the body would make those offsets mean something
		// else, so those responses are served as-is.
		if !acceptsGzip(r.Header.Get("Accept-Encoding")) || r.Header.Get("Range") != "" {
			next.ServeHTTP(w, r)
			return
		}

		gw := &gzipResponseWriter{ResponseWriter: w}
		defer gw.close()
		next.ServeHTTP(gw, r)
	})
}
