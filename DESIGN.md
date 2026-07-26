# Shetrunjay Earth — Design System

Inspired by ArcGIS Pro, Apple Maps, Linear, Notion, Google Earth, National Geographic.

The overall feeling should be:

> Calm • Natural • Professional • Spacious • Research-grade

## How to read this document

Every section is tagged so nobody has to guess what is real:

| Tag | Meaning |
| --- | --- |
| **[now]** | Describes or corrects something that exists in `apps/web` today |
| **[next]** | Designed, not built. Safe to build against this spec |
| **[later]** | Deliberately deferred — do not build until the trigger listed is hit |

Current reality, so the spec below is read against it: the app is one map page plus a login
page, styled with the stock shadcn neutral palette (`apps/web/app/globals.css`), rendering
three seeded layers (`city_border`, `roads`, `metro_train`) over Ahmedabad mock geometry on a
flat grey canvas. There is no sidebar, no legend, no command palette. Everything green in this
document is still ahead of us.

---

# 1. Colour

## Primary palette **[next]**

Muted forest tones, not saturated greens. Values are given in both hex (for reference and for
map styling) and oklch (for the CSS variables, matching the existing file's format).

| Token | Light | Dark |
| --- | --- | --- |
| Primary | `#2D5A3A` `oklch(0.426 0.073 151.6)` | `#79C08A` `oklch(0.746 0.106 150.8)` |
| Primary foreground | `#FFFFFF` | `#121513` |
| Secondary | `#5E7C5A` `oklch(0.553 0.062 141.7)` | `#93B88E` `oklch(0.744 0.072 141.7)` |
| Accent | `#C98C3B` `oklch(0.686 0.121 70.7)` | `#E1A652` `oklch(0.765 0.122 73.7)` |
| Accent foreground | `#1D2A23` | `#121513` |
| Background | `#F8F8F5` `oklch(0.978 0.004 106.5)` | `#121513` `oklch(0.192 0.006 156.6)` |
| Card / popover | `#FFFFFF` `oklch(1 0 0)` | `#1A1F1C` `oklch(0.233 0.009 159.3)` |
| Muted | `#EEF2EC` `oklch(0.956 0.009 134.9)` | `#242B27` `oklch(0.281 0.012 160.5)` |
| Border / input | `#DFE5DE` `oklch(0.915 0.011 141.3)` | `#313833` `oklch(0.332 0.013 154.6)` |
| Foreground | `#1D2A23` `oklch(0.270 0.022 160.9)` | `#F5F7F6` `oklch(0.974 0.002 165.1)` |
| Muted foreground | `#636C65` `oklch(0.521 0.015 152.3)` | `#AAB4AE` `oklch(0.760 0.014 159.8)` |
| Destructive (UI) | `#C03B3B` `oklch(0.548 0.170 24.7)` | `#E36868` `oklch(0.672 0.166 22.0)` |

Three values differ from the first draft, each for a measured reason:

- **Muted foreground light was `#6E776F`.** It scored 4.36:1 on the background and 4.09:1 on
  muted surfaces — under the 4.5:1 AA floor for body text, which is exactly where secondary
  text lives. `#636C65` clears it everywhere (5.11 / 5.44 / 4.80).
- **Destructive UI is `#C03B3B`, not `#D64545`.** White on `#D64545` is 4.38:1 — a destructive
  button's label would fail AA. `#D64545` stays as the *map* colour for restricted areas, where
  it is a fill and not a text background.
- **Accent never carries white text.** White on `#C98C3B` is 2.88:1. Amber buttons and badges
  use the ink foreground (`#1D2A23`, 5.18:1). If a design calls for white-on-amber, the answer
  is to use primary green instead.

The amber accent stays intentional: roads, selected layers, hover states, warnings, highlighted
features. It never competes with the greens used for ecological layers because nothing
ecological is ever amber.

## Applying it **[next]**

Do not invent a parallel token vocabulary. `globals.css` already defines the shadcn token set
under `:root` / `.dark` and maps it into Tailwind via `@theme inline`; this palette replaces
those values in place. `bg-card`, `text-muted-foreground`, `border-border` keep working, they
just stop being grey.

```css
/* apps/web/app/globals.css — replace the values inside :root and .dark */
:root {
  --background: oklch(0.978 0.004 106.5);
  --foreground: oklch(0.270 0.022 160.9);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.270 0.022 160.9);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.270 0.022 160.9);
  --primary: oklch(0.426 0.073 151.6);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.553 0.062 141.7);
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.956 0.009 134.9);
  --muted-foreground: oklch(0.521 0.015 152.3);
  --accent: oklch(0.686 0.121 70.7);
  --accent-foreground: oklch(0.270 0.022 160.9);
  --destructive: oklch(0.548 0.170 24.7);
  --border: oklch(0.915 0.011 141.3);
  --input: oklch(0.915 0.011 141.3);
  --ring: oklch(0.426 0.073 151.6);
  --sidebar: oklch(0.956 0.009 134.9);   /* muted — one step behind cards */
  --radius: 0.75rem;
}
```

The `.dark` block mirrors it with the dark column. `--sidebar` sits on muted rather than card so
the panel reads as *behind* the floating cards, which is the hierarchy the component section
assumes.

Two things to delete while in there: `--chart-1..5` (nothing charts yet — add them back with
real values when something does) and the leftover violet `--sidebar-primary` in `.dark`, which
belongs to no palette we own.

---

# 2. GIS layer colour

## The colours **[next]**

| Layer | Colour | Status |
| --- | --- | --- |
| `city_border` | `#2D7D46` | seeded today |
| `roads` | `#D18B2A` | seeded today |
| `metro_train` | `#356AE6` | seeded today |
| Forest boundary | `#2D7D46` | reserved |
| Protected area | `#5AA469` | reserved |
| Rivers | `#4C8ED9` | reserved |
| Wildlife zones | `#9B6ED8` | reserved |
| Villages | `#C56E54` | reserved |
| Restricted area | `#D64545` | reserved |

Both greens are deliberate duplicates: `city_border` is the "administrative outline" role that a
forest boundary will inherit when real data replaces the Ahmedabad mocks.

## Where the colours live **[next]** — this is the important part

`apps/web/components/Map.tsx` currently picks line colour with a MapLibre `match` expression on
`["get", "name"]`, hardcoding the strings `"roads"` and `"metro_train"`. That is the exact thing
`CLAUDE.md` forbids: adding a layer today means editing a React component. A design system that
standardises colours in a markdown table and leaves them in a switch statement has standardised
nothing.

Layer styling is data. Add the columns to `layers`, seed them, return them as feature
properties, and let MapLibre read them:

```sql
-- infra/postgis-init/init.sql
ALTER TABLE layers
  ADD COLUMN color       TEXT NOT NULL DEFAULT '#6B7280',
  ADD COLUMN fill_opacity REAL NOT NULL DEFAULT 0.25;
```

```ts
// Map.tsx — no layer names in code
paint: { "line-color": ["get", "color"], "line-width": 3 }
```

The repository already serialises geometry via `ST_AsGeoJSON`; `color` rides along in the
feature's `properties`. Adding "rivers" then becomes one `INSERT`, which is the whole point of
the RBAC design.

## Rendering rules **[next]**

- **Every line gets a casing.** Amber roads on a light basemap measure 2.24:1 — invisible at a
  glance. Draw each line twice: a 5px casing in the surface colour under a 3px stroke in the
  layer colour. This is the standard cartographic fix and it makes every layer legible on both
  themes without touching the palette.
- **Selected feature**: accent amber, stroke width +2, no colour change to the fill. Selection
  is a weight change, not a hue change, so the layer stays identifiable while selected.
- **Hover**: `fill-opacity` +0.15, cursor `pointer`. Nothing moves.
- **Polygon fills** stay at 0.25 opacity so overlapping layers stack readably up to three deep.

---

# 3. The map surface

## Basemap **[now / next]**

The blank canvas stays — no basemap tiles, just GeoJSON on a flat surface. Its colour becomes
theme-aware: `#EDEDE8` in light, `#0E100F` in dark. Both are one step away from the app
background so the map reads as a distinct surface rather than a hole in the page.

## Theme switching **[next]**

Switch the background with `map.setPaintProperty("background", "background-color", …)`. Do not
call `setStyle`. This is the lazy path and the correct one: paint properties do not touch the
camera, so "preserve camera position across theme switches" needs no save/restore code at all.

## Camera **[now — fix]**

`render()` calls `fitBounds` on every data update, so any future refresh yanks the camera back
from wherever the user panned. Fit once, on first render; after that, leave the camera alone
unless the user explicitly asks (Zoom To, Locate).

## Loading **[next]**

The map page shows a centred "Loading map…" string. Replace it with a skeleton that occupies the
map's real footprint — a muted-background rectangle with a pulsing panel where the context panel
will be — so the layout does not jump when data lands.

## Deferred **[later]**

- **PMTiles progressive loading** — out of scope per README Future Enhancements. Trigger: a real
  hosted basemap exists.
- **Clustered markers** — no layer has point geometry. Trigger: the first point layer is seeded.
- **Lazy-loading / debouncing large vector layers** — three mock layers arrive in one
  sub-100 KB response. Trigger: a single layer response crosses ~1 MB.

Writing these down is the point; building them now is not.

---

# 4. Design language

## Elevation **[next]**

| Level | Surface | Treatment |
| --- | --- | --- |
| 0 | Map | No shadow |
| 1 | Floating cards, context panel, legend | `shadow-sm` + border |
| 2 | Dropdowns, popovers, tooltips | `shadow-lg` + border |
| 3 | Dialogs, sheets, command palette | `shadow-xl` + backdrop |

Four levels, not five: dialogs, modals and the command palette are the same optical layer and
splitting them only invites inconsistent shadows. Use Tailwind's built-in shadow scale — three
custom shadow tokens for three uses is a token nobody will remember.

**In dark mode, shadows do not read.** Elevation there comes from surface lightness (background →
card → popover step up) plus the border. Do not compensate by darkening shadows.

## Spacing **[next]**

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` — which is Tailwind's default `1 2 3 4 6 8 12 16`. No
config change, nothing arbitrary. Two conventions on top of it:

- Component padding: 16 (`p-4`); card padding 24 (`p-6`) when the card is a page-level container.
- Gap between sibling controls: 8 (`gap-2`). Between groups: 24 (`gap-6`).

## Radius **[next]**

`globals.css` already derives every radius from a single `--radius` through a multiplier chain.
Change the one variable — `0.625rem` → `0.75rem` — and the scale lands where this design wants
it:

| Element | Utility | Result |
| --- | --- | --- |
| Buttons, inputs, badges | `rounded-lg` | 12px |
| Cards, panels | `rounded-xl` | ~17px |
| Dialogs, map container | `rounded-2xl` | ~22px |
| Avatars | `rounded-full` | — |

## Motion **[next]**

`tw-animate-css` is already installed; nothing else is needed.

- Hover / focus: 120ms `ease-out`.
- Panels and dialogs: 200ms `ease-out`, opacity + 4px translate. No scale, no bounce.
- Map camera: MapLibre defaults, except `fitBounds` on first load which stays `animate: false`
  so the app does not open with a fly-in.
- Everything respects `prefers-reduced-motion`.

---

# 5. Typography

## Family **[now — fix]**

Keep **Geist**, already loaded via `next/font` in `app/layout.tsx`. Do not add Inter: it is a
second webfont download for a difference nobody in a GIS dashboard will notice.

There is a live bug to fix first. `layout.tsx` exposes `--font-geist-sans`, but `globals.css`
declares `--font-sans: var(--font-sans)`, which resolves to nothing — so `@apply font-sans` on
`html` currently produces an empty family and the app renders in the browser default, not Geist.
Rename the variable in `layout.tsx` to `--font-sans` (and `--font-mono`) so the `@theme` mapping
resolves. One-line fix, whole-app effect.

**Geist Mono** is already loaded and gets a real job: coordinates, bounding boxes, feature IDs,
areas and lengths. Numbers that a researcher compares down a column must be tabular.

## Scale **[next]**

| Role | Size / line | Weight |
| --- | --- | --- |
| Page title | 24 / 32 | 600 |
| Section heading | 16 / 24 | 600 |
| Body | 14 / 20 | 400 |
| Caption, labels | 12 / 16 | 500 |
| Button | 14 / 20 | 500 |
| Data (mono) | 13 / 20 | 400 |

14px body, not 16: this is a dense information tool sharing the screen with a map, and every
reference app in the inspiration list runs a 13–14px UI. Measure caps at **70 characters**
(`max-w-[70ch]`) for prose — descriptions, dataset notes, empty states. It does not apply to
tables or property lists.

---

# 6. Icons **[next]**

**Lucide only** (`lucide-react`, already a dependency). 16px inside buttons and list rows, 20px
for standalone actions, `stroke-width: 1.75`. Icons never appear alone in a control without an
`aria-label` — the header's existing icon buttons already do this and it is the standard.

| Purpose | Icon | Status |
| --- | --- | --- |
| Theme | `SunMoon` | now |
| Account | `UserIcon` | now |
| Logout | `LogOut` | now |
| Layers | `Layers3` | next |
| Legend | `ListTree` | next |
| Dataset info | `Database` | next |
| Feature details | `Info` | next |
| Locate | `LocateFixed` | next |
| Copy coordinates | `Copy` | next |
| Zoom to | `Maximize2` | next |
| Export | `Download` | next |
| Search | `Search` | later |
| Measure | `Ruler` | later |
| Draw | `PencilLine` | later |
| Dashboard | `LayoutDashboard` | later |
| Users | `Users` | later |
| Notifications | `Bell` | later |
| Settings | `Settings` | later |

The bottom block is reserved vocabulary, not a backlog. There is one page; a dashboard icon
without a dashboard is a promise the UI does not keep.

---

# 7. Components

Installed today: `button`, `card`, `dialog`, `input`, `label` (`apps/web/components/ui`). Keep
adding only what a page actually renders.

The visual language is expressed through the tokens above, not by forking shadcn's components.
Radius, colour and shadow all flow from `globals.css`, so the delta is small and lives in
per-component `className`s:

| Component | Delta from stock |
| --- | --- |
| Sidebar / context panel | `bg-sidebar` (muted) — one step behind cards |
| Card | Soft border + `shadow-sm`, `rounded-xl` |
| Button | `rounded-lg`, `shadow-none`; primary green, destructive `#C03B3B`, amber for selection only |
| Input | `bg-muted`, `border-transparent`, visible `ring` on focus — borderless at rest, never at focus |
| Dialog | `rounded-2xl`, `p-6`, generous 24px gaps |
| Dropdown | Compact 32px rows, `bg-accent/10` on highlight |

Focus is the one place minimalism does not apply: every interactive element keeps a visible
2px `ring-ring` offset ring. Keyboard users navigate a map app constantly.

---

# 8. The Context Panel **[next]**

The feature that distinguishes this from a generic map demo: one panel, two states, no extra
pages.

**Nothing selected** — Layers (toggles, permission-filtered), Legend (swatches from the same
`color` column the map uses), Dataset info (source, CRS, feature count, last updated).

**Feature selected** — Name and layer, coordinates (mono), properties table, area or length,
then Zoom To · Copy coordinates · Export.

The legend reading its swatches from the layer `color` property rather than a second hardcoded
list is what makes "consistency across map, legend, exports and screenshots" true rather than
aspirational.

## Responsive behaviour **[next]**

`RULES.md` requires every page to work at mobile, tablet and desktop widths, and a fixed-width
right rail does not. One component, two layouts, CSS only — no sheet dependency:

- **Desktop (`md+`)**: right rail, 360px, full height, map fills the remainder.
- **Mobile**: bottom sheet at 40% height, drag or tap to expand; map keeps the top 60% so the
  user never loses the thing the panel is describing.
- Panel scrolls internally. The page itself never scrolls — a map dashboard that scrolls away
  from its map is broken.
- When a feature is selected on mobile, the sheet auto-expands to the peek height and the map
  offsets its centre so the selection is not under the sheet.

---

# 9. Accessibility floor **[next]**

Not negotiable, and cheap if done from the start:

- Body and secondary text ≥ 4.5:1; large text and UI borders ≥ 3:1. The palette above is
  measured against this — do not adjust a colour without re-measuring it.
- **Colour is never the only channel.** Layer identity in the legend carries colour *and* label;
  selection carries colour *and* stroke weight. Roughly 1 in 12 men cannot separate the amber
  road from the green boundary by hue alone.
- Every icon-only control has an `aria-label`.
- Visible focus ring on everything interactive, map controls included.
- Map features are reachable by keyboard through the layer list, not only by clicking the canvas.
- All motion respects `prefers-reduced-motion`.

---

# 10. Build order **[next]**

Sequenced so each step is independently shippable and nothing is blocked on a decision made
later:

1. Fix the font variable in `layout.tsx` — Geist actually renders. *(one line)*
2. Swap the palette and `--radius` in `globals.css`, drop the unused chart and violet tokens.
3. Theme-aware map background via `setPaintProperty`; fit bounds once, not on every update.
4. Add `color` / `fill_opacity` to `layers`, seed the three real layers, read them in `Map.tsx`
   with `["get", "color"]` — deletes the hardcoded `match`, restores the core invariant.
5. Line casings and the hover/selection treatment.
6. Context panel, empty state first (Layers · Legend · Dataset info), desktop rail and mobile
   sheet in the same component.
7. Feature-selected state and its actions.

Steps 1–4 are the ones that make the app look designed rather than defaulted. Steps 5–7 are the
ones that make it look built on purpose.

---

# Out of scope

Named here so they are decisions rather than omissions: real PMTiles basemaps, real
ecological/historical data (README Future Enhancements), a command palette, dashboard/analytics
pages, user management UI, measure and draw tools, notifications, chart tokens.

Each returns to the document as **[next]** the moment something actually needs it.
