# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint (ts,tsx) with zero warnings policy
npm run preview      # Preview production build locally
```

## Architecture

Single-page React 18 + TypeScript app for visualizing and processing GeoJSON data on a MapLibre GL map. Built with Vite (SWC plugin), styled with Tailwind CSS + shadcn/ui components.

### State Management

No state library — plain React `useState` at the App root:
- `geoJson: GeoJSON | undefined` — the current FeatureCollection
- `mapFocus: MapFocus | undefined` — controls map navigation (feature selection or geolocation)

State flows down via props; child components call `setGeoJson`/`setMapFocus` callbacks. No routing — everything renders on one page.

### Key Source Layout

- **`src/App.tsx`** — Root component, owns all top-level state
- **`src/components/map/map.tsx`** — MapLibre GL initialization, GeoJSON layer rendering, map event handling. Uses `useRef` to persist the map instance across renders.
- **`src/components/map-controls/`** — Control panel system (Import/Layers/Create/Locate buttons + toggleable panels)
- **`src/components/map-controls/panels/`** — Panel implementations: `upload-panel.tsx` (file upload, paste, sample data), `layers-panel.tsx` (feature list with turf.js stats), `create-panel.tsx` (placeholder)
- **`src/lib/map-utils.tsx`** — MapLibre helpers: `addGeoJSONLayer()` renders features split by geometry type (points → symbol layer, lines → line layer, polygons → fill layer), `getBoundingBox()`, geolocation, blue dot marker
- **`src/lib/geojson-utils.tsx`** — `filterGeojsonFeatures()` and `getGeoJsonFeatureCountStats()` for filtering/counting by geometry type
- **`src/components/ui/`** — shadcn/ui primitives (Button, Dialog, Textarea)

### Map Setup

MapLibre GL with Protomaps vector tiles (`https://tiles.geojson.app/20240107/`). Base style uses `protomaps-themes-base` light theme. Custom types in `src/components/map-controls/types.ts` define `MapFocus`, `PanelStatus`, and `GeoJsonPrimaryFetureTypes`.

### GeoJSON Data Flow

Three import paths (file upload, paste, sample JSON) all converge on `setGeoJson()` in App. The Map component reacts to geojson prop changes by calling `addGeoJSONLayer()`, which clears existing layers and re-adds per geometry type. The Layers panel uses turf.js (`@turf/area`, `@turf/length`, `@turf/bbox`) to compute feature statistics.

## TypeScript

Strict mode enabled. Path alias `@/` maps to `src/` (configured in tsconfig and vite).

## Testing

No test framework is currently set up.
