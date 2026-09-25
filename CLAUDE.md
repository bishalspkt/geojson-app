# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies (Node ≥ 22.12; .nvmrc = 24)
npm run dev          # Vite dev server
npm test             # Vitest — colocated *.test.ts, Node env, no mocks (core/state/integrations)
npm run build        # tsc (TS 7) type-check + app build + embed SDK build (all must pass)
npm run size         # initial-load budget (run after build; CI enforces it)
npm run lint         # ESLint 10 flat config, zero-warnings policy
npm run preview      # Preview production build
```

Verification = lint + test + build + size (same as CI, `.github/workflows/ci.yml`, which adds a 6 KB gzip guard on dist/embed.js) + the manual browser checklist in CONTRIBUTING.md (desktop, 375 px phone, dark theme, embed). New store/executor/provider logic lands with tests. Docs index: docs/README.md; ops/deploy: docs/deployment.md; styling: docs/styling.md.

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
  - `settings-store` (theme/projection/terrain/hillshade), `ui-store` (activePanel, focusRequest incl. `camera` targets, propertiesFeatureId, viewInsets, hover), `tools-store` (activeTool, measurePoints), `map-store` (live map handle: `getMap()`, `whenMapReady()`).
  - `imagery-store` (raster layers: XYZ/`{time}` templates, georeferenced images), `time-store` (timeline extent/playhead/playback/window/follow), `compare-store` (before/after swipe), `story-store` (open story + chapter).
- **`src/core/`** — framework-agnostic map engine (no React components/hooks; stores accessed via vanilla `getState`/`subscribe`):
  - `engine.ts` `startMapEngine(map, opts)` composes `bindings/*` (data-layers, imagery, terrain, chase, camera, pointer), each `{restyle?, destroy}`; imagery/terrain/chase load lazily via `core/lazy.ts`. Context-menu dispatch = CustomEvent `geojson-context-menu`. Heavy modules are NOT re-exported from `@/core` (import by path from lazy code).
  - `layers/ids.ts` — ALL MapLibre source/layer ids are minted here (`gj:<layerId>:<bucket>[:role]`, `sys:<name>`). Never hand-write id strings.
  - `layers/renderer.ts` — identity-diff reconciler: rebuilds a layer's sources only when its immutable layer object changed; visibility/hidden-feature filters applied via `_fid` filters + `promoteId`.
  - `basemap/style.ts` — pure `(theme, opts) → StyleSpecification`.
  - `basemap/terrain.ts` (3D terrain/hillshade/sky), `imagery/renderer.ts` (raster layers, `img:` ids), `time/` (pure temporal helpers, playback loop, chase camera), `layers/temporal-render.ts` (time filters, pulses, tracks — `_t0/_t1` live only in map source data), `compare/compare-map.ts` (secondary swipe map reusing the renderers).
- **`src/extensions/`** — the four registries + built-ins (`registerBuiltinExtensions()` called in `main.tsx`): panels, context-menu actions, source providers (`ingest()` is THE data-entry point), tools.
- **`src/features/`** — React UI by domain: `map/` (thin Map mount, Brand, settings, hover card), `controls/` (registry-driven toolbar/tab bar, `Panel` frame = desktop card / phone bottom sheet / embed sidebar, panels (all `lazyPanel`), `panel-policy.ts`, `import-data.ts`), `imagery/`, `timeline/`, `compare/`, `story/`, `media/`, `toast/`, `search/`, `context-menu/`. Styling uses semantic theme tokens (`glass`, `text-muted-foreground`, `bg-hover`, `eyebrow`; docs/styling.md) so dark basemaps get dark chrome.
- **`src/lib/`** — `analytics.ts` (`track()`, PostHog/GA at idle), `safe.ts` (`httpUrl`, `sanitizeAttribution` — all untrusted HTML/links), `external-feature.ts` (strip `_` props), `use-media-query.ts`, `idle.ts`.
- **`src/stories/`** — story documents (`docs/stories.md`): `schema.ts` (validation, URL resolution), `loader.ts` (layers via source providers, hidden until a chapter shows them), `chapter.ts` (`applyChapter` = pure store transitions). Built-in story data under `public/stories/`, rebuild pipelines under `stories/<name>/pipeline/` (own package.json).
- **`src/integrations/`** — external command surface: `commands.ts` (canonical names/shapes) → `executor.ts` (transport-independent execution) → transports: `embed/` (postMessage protocol v1 + `sdk.ts` built standalone as `/embed.js` via `vite.embed.config.ts`), `url/` (`?geojson=` loader). MCP design: `docs/integrations.md`.
- **`src/style/`** — simplestyle-spec → MapLibre data-driven paint expressions.

## Invariants (do not break)

1. `core/` never imports React; `state/` never stores MapLibre objects.
2. MapLibre ids only via `core/layers/ids.ts` namespaces (`gj:` data incl. pulse/track, `img:` imagery, `sys:` overlays/terrain).
3. Features are addressed by `_fid` only — never positional indices.
4. Embed protocol v1 (envelope, methods, events, error codes) and URL param names are frozen; changes must be additive. Keep `docs/developers-api.md` in sync. `embed.js` stays dependency-free, ~2 kB gzipped.
5. New external capability = command in `commands.ts` + `executor.ts` first, then per-transport exposure.
6. UI never calls MapLibre directly (read-only camera queries in leaf components are the tolerated exception).
7. Strip `_`-prefixed internal properties before data leaves the app (copy, export, protocol events) — `lib/external-feature.ts`.
8. Optional features load lazily (`React.lazy`, `lazyPanel`, `core/lazy.ts`); the initial load stays within `npm run size`.
9. Untrusted strings reach HTML sinks only via `lib/safe.ts`; `public/_headers` CSP allows scripts from self + GTM + PostHog only.

## Common tasks

- New panel / context-menu action / data format / tool / imagery preset → follow `docs/extending.md` (registry patterns; also available as Claude Code skills, e.g. `/add-panel`).
- New or extended story (guided chapters, animations, before/after) → `/add-story` skill + `docs/stories.md`.
- Visual verification: the preview pane is often hidden (rAF stalls MapLibre); a headless system-Chrome via Playwright renders WebGL fine for screenshots. Production MapLibre is served from `/vendor/maplibre-gl@<v>/` (vite.config.ts `maplibreVendor`); dev sets the worker URL in `core/maplibre-setup.ts`. Only `features/map/map-runtime.ts` (and lazy chunks) import `maplibre-gl` at runtime — everywhere else `import type`, so the UI shell paints before MapLibre arrives. Post-load work (analytics, prefetch) goes through `lib/after-map-idle.ts`.
- New SDK method → `.claude/skills/add-sdk-command` or `docs/extending.md` §5.
- Analytics: `track('<noun>_<verb>', {...})` from `@/lib/analytics` in UI code only. User-facing errors: `notify()` from `@/state/notify-store`.
- Commits: conventional prefixes (`feat:`, `fix:`, `chore:`, optional scope).
