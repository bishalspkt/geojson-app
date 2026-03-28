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

React Context + `useReducer` via `GeoJsonProvider` (in `src/services/geojson-store.tsx`):
- **GeoJsonState**: `features` (IdentifiedFeature[]), `collection`, `selectedFeatureId`, `hiddenFeatureIds`, `mapFocus`, `isMeasuring`, `measurePoints`, `mapSettings`
- **Actions**: typed action creators via `createGeoJsonActions(dispatch)` in `src/services/geojson-actions.ts`
- **Selectors**: pure functions in `src/services/geojson-selectors.ts` (selectFeaturesByCategory, selectFeatureStats, etc.)

Each feature gets a stable `FeatureId` (e.g., `"f-0"`) assigned at load time. Components access state via `useGeoJson()` hook.

A separate `MapInstanceProvider` (in `src/services/map/`) holds the mutable `maplibregl.Map` ref, accessed via `useMapInstance()`.

### Key Source Layout

- **`src/App.tsx`** — Thin shell: wraps providers (`GeoJsonProvider` > `MapInstanceProvider`) + layout components
- **`src/types/`** — Shared type definitions: `geojson.ts` (FeatureId, IdentifiedFeature, GeometryCategory), `map.ts` (MapFocus, MapSettings, MapTheme), `panels.ts` (PanelType, PanelStatus)
- **`src/services/`** — State management: `geojson-store.tsx` (reducer + provider), `geojson-actions.ts`, `geojson-selectors.ts`, `map/map-instance-store.tsx`
- **`src/style/`** — Feature styling: `simplestyle.ts` (simplestyle-spec types), `style-defaults.ts` (default palette), `style-resolver.ts` (data-driven MapLibre paint expressions)
- **`src/context-menu/`** — Right-click context menu: `context-menu-registry.ts` (extensible registry), `context-menu-actions.ts` (built-in actions), `ContextMenu.tsx` (React component)
- **`src/components/map/map.tsx`** — MapLibre GL initialization, GeoJSON layer rendering, map event handling, context menu event dispatch
- **`src/components/map-controls/`** — Control panel system (Import/Layers/Measure/Locate buttons + toggleable panels)
- **`src/components/map-controls/panels/`** — Panel implementations using `useGeoJson()` directly
- **`src/lib/map-utils.tsx`** — MapLibre helpers: layer management, highlight system, visibility filters, uses style resolver for data-driven styling
- **`src/lib/geojson-utils.tsx`** — `filterGeojsonFeatures()` and `getGeoJsonFeatureCountStats()`
- **`src/components/ui/`** — shadcn/ui primitives (Button, Dialog, Textarea)

### Map Setup

MapLibre GL with Protomaps vector tiles (`https://tiles.geojson.app/20260308.json`). Base style uses `protomaps-themes-base` with customizable themes (light, dark, white, grayscale, black).

### GeoJSON Data Flow

Three import paths (file upload, paste, sample JSON) all call `actions.loadGeoJson()` which dispatches to the reducer. The reducer assigns stable FeatureIds and stores IdentifiedFeature[]. The Map component derives legacy-compatible data via bridge functions and renders layers using `addGeoJSONLayer()` which splits features by geometry type. The style resolver reads simplestyle-spec properties (`fill`, `stroke`, `marker-color`, etc.) from features and generates MapLibre data-driven expressions.

### Context Menu

Right-click on a map feature fires a `CustomEvent('geojson-context-menu')`. The `<ContextMenu>` React component listens and renders a positioned menu. Built-in actions: Zoom to Feature, Copy Properties, Copy as GeoJSON, Delete Feature. New actions can be added via `contextMenuRegistry.register()`.

## TypeScript

Strict mode enabled. Path alias `@/` maps to `src/` (configured in tsconfig and vite).

## Testing

No test framework is currently set up.
