// Package rasterstats measures how much ground each colour in a classified
// raster covers.
//
// The delivered thematic rasters are cleanly quantised — Forest Cover, LULC
// and Fragmentation each use exactly five colours, Vegetation Change nineteen
// of its twenty-five transition classes — so an exact colour histogram is both
// small and lossless. Photographic rasters (the FCC composites, the drone
// orthomosaic) run to tens of thousands of colours and have no classes to
// count; those are reported as photographic rather than returning a histogram
// nobody can use.
//
// The frontend maps the colours back to class names, because the palettes
// belong to the legend. This package deliberately knows nothing about what any
// colour means.
package rasterstats

import (
	"fmt"
	"image"
	"image/draw"
	_ "image/png" // registers the PNG decoder for image.Decode
	"io"
	"math"
	"sort"
)

// IUGG mean Earth radius, in metres.
const earthRadiusM = 6_371_008.8

// Above this many distinct colours an image is taken to be photographic
// rather than classified. The busiest classified raster delivered uses 19.
const maxClassColors = 64

// A pixel this transparent is padding outside the imagery's footprint, not
// data. The prepared drone rasters are roughly half transparent.
const minOpaqueAlpha = 0x20

// Bounds is a raster's placement, in degrees (EPSG:4326).
type Bounds struct {
	MinLon, MinLat, MaxLon, MaxLat float64
}

// ClassStat is one colour's share of a raster.
type ClassStat struct {
	// Color is upper-case "#RRGGBB" — the frontend matches its legend against it.
	Color   string  `json:"color"`
	Pixels  int64   `json:"pixels"`
	AreaSqM float64 `json:"area_sq_m"`
	// Share of the raster's opaque pixels, 0..1.
	Share float64 `json:"share"`
}

// Stats is the measurement of one raster image.
type Stats struct {
	Width  int `json:"width"`
	Height int `json:"height"`
	// OpaquePixels excludes the transparent padding around the footprint, so
	// this is the imagery's actual coverage.
	OpaquePixels   int64 `json:"opaque_pixels"`
	DistinctColors int   `json:"distinct_colors"`
	// Photographic images carry no classes; Classes is then empty.
	Photographic bool `json:"photographic"`
	// AreaSqM is the ground area of the opaque pixels — the footprint, not the
	// bounding box.
	AreaSqM float64     `json:"area_sq_m"`
	Classes []ClassStat `json:"classes"`
}

// boundsAreaSqM is the ground area of a lat/lon box on the sphere. Exact for a
// spherical Earth: the area between two parallels scales with the difference
// of their sines.
func boundsAreaSqM(b Bounds) float64 {
	dLon := math.Abs(b.MaxLon-b.MinLon) * math.Pi / 180
	dSin := math.Abs(math.Sin(b.MaxLat*math.Pi/180) - math.Sin(b.MinLat*math.Pi/180))
	return earthRadiusM * earthRadiusM * dLon * dSin
}

// asRGBA returns the image as *image.RGBA, converting only when it is not one
// already. Decoded PNGs are usually NRGBA, and one bulk draw is far cheaper
// than calling At() per pixel through the image.Image interface.
func asRGBA(src image.Image) *image.RGBA {
	if rgba, ok := src.(*image.RGBA); ok {
		return rgba
	}
	b := src.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	draw.Draw(dst, dst.Bounds(), src, b.Min, draw.Src)
	return dst
}

// Compute decodes an image and measures each colour's coverage.
//
// Area per pixel is taken as the bounding box's ground area divided by the
// pixel count. The images are EPSG:4326 grids — equal degrees per pixel — so
// ground area per pixel shrinks with the cosine of latitude; but across the
// ~0.06° these rasters span that variation is under 0.1%, far below the
// precision of the placement itself.
func Compute(r io.Reader, b Bounds) (*Stats, error) {
	src, _, err := image.Decode(r)
	if err != nil {
		return nil, fmt.Errorf("rasterstats: decode: %w", err)
	}

	img := asRGBA(src)
	width, height := img.Rect.Dx(), img.Rect.Dy()
	if width == 0 || height == 0 {
		return nil, fmt.Errorf("rasterstats: image has no pixels")
	}

	// Keyed by packed 0xRRGGBB so the map holds an int, not a string, for what
	// can be tens of thousands of entries over tens of millions of pixels.
	counts := make(map[uint32]int64)
	var opaque int64

	for y := 0; y < height; y++ {
		row := img.Pix[y*img.Stride : y*img.Stride+width*4]
		for x := 0; x < width; x++ {
			p := row[x*4 : x*4+4]
			if p[3] < minOpaqueAlpha {
				continue
			}
			opaque++
			counts[uint32(p[0])<<16|uint32(p[1])<<8|uint32(p[2])]++
			// Bail out of the histogram once it is clearly photographic: there
			// is no point filling a map with 36k colours to then discard it.
			if len(counts) > maxClassColors {
				return &Stats{
					Width:          width,
					Height:         height,
					OpaquePixels:   0,
					DistinctColors: len(counts),
					Photographic:   true,
				}, nil
			}
		}
	}

	areaPerPixel := boundsAreaSqM(b) / float64(width*height)

	stats := &Stats{
		Width:          width,
		Height:         height,
		OpaquePixels:   opaque,
		DistinctColors: len(counts),
		AreaSqM:        float64(opaque) * areaPerPixel,
		Classes:        make([]ClassStat, 0, len(counts)),
	}

	for packed, n := range counts {
		share := 0.0
		if opaque > 0 {
			share = float64(n) / float64(opaque)
		}
		stats.Classes = append(stats.Classes, ClassStat{
			Color:   fmt.Sprintf("#%06X", packed),
			Pixels:  n,
			AreaSqM: float64(n) * areaPerPixel,
			Share:   share,
		})
	}

	// Largest first, then by colour so the order is stable between identical
	// runs rather than following Go's randomised map iteration.
	sort.Slice(stats.Classes, func(i, j int) bool {
		if stats.Classes[i].Pixels != stats.Classes[j].Pixels {
			return stats.Classes[i].Pixels > stats.Classes[j].Pixels
		}
		return stats.Classes[i].Color < stats.Classes[j].Color
	})

	return stats, nil
}
