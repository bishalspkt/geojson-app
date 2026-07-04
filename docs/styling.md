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

## Basemap themes

Five themes ship: `light`, `dark`, `white` (Clean), `grayscale` (Mono), `black` (Midnight). They are [Protomaps basemap flavors](https://github.com/protomaps/basemaps) with app-specific readability tweaks (stronger admin boundaries, population-ranked city label sizing) applied in [`src/core/basemap/style.ts`](../src/core/basemap/style.ts) → `customizeBaseLayers`.

- The theme list is `MAP_THEMES` in [`src/types/map.ts`](../src/types/map.ts); the settings popover swatches live in [`src/features/map/MapSettings.tsx`](../src/features/map/MapSettings.tsx).
- `buildBasemapStyle(theme, { tilesUrl })` is a pure function — custom tile endpoints are already a parameter (the bring-your-own-basemap roadmap item builds on this).
- Theme values are part of the frozen embed API (`setTheme`, `?theme=`); adding a theme is additive, renaming one is a breaking change.
- Theme swaps rebuild the MapLibre style; the engine re-adds data layers and overlays on `style.load` (listener registered **before** `setStyle` — required since MapLibre 5.24 fires it synchronously for inline styles).

## App UI styling

Tailwind 4 (CSS-first config in [`src/index.css`](../src/index.css) — no `tailwind.config.js`) + shadcn/ui primitives in `src/components/ui`. The design language is glassy panels: `bg-white/70 backdrop-blur-2xl border-white/30 rounded-2xl`, `DM Sans` headings (`var(--font-heading)`), violet primary. Reuse these patterns; don't introduce parallel ones.

## Internal properties

Keys starting with `_` (`_fid`, `_search_result`) are app bookkeeping: hidden from the properties dialog (`INTERNAL_PROPERTY_KEYS` in [`src/features/context-menu/feature-details.ts`](../src/features/context-menu/feature-details.ts)) and stripped before data leaves the app (copy/export/protocol events). Never style or key user-visible behavior off them.
