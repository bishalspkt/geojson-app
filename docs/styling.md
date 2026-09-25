# Styling: features, themes, and the resolver

How visual styling works at every level of geojson.app, and where to change it.

## Feature styling (simplestyle-spec)

Features style themselves through [simplestyle-spec](https://github.com/mapbox/simplestyle-spec) properties. This is the styling contract for uploaded data, the embed SDK, and search pins alike:

| Property | Applies to | Values |
|---|---|---|
| `marker-color` | Point / MultiPoint | CSS color |
| `marker-size` | Point / MultiPoint | `"small"` \| `"medium"` \| `"large"` |
| `marker-symbol` | Point / MultiPoint | [Maki](https://labs.mapbox.com/maki-icons/) icon name (fetched from CDN, rendered as SDF) |
| `stroke` | lines + polygon outlines | CSS color |
| `stroke-width` | lines + polygon outlines | px |
| `stroke-opacity` | lines | 0–1 |
| `fill` | polygons | CSS color |
| `fill-opacity` | polygons | 0–1 |

```json
{
  "type": "Feature",
  "properties": {
    "name": "Central Park",
    "fill": "#2ecc71", "fill-opacity": 0.4,
    "stroke": "#27ae60", "stroke-width": 2
  },
  "geometry": { "type": "Polygon", "coordinates": [ … ] }
}
```

### How it becomes paint

[`src/style/style-resolver.ts`](../src/style/style-resolver.ts) turns a bucket of features into MapLibre paint/layout:

- If **no** feature in a bucket uses a simplestyle key, the resolver emits static defaults (cheapest paint).
- If **any** feature does, it emits data-driven expressions (`['coalesce', ['get', 'stroke'], default]`) so styled and unstyled features coexist in one layer.
- Hover states ride on MapLibre feature-state (`promoteId: '_fid'`): polygons brighten on hover; the selection highlight is a separate `sys:` overlay (orange, from `DEFAULTS.highlight`).

The default palette (violet points/lines/polygons, orange highlight) lives in [`src/style/style-defaults.ts`](../src/style/style-defaults.ts) — change product-wide colors there, nowhere else.

### Raw paint overrides (SDK layers)

Embed `addLayer({ paint })` accepts **raw MapLibre paint keys** (`circle-radius`, `line-color`, `fill-opacity`, …). They're stored on `DataLayer.paint` and merged over the resolved simplestyle paint by the renderer, routed to the matching geometry bucket by key prefix (`circle-*` → points, `line-*` → lines, `fill-*` → polygons). Overrides win over simplestyle.

Precedence, lowest → highest: **defaults → simplestyle properties → `DataLayer.paint` overrides**.

### Layer-level display options

Some renderings don't belong to individual features. They live on the layer (`DataLayer.display`, set by stories and ingestion options):

| Option | Effect |
|---|---|
| `labelField` | Text labels from a property (beside points, along lines, inside polygons). `labelMinZoom` hides them when zoomed out. Label colours follow the theme. |
| `heatmap` | Points render as a density heatmap that hands over to individual markers when zoomed in (`true`, or `{ radius, weightField, maxWeight, handoverZoom, intensity }`; lower `intensity` for dense datasets that saturate). |

### Time-driven styling

When the timeline runs, temporal layers get three extra renderings, all derived from data (no style authoring needed):

- **Time filter** — only features active at the playhead show (cumulative or a sliding window).
- **Pulse** — points that just appeared flash with an expanding ring in their `marker-color` (duration `temporal.pulseMs`).
- **Tracks** — lines with per-vertex times draw progressively: a gradient trail (`temporal.trackColor`, default orange) with a glowing head; `stroke-width` sets the trail width.

### Legends

`DataLayer.legend` / `ImageryLayer.legend` (`{ kind: 'swatches', items }` or `{ kind: 'gradient', stops }`) render in the layers and story panels. They're documentation for readers — the map never reads them, so keep them in sync with the paint you author.

## Media properties

Point features can carry a photo or video, following a small convention read by [`src/features/media/media.ts`](../src/features/media/media.ts):

| Property | Meaning |
|---|---|
| `image` | `https://` URL of a still or thumbnail — shown in the hover tooltip and the media card |
| `video` | `https://` URL of a video file the browser can play (WebM/MP4); the card plays it inline |
| `url` | Page to credit and open ("Open the source") — e.g. the Wikimedia Commons file page or a YouTube link |
| `credit`, `license` | Author and licence, always shown with the media |
| `captured` | When it was taken (ISO date) |
| `approximate` | `true` when the location is inferred rather than recorded (the card says so) |

Only `https://` URLs are used; anything else is ignored. Selecting such a feature opens the media card; these keys are kept out of the generic property list. Use media only with a licence that allows showing it with credit.

## Imagery, terrain and hillshade

Imagery layers draw beneath basemap labels by default so place names stay readable over satellite scenes (`placement: 'top'` puts them above the whole basemap, still under data). Sources are XYZ tiles (optionally `{time}`-templated), a single georeferenced image, or a cloud-optimised GeoTIFF (`{ type: 'cog', url, bounds? }`) read and reprojected in the browser. Imagery fades in over 0.7 s when it appears. Raster tweaks: `adjust: { saturation, contrast, brightnessMin, brightnessMax, hueRotate }`. Hillshade sits above land/water fills and beneath roads and labels; its shadow/highlight colours follow the theme, and the sky/fog colours for 3D terrain do too.

## Basemap themes

Five themes ship: `light`, `dark`, `white` (Clean), `grayscale` (Mono), `black` (Midnight). They are [Protomaps basemap flavors](https://github.com/protomaps/basemaps) with app-specific readability tweaks (stronger admin boundaries, population-ranked city label sizing) applied in [`src/core/basemap/style.ts`](../src/core/basemap/style.ts) → `customizeBaseLayers`.

- The theme list is `MAP_THEMES` in [`src/types/map.ts`](../src/types/map.ts); the settings popover swatches live in [`src/features/map/MapSettings.tsx`](../src/features/map/MapSettings.tsx).
- `buildBasemapStyle(theme, { tilesUrl })` is a pure function — custom tile endpoints are already a parameter (the bring-your-own-basemap roadmap item builds on this).
- Theme values are part of the frozen embed API (`setTheme`, `?theme=`); adding a theme is additive, renaming one is a breaking change.
- Theme swaps rebuild the MapLibre style; the engine calls every binding's `restyle()` on `style.load` (listener registered **before** `setStyle` — MapLibre fires it synchronously for inline styles).
- `marker-symbol` icons (Maki) are supplied on demand by the map's missing-image resolver (`core/basemap/sprites.ts`); unknown names get a generic marker.

## App UI styling

Tailwind 4 (CSS-first config in [`src/index.css`](../src/index.css) — no `tailwind.config.js`) with a small set of primitives in `src/components/ui` (`IconButton`, `Segmented`, `Dialog`). The UI chrome follows the basemap: Dark and Midnight put `.dark` on `<html>`, and every colour comes from semantic tokens that flip with it.

| Use | Class |
|---|---|
| Panel / bar / floating button surface | `glass` (menus over busy maps: `glass-strong`) |
| Text | `text-foreground`, secondary `text-muted-foreground`, tertiary `text-subtle-foreground` |
| Hover / pressed backgrounds | `bg-hover`, subtle fills `bg-tint`, cards `bg-card/70` |
| Dividers | `border-glass-border` |
| Section labels | `eyebrow` |
| Headings | `font-heading` (DM Sans), body Inter — both self-hosted |
| Brand pill | `bg-brand` (stays violet in dark mode) |
| Selected feature row | `bg-selected text-selected-foreground` |

Never hard-code greys or `bg-white/…` in app chrome — it breaks dark mode. `cn()` joins classes without merging conflicts, so don't pass a className that fights a component's own utilities (use `IconButton tone="plain"` to supply your own colours). Layout sizes that other components depend on live in CSS variables (`--tabbar-h`, `--embed-bar-h`).

## Internal properties

Keys starting with `_` (`_fid`, `_search_result`, `_t0`/`_t1`, …) are app bookkeeping: hidden from the properties dialog and stripped before data leaves the app (copy, export, protocol events) by [`src/lib/external-feature.ts`](../src/lib/external-feature.ts). Never style or key user-visible behaviour off them.
