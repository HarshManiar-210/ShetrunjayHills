package rasterstats

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"math"
	"testing"
)

// A box one degree wide and one degree tall at the equator, which makes the
// expected ground area easy to state independently.
var unitBounds = Bounds{MinLon: 0, MinLat: 0, MaxLon: 1, MaxLat: 1}

func encode(t *testing.T, img image.Image) *bytes.Reader {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return bytes.NewReader(buf.Bytes())
}

// half red, half blue, with a transparent band that must not be counted
func twoClassImage(w, h, transparentRows int) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			switch {
			case y < transparentRows:
				img.Set(x, y, color.RGBA{0, 0, 0, 0})
			case x < w/2:
				img.Set(x, y, color.RGBA{0xFF, 0x00, 0x00, 0xFF})
			default:
				img.Set(x, y, color.RGBA{0x00, 0x00, 0xFF, 0xFF})
			}
		}
	}
	return img
}

func TestComputeCountsClassesAndIgnoresTransparency(t *testing.T) {
	// 100x100, the top 20 rows transparent: 8000 opaque pixels, split evenly.
	stats, err := Compute(encode(t, twoClassImage(100, 100, 20)), unitBounds)
	if err != nil {
		t.Fatalf("Compute: %v", err)
	}

	if stats.Photographic {
		t.Error("two-colour image reported as photographic")
	}
	if stats.DistinctColors != 2 {
		t.Errorf("distinct colours = %d, want 2", stats.DistinctColors)
	}
	if stats.OpaquePixels != 8000 {
		t.Errorf("opaque pixels = %d, want 8000 (transparent rows must not count)", stats.OpaquePixels)
	}
	if len(stats.Classes) != 2 {
		t.Fatalf("len(classes) = %d, want 2", len(stats.Classes))
	}

	for _, cls := range stats.Classes {
		if cls.Pixels != 4000 {
			t.Errorf("%s pixels = %d, want 4000", cls.Color, cls.Pixels)
		}
		if math.Abs(cls.Share-0.5) > 1e-9 {
			t.Errorf("%s share = %v, want 0.5", cls.Color, cls.Share)
		}
	}

	// Colours are reported as upper-case #RRGGBB for the frontend to match on.
	got := map[string]bool{stats.Classes[0].Color: true, stats.Classes[1].Color: true}
	for _, want := range []string{"#FF0000", "#0000FF"} {
		if !got[want] {
			t.Errorf("missing colour %s, got %v", want, got)
		}
	}
}

func TestComputeAreaFollowsTheFootprintNotTheBoundingBox(t *testing.T) {
	stats, err := Compute(encode(t, twoClassImage(100, 100, 20)), unitBounds)
	if err != nil {
		t.Fatalf("Compute: %v", err)
	}

	// One degree square at the equator, by the spherical zone formula.
	boxArea := boundsAreaSqM(unitBounds)
	// 80% of the grid is opaque, so the measured footprint must be 80% of it.
	wantArea := boxArea * 0.8
	if rel := math.Abs(stats.AreaSqM-wantArea) / wantArea; rel > 1e-9 {
		t.Errorf("area = %.0f m², want %.0f m² (the opaque footprint, not the box)", stats.AreaSqM, wantArea)
	}

	var classSum float64
	for _, cls := range stats.Classes {
		classSum += cls.AreaSqM
	}
	if rel := math.Abs(classSum-stats.AreaSqM) / stats.AreaSqM; rel > 1e-9 {
		t.Errorf("class areas sum to %.0f m², want the footprint's %.0f m²", classSum, stats.AreaSqM)
	}
}

func TestComputeFlagsPhotographicImages(t *testing.T) {
	// A gradient with far more colours than any classified raster uses.
	img := image.NewRGBA(image.Rect(0, 0, 200, 200))
	for y := 0; y < 200; y++ {
		for x := 0; x < 200; x++ {
			img.Set(x, y, color.RGBA{uint8(x), uint8(y), 0x40, 0xFF})
		}
	}

	stats, err := Compute(encode(t, img), unitBounds)
	if err != nil {
		t.Fatalf("Compute: %v", err)
	}
	if !stats.Photographic {
		t.Fatal("gradient not reported as photographic")
	}
	if len(stats.Classes) != 0 {
		t.Errorf("photographic image returned %d classes, want none", len(stats.Classes))
	}
}

func TestBoundsAreaMatchesTheSphericalZoneFormula(t *testing.T) {
	// The whole sphere: lon -180..180, lat -90..90.
	whole := boundsAreaSqM(Bounds{MinLon: -180, MinLat: -90, MaxLon: 180, MaxLat: 90})
	want := 4 * math.Pi * earthRadiusM * earthRadiusM
	if rel := math.Abs(whole-want) / want; rel > 1e-12 {
		t.Errorf("whole-sphere area = %.0f, want 4πR² = %.0f", whole, want)
	}

	// A band near the pole covers far less ground than the same span of
	// latitude at the equator — the property that makes sin(φ) the right term.
	equator := boundsAreaSqM(Bounds{MinLon: 0, MinLat: 0, MaxLon: 1, MaxLat: 1})
	polar := boundsAreaSqM(Bounds{MinLon: 0, MinLat: 80, MaxLon: 1, MaxLat: 81})
	if polar >= equator {
		t.Errorf("polar band %.0f is not smaller than the equatorial one %.0f", polar, equator)
	}
}
