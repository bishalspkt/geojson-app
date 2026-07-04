# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies (Node ≥ 20.19)
npm run dev          # Vite dev server
npm run build        # tsc type-check + app build + embed SDK build (all must pass)
npm run lint         # ESLint 10 flat config, zero-warnings policy
npm run preview      # Preview production build
```

No test framework yet — verification is build + lint + manual preview (checklist in CONTRIBUTING.md).

## What this is

Single-page React 19 + TypeScript app (Vite 8/Rolldown, Tailwind 4, shadcn/ui) for visualizing and processing GeoJSON on a MapLibre GL map, plus an embeddable/scriptable SDK. Basemap: Protomaps PMTiles behind a Cloudflare Worker (`DEFAULT_TILES_URL` in `src/core/basemap/style.ts`). Deployed as a static Cloudflare Pages site; keeping serving costs ~zero is a product constraint.

## Architecture (layers-first, 2026 rewrite)

Full design: `docs/architecture.md`. Extension recipes: `docs/extending.md`. Layering:

```
UI (src/features)  →  stores (src/state)  ←  core engine (src/core)  →  MapLibre
integrations (src/integrations) → executor → stores/map
extensions (src/extensions) = registries wiring everything together
```

- **`src/state/`** — zustand stores, the single source of truth:
  - `layers-store` — `DataLayer[]` (ordered = z-order), each layer has stable `FeatureId`s (`"L1/3"`, mirrored in `properties._fid`), `selection`, `hiddenFeatureIds`. Helpers: `findFeature`, `allFeatures`, `selectedFeature`.
  - `settings-store` (theme/projection), `ui-store` (activePanel, focusRequest, propertiesFeatureId), `tools-store` (activeTool, measurePoints), `map-store` (live map handle: `getMap()`, `whenMapReady()`).
- **`src/core/`** — framework-agnostic map engine (no React components/hooks; stores accessed via vanilla `getState`/`subscribe`):
  - `engine.ts` `startMapEngine(map, opts)` binds stores→map: renderer sync, highlight, measure overlay, theme/projection swaps, focus requests, pointer interactions, tools, context-menu dispatch (CustomEvent `geojson-context-menu`).
  - `layers/ids.ts` — ALL MapLibre source/layer ids are minted here (`gj:<layerId>:<bucket>[:role]`, `sys:<name>`). Never hand-write id strings.
  - `layers/renderer.ts` — identity-diff reconciler: rebuilds a layer's sources only when its immutable layer object changed; visibility/hidden-feature filters applied via `_fid` filters + `promoteId`.
  - `basemap/style.ts` — pure `(theme, opts) → StyleSpecification`.
- **`src/extensions/`** — the four registries + built-ins (`registerBuiltinExtensions()` called in `main.tsx`): panels, context-menu actions, source providers (`ingest()` is THE data-entry point), tools.
- **`src/features/`** — React UI by domain: `map/` (thin Map mount + label + settings), `controls/` (registry-driven toolbar + panels + `panel-policy.ts` open/close side effects), `search/`, `context-menu/` (components; actions live in extensions).
- **`src/integrations/`** — external command surface: `commands.ts` (canonical names/shapes) → `executor.ts` (transport-independent execution) → transports: `embed/` (postMessage protocol v1 + `sdk.ts` built standalone as `/embed.js` via `vite.embed.config.ts`), `url/` (`?geojson=` loader). MCP design: `docs/integrations.md`.
- **`src/style/`** — simplestyle-spec → MapLibre data-driven paint expressions.

## Invariants (do not break)

1. `core/` never imports React; `state/` never stores MapLibre objects.
2. MapLibre ids only via `core/layers/ids.ts` namespaces.
3. Features are addressed by `_fid` only — never positional indices.
4. Embed protocol v1 (envelope, methods, events, error codes) and URL param names are frozen; changes must be additive. Keep `docs/developers-api.md` in sync. `embed.js` stays dependency-free, ~2 kB gzipped.
5. New external capability = command in `commands.ts` + `executor.ts` first, then per-transport exposure.
6. UI never calls MapLibre directly (read-only camera queries in leaf components are the tolerated exception).
7. Strip `_`-prefixed internal properties before data leaves the app (copy, export, protocol events).

## Common tasks

- New panel / context-menu action / data format / tool → follow `docs/extending.md` (registry patterns; also available as Claude Code skills, e.g. `/add-panel`).
- New SDK method → `.claude/skills/add-sdk-command` or `docs/extending.md` §5.
- Analytics: `posthog.capture('<noun>_<verb>', {...})` in UI code only.
- Commits: conventional prefixes (`feat:`, `fix:`, `chore:`, optional scope).
