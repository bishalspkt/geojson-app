# geojson.app Architecture

This document describes the architecture of geojson.app after the 2026 layers-first rewrite. It is the canonical reference for how the pieces fit together and the constraints that keep the project modular, extensible, and cheap to operate.

## Product philosophy

geojson.app is an open, embeddable, scriptable map for working with geo-adjacent data. The economics are deliberate: the only real serving cost is vector tiles, hosted as PMTiles on Cloudflare (tiles.geojson.app), which makes the marginal cost of a map view close to zero. Everything else is a static Vite build on Cloudflare Pages. That cost structure is what lets the project stay free and open — protect it. New features should not introduce per-request server costs without a very good reason.

The long-term goal is a platform others build on — the way people build on Mapbox — via three doors:

1. **The app** (geojson.app) — a fast, no-login tool for viewing and processing GeoJSON.
2. **The embed SDK** (`/embed.js`) — an iframe + postMessage API for hosts that want a live map.
3. **Agent integrations (MCP)** — the same command surface exposed to AI agents.

## The one diagram that matters

```
                 ┌────────────────────────────────────────────────┐
                 │                    UI (React)                  │
                 │  panels / search / context-menu / dialogs      │
                 └───────────────▲───────────────┬────────────────┘
                                 │ hooks         │ store actions
                 ┌───────────────┴───────────────▼────────────────┐
                 │              STATE (zustand stores)            │
                 │  layers · selection · tools · settings · ui    │
                 └───────────────▲───────────────┬────────────────┘
        subscribe (outside React)│               │ getState/setState
┌────────────────┐   ┌───────────┴───────────────▼───────────────┐
│  INTEGRATIONS  │   │              CORE (framework-agnostic)    │
│ embed bridge   ├──►│  basemap · layer renderer · overlays ·    │
│ url params     │   │  camera · interactions · id namespaces    │
│ (future: MCP)  │   └───────────────────┬───────────────────────┘
└────────────────┘                       │ imperative API
                                         ▼
                                   MapLibre GL JS
                                (Protomaps PMTiles)
```

Rules enforced by this layering:

- **`src/core/` never imports React.** It operates on a `maplibregl.Map` plus plain data. This is what makes the engine reusable (tests, SDK, workers, future non-React shells).
- **UI never touches MapLibre directly.** Components read/write zustand stores; core modules subscribe to stores and reconcile the map. (Escape hatch: read-only camera queries via the map instance are allowed in leaf components like the compass.)
- **Integrations speak commands, not internals.** The embed bridge and any future MCP transport translate a shared command schema (`src/integrations/commands.ts`) into store actions — they contain no map logic of their own.

## Directory layout

```
src/
  app/            App shell: providers, layout, embed-mode composition
  core/           Framework-agnostic map engine (no React imports)
    basemap/      Style builder, themes, starfield background
    layers/       Layer renderer + id namespace + interaction wiring
    overlays/     System overlays: highlight, measure, locate dot
    camera/       Focus/fit-bounds/fly-to helpers
  state/          zustand stores (the single source of truth)
  extensions/     Registries that make the app pluggable
    panels/       Panel registry (what shows in the control bar)
    context-menu/ Right-click action registry
    sources/      Data-source providers (file, url, text, …)
    tools/        Interactive tool registry (measure, future: draw)
  features/       UI by domain (map shell, controls, search, embed)
  integrations/   Command schema + embed protocol/bridge/SDK
  style/          simplestyle-spec resolver → MapLibre paint
  types/          Shared type definitions
  lib/            Small generic utilities
```

## State: layers-first model

The old app held exactly one `FeatureCollection`. The new model treats **layers as the unit of data**: an ordered list of independently sourced, styled, and toggled datasets.

```ts
interface DataLayer {
  id: LayerId;                 // "L1", "L2", … unique per session
  name: string;                // user-visible ("volcanoes.geojson", "Search results")
  origin: LayerOrigin;         // 'upload' | 'url' | 'paste' | 'sample' | 'search' | 'sdk' | 'draw'
  features: IdentifiedFeature[];
  visible: boolean;
  locked?: boolean;            // system layers (e.g. search results) can’t be edited
}
```

- Every feature gets a globally unique, stable `FeatureId` (`"L1/3"`) at ingest, stored both on the feature object and in `properties._fid` so MapLibre’s `promoteId` can use it for feature-state (hover/highlight) and filters (visibility). The legacy `Type-index` addressing from v1 is gone.
- `useLayersStore` (zustand) holds `layers`, `selection` (`{layerId, featureId}`), `hiddenFeatureIds`, and all mutations. `useSettingsStore` holds theme/projection. `useUiStore` holds panel state and map focus requests. `useToolsStore` holds the active tool + tool state (measure points).
- zustand was chosen over Context+useReducer because the store must be **readable and subscribable outside React** — the layer renderer, embed bridge, and future MCP transport all run imperative code. `useLayersStore.getState()` / `.subscribe()` are the seams that make that possible, and selector subscriptions keep React re-renders scoped.

## Core: how layers reach the screen

`core/layers/layer-renderer.ts` reconciles store state onto the MapLibre map. For each `DataLayer` it creates namespaced sources/layers, split by geometry bucket:

```
gj:<layerId>:points        (source)   gj:<layerId>:points:main / :glow / :symbol
gj:<layerId>:lines         (source)   gj:<layerId>:lines:main / :casing
gj:<layerId>:polygons      (source)   gj:<layerId>:polygons:main / :outline
```

- The `gj:` prefix is reserved for data layers; `sys:` for system overlays (highlight, measure, locate); `embed:` for SDK-added custom layers. Collisions are impossible by construction — never hand-write a raw layer id outside `core/layers/ids.ts`.
- Paint comes from `src/style/` which resolves [simplestyle-spec](https://github.com/mapbox/simplestyle-spec) feature properties into data-driven MapLibre expressions.
- Visibility: hidden layers use `layout.visibility`; hidden individual features use a `['!', ['in', ['get','_fid'], …]]` filter.
- Re-rendering is change-driven: the renderer diffs by layer identity and only rewrites sources whose layer object changed (layers are immutable in the store).
- Interactions (`core/layers/interactions.ts`) attach hover/click/contextmenu handlers per rendered layer and translate hits back into `{layerId, featureId}` via `_fid` — UI code never sees MapLibre event objects.

`features/map/Map.tsx` is now a thin mount point: it creates the map, hands it to the core engines, and renders chrome (starfield, drop overlay). Each engine is one small `useEffect` binding a store subscription to a core module.

## Extensions: the four registries

Everything a contributor typically adds is a registration, not a core edit:

| Registry | Registers | Built-ins |
|---|---|---|
| `extensions/panels` | Control-bar panels `{id, title, icon, component, order, embedVisible}` | import, layers, measure, animate, developers |
| `extensions/context-menu` | Right-click actions `{id, label, icon, visible(ctx), onSelect(ctx)}` | add marker, measure, zoom-to, properties, copy, delete |
| `extensions/sources` | Data ingestion `{id, label, canHandle(input), load(input) → DataLayer}` | file, url, raw text/paste, sample |
| `extensions/tools` | Exclusive pointer modes `{id, cursor, onMapClick, activate/deactivate}` | measure (future: draw, snap-edit) |

Registries are plain modules with `register()` + `list()`; built-ins self-register from `extensions/*/builtin/`. An eventual plugin system (user scripts, npm packages) will feed these same registries — that is the extension story, so keep their surfaces small and serializable.

### Future: bring-your-own basemap & tiles

`core/basemap/` builds the Protomaps style from a **flavor + tile URL**, both of which are parameters. User-supplied tile sources (their own PMTiles bucket, raster XYZ, vector styles) become: a `sources/` provider that yields a `BasemapSpec` instead of a `DataLayer`, plus a settings entry. The style builder must stay a pure function `(theme | custom spec) → StyleSpecification`.

## Integrations: one command surface, many transports

`src/integrations/commands.ts` is the canonical, versioned description of everything an external caller can do to a map: camera (`flyTo`, `jumpTo`, `fitBounds`), appearance (`setTheme`, `setProjection`), data (`setGeoJSON`, `addLayer`, `removeLayer`, `clearLayers`, `listLayers`, `setLayerVisibility`), and inspection (`getCenter`, `getZoom`, `getBearing`, `getBounds`). Events flow the other way: `load`, `move`, `moveend`, `click`, `theme:change`, `projection:change`, `error`.

Transports adapt that surface to a channel:

1. **URL params** (`?geojson=…&theme=dark`) — one-shot, for links and static embeds.
2. **postMessage** (`integrations/embed/`) — the live iframe protocol (`source: "geojson.app.embed", v: 1`). `embed.js` (built from `integrations/embed/sdk.ts`) is the host-side client. The wire protocol v1 is **frozen** — see `docs/developers-api.md` stability guarantees; extensions must be additive.
3. **MCP** (`docs/integrations.md`) — an MCP server exposes the same commands as agent tools. Because the schema is shared, an agent tool call and an SDK method call execute identical store actions.

The executor (`integrations/executor.ts`) is transport-independent: `execute(command) → result` against the stores + map instance. Bridges are ~thin: validate envelope → `execute` → reply.

## Operational setup

- **Hosting**: Cloudflare Pages serves `dist/` (app + `embed.js`). Tiles are a PMTiles archive behind a Cloudflare Worker (`secrets/wrangler.toml`; see `secrets/README.md`). Basemap fonts/sprites come from protomaps CDN.
- **Analytics**: PostHog (`VITE_PUBLIC_POSTHOG_PROJECT_TOKEN`), events named `<noun>_<verb>` (`geojson_uploaded`, `measure_started`, `search_performed`). Keep analytics out of `core/` — capture at the UI/action layer.
- **Build**: `npm run build` = type-check (tsc, TS 6) + app build (Vite 8/Rolldown) + embed SDK build (IIFE lib). `npm run lint` = ESLint 10 flat config, zero warnings policy.
- **No test framework yet**: verification is `npm run build && npm run lint` plus manual preview. Adding Vitest for `core/` and `state/` (both React-free) is the intended first testing investment.

## Invariants (do not break)

1. `core/` stays React-free; `state/` stays MapLibre-free (stores hold data, not map objects).
2. All MapLibre ids go through `core/layers/ids.ts` namespaces (`gj:`, `sys:`, `embed:`).
3. `_fid` is the only feature-addressing mechanism; never reintroduce positional indices.
4. Embed protocol v1 wire format is frozen; changes are additive (new methods/events) or versioned (`v: 2`).
5. Tile serving stays static/Cloudflare; no feature may require a stateful backend by default.
6. Every registry built-in lives under `extensions/*/builtin/` and registers itself — `app/` composes, it does not enumerate.
