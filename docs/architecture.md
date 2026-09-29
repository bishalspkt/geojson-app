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
    engine.ts     startMapEngine: composes the bindings, handles basemap style swaps
    bindings/     One store→map binding per concern (data layers, imagery, terrain, chase camera, camera, pointer)
    basemap/      Style builder, themes, starfield background, terrain/hillshade/sky, style-image resolver
    layers/       Layer renderer (+ time filters, pulses, tracks) + id namespace + interaction wiring
    imagery/      Imagery (raster) renderer: XYZ/{time} tiles and georeferenced images
    time/         Pure time helpers, playback loop, chase camera
    compare/      Secondary "before" map for swipe comparisons
    overlays/     System overlays: highlight, measure, locate dot
    camera/       Focus/fit-bounds/fly-to/camera helpers
  state/          zustand stores (the single source of truth)
  stories/        Story documents: schema/validation, loader, chapter application
  extensions/     Registries that make the app pluggable
    panels/       Panel registry (what shows in the control bar)
    context-menu/ Right-click action registry
    sources/      Data-source providers (file, url, text, …)
    tools/        Interactive tool registry (measure, future: draw)
    imagery/      Imagery presets (NASA GIBS products, …) for "Add imagery"
  features/       UI by domain (map shell, controls + panels, search, imagery, timeline, compare, story, media, toast)
  components/     UI primitives (IconButton, Segmented, Dialog, ErrorBoundary)
  integrations/   Command schema + embed protocol/bridge/SDK
  style/          simplestyle-spec → MapLibre paint, marker icons
  types/          Shared type definitions
  lib/            Small generic utilities: analytics, safe URLs/HTML, external features, media queries
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
- Beyond vector data: `useImageryStore` (raster layers beneath data: satellite scenes, rainfall, water masks — plain source definitions, never MapLibre objects), `useTimeStore` (timeline extent, playhead, playback, sliding window, chase-camera target), `useCompareStore` (before/after swipe: which imagery shows left of the divider), `useStoryStore` (the open story document and chapter). Settings also carry `terrain`, `terrainExaggeration`, `hillshade`; `useUiStore.viewInsets` tells camera moves which part of the map is covered by UI.
- Layers can carry `temporal` (which properties hold time, or per-vertex `coordTimes` for animated tracks), `display` (labels, heatmap), `legend`, and `attribution` — all serializable.
- zustand was chosen over Context+useReducer because the store must be **readable and subscribable outside React** — the layer renderer, embed bridge, and future MCP transport all run imperative code. `useLayersStore.getState()` / `.subscribe()` are the seams that make that possible, and selector subscriptions keep React re-renders scoped.

## Core: how layers reach the screen

`startMapEngine(map, opts)` (`core/engine.ts`) composes one **binding** per concern (`core/bindings/*`). Each binding subscribes to its stores, reconciles the map, and implements `restyle()` (re-add its sources after a basemap swap) and `destroy()`:

| Binding | Stores → map | Code loads |
|---|---|---|
| `data-layers` | layers, selection, measure points, timeline → layer renderer + highlight/measure overlays + playback loop | at startup |
| `imagery` | imagery store → imagery renderer (+ COG decoder) | with the first imagery layer |
| `terrain` | terrain/hillshade settings → DEM, hillshade, sky | when terrain or relief is first switched on |
| `chase` | timeline `follow` → chase camera | when a timeline first follows a track |
| `camera` | `ui-store.focusRequest` → flights; map padding mirrors `viewInsets` | at startup |
| `pointer` | hover, click-to-select, context-menu events, exclusive tools | at startup |

Lazy bindings use `core/lazy.ts` (`lazy(create, destroy)`), so a session that never touches imagery, terrain or the chase camera never downloads them. A new optional capability should follow the same pattern (see "Performance").

`core/layers/renderer.ts` reconciles store state onto the MapLibre map. For each `DataLayer` it creates namespaced sources/layers, split by geometry bucket:

```
gj:<layerId>:points        (source)   gj:<layerId>:points:main / :glow / :symbol
gj:<layerId>:lines         (source)   gj:<layerId>:lines:main / :casing
gj:<layerId>:polygons      (source)   gj:<layerId>:polygons:main / :outline
```

- The `gj:` prefix is reserved for data layers; `sys:` for system overlays (highlight, measure, locate); `embed:` for SDK-added custom layers. Collisions are impossible by construction — never hand-write a raw layer id outside `core/layers/ids.ts`.
- Paint comes from `src/style/` which resolves [simplestyle-spec](https://github.com/mapbox/simplestyle-spec) feature properties into data-driven MapLibre expressions.
- Visibility: only visible layers are on the map. A layer's sources are built when it's first shown; hiding it sets `layout.visibility` and frees its sources after `EVICT_HIDDEN_MS` (15 s) hidden. Hidden individual features use a `['!', ['in', ['get','_fid'], …]]` filter.
- Re-rendering is change-driven: the renderer diffs by layer identity and only rewrites sources whose layer object changed (layers are immutable in the store).
- Interactions (`core/layers/interactions.ts`) attach hover/click/contextmenu handlers per rendered layer and translate hits back into `{layerId, featureId}` via `_fid` — UI code never sees MapLibre event objects.

### Imagery, terrain, time, compare

- **Imagery** (`core/imagery/renderer.ts`) reconciles `useImageryStore` the same identity-diff way, inserting rasters beneath basemap labels (or above the whole basemap with `placement: 'top'`) and always beneath data. Tile templates containing `{time}` are re-resolved (quantized per layer) as the timeline moves. Cloud-optimised GeoTIFFs go through a `cog://` MapLibre protocol (`core/imagery/cog.ts`): geotiff.js (lazy-loaded, decoding in a worker pool) reads the overview nearest each tile's resolution with HTTP range requests, and a 16 px mesh reprojects EPSG:4326/3857/UTM to Web Mercator with bilinear sampling, returning an `ImageBitmap`. COG headers are opened as soon as a layer is added, so a chapter's scenes are ready when its flight lands; nothing is proxied or re-hosted.
- **Terrain** (`core/basemap/terrain.ts`) adds open Terrarium DEM tiles (AWS Open Data) as 3D terrain + hillshade + sky, re-applied after every style load. MapLibre 6 keeps flights and gestures on the ground by itself (the 5.x workarounds are gone). What remains:
  - The chase camera passes `elevation` explicitly, because `jumpTo` with a fractional zoom looks the ground up in a DEM tile that may not be loaded.
  - When a flight ends over terrain whose height wasn't known as it started (a cold load from a chapter link), MapLibre keeps the camera altitude and lands up to a zoom level too far out; the camera binding glides to the requested zoom before reporting the flight as settled.
  - `core/camera/metrics.ts` derives camera distance and DEM zoom from the public API (MapLibre 6 removed `map.transform`).
- **Camera flights** (`core/camera/flight.ts`, `focus.ts`) replicate MapLibre's flyTo path length to give every hop a constant perceived speed (1.8–6.5 s, ease-in/ease-out). The engine reports arrival (`useUiStore.focusSettled`) so stories start playback only after the camera lands.
- **Time** — pure helpers in `core/time/temporal.ts` (parsing, intervals, extents, track interpolation) feed the layer renderer: temporal layers get `_t0/_t1` in their *map source data only* (never in the store), a time filter re-applied at most a few hundred times across the extent, a small per-layer "pulse" source for points that just appeared, and animated track sources (line-gradient trail + moving head) for lines with per-vertex times. `core/time/player.ts` advances the time store per animation frame; `core/time/follow.ts` is the chase camera, a rig of critically damped springs (`core/time/chase.ts` `smoothDamp`) on position, zoom, heading, pitch and ground height, advanced on its own animation loop and blended in from the chapter camera. Heading looks ahead along the track; with terrain on, it keeps the head in sight by sampling coarse z10 DEM tiles along the route (`core/basemap/elevation.ts`; MapLibre only loads terrain for what's in view) and lowering the pitch at constant zoom when a ridge would block the view — the clearance goal is smoothed by a second spring so the pitch eases rather than kicks. For fast fronts it reports a pace (`useTimeStore.pace`) that slows playback (`follow.maxViewSpeed`).
- **Compare** (`core/compare/compare-map.ts`) creates a second, non-interactive map that mirrors the main camera (including terrain elevation), basemap, data layers and timeline but renders the compare store's `left` imagery; the UI clips it to the left of the divider. It reuses the same renderers — no second implementation of anything.

### Stories

`src/stories/` turns a validated story document into store updates: the loader fetches layers on demand (the current and next chapter's, through the source-provider registry) and adds them hidden, and `applyChapter` sets layer visibility, terrain, compare, timeline, and a `camera` focus request. Chapters are pure store transitions, so they're unit-tested without a map. Format reference: [stories.md](stories.md).

`src/stories/index.ts` is a lazy facade (`loadStory`, `goToChapter`, `closeStory` are async and load the story runtime on first use); the story feature itself imports `stories/runtime` directly.

`features/map/Map.tsx` is a thin mount point: it creates the map, hands it to `startMapEngine`, and renders chrome (starfield, file-drop overlay).

## UI: chrome, layouts, themes

- **One panel frame, three layouts** (`features/controls/Panel.tsx`): a floating card above the toolbar on desktop, a bottom sheet above the tab bar on phones (the header collapses it; max ~55 dvh), and a sidebar in wide embeds with `chrome=full`. Every panel reports the map area it covers (`ui-store.viewInsets`); the camera binding mirrors it into MapLibre's padding (keeping the view still when a panel opens or closes), so flights, fits and the chase camera centre targets on what's still visible and the timeline and compare labels move out of its way. Escape closes the open panel; popovers and menus take Escape first (capture phase).
- **Toolbar** (`MapControls.tsx`): one button per registered panel — icon + label on desktop, a native-style tab bar on phones. Panels declare `mobileVisible`, `embedVisible`, `useHidden()` and `useBadge()`; their code is split (`lazyPanel`) and preloaded on hover/focus and at idle.
- **Theme tokens** (`src/index.css`): components use semantic colours (`bg-glass`, `text-foreground`, `text-muted-foreground`, `bg-hover`, `border-glass-border`, …) and the `glass` / `glass-strong` / `eyebrow` utilities — never raw greys. Dark and Midnight basemaps put `.dark` on `<html>`, so every panel, menu and chart follows the map.
- **Notices**: `notify(message)` (`state/notify-store.ts`) from any layer shows a toast (`features/toast`) — no `alert()`.
- **Resilience**: panels and lazily loaded widgets sit behind `ErrorBoundary`; a crash or a failed chunk shows a retry/reload card instead of a blank map.

## Performance

The base map is the product; everything else is optional and must not slow it down.

- **Shell first, map in parallel.** The page shell (logo, search, toolbar, panels' frame) renders from ~120 kB of JS; `features/map/map-runtime.ts` — MapLibre, the engine, the renderer, the basemap style — is its own chunk, requested as soon as the shell's code runs while `index.html` has already started downloading MapLibre (modulepreload). On a throttled phone the UI paints in ~1.4 s instead of ~2.9 s, and the map draws no later than before.
- **Budget** (`npm run size`, CI): the map-ready load — shell + MapLibre + map runtime — is ≈426 kB gzipped (budget 440 kB). Panels, stories, the timeline, compare, imagery/COG, terrain, the chase camera, the media card, the properties dialog, the embed bridge and PostHog are separate chunks loaded on first use.
- **MapLibre** is served unbundled from `/vendor/maplibre-gl@<version>/` in production (`vite.config.ts` `maplibreVendor`), so the main thread and the worker share one copy of `maplibre-gl-shared.mjs` (bundling gave the worker a second, 140 kB copy). Nothing outside `map-runtime.ts` (and lazy chunks) may import `maplibre-gl` at runtime — use `import type`.
- **Nothing competes with the first map render**: analytics and panel prefetching wait for the map's first `idle` (`lib/after-map-idle.ts`), not just an idle main thread, so they don't steal bandwidth from tiles and glyphs on slow networks. Google Analytics never loads inside embeds.
- **Per-frame work stays out of React**: during playback only the timeline's readout, scrubber and caption re-render; the compass rotates its icon on the DOM (the chase camera turns the map every frame). Track trails are re-sent to the worker at ~20 Hz (the head every frame), and empty pulse updates are skipped — on a 4×-throttled phone playback runs at MapLibre's own terrain frame rate.
- **Bounded caches**: open COGs are LRU-capped (8 scenes, ≤12 MB of cached blocks each), the chase camera's DEM sampler holds ≤96 tiles.
- **Demo data** lives in `public/samples/` and is fetched on click. Fonts are self-hosted (`@fontsource-variable`).
- **Big layers**: the layers panel renders 150 rows per section with "Show more" and caches feature area/length; the timeline histogram re-renders only when data changes (playback moves a clip).
- **Adding a feature**: import it with `lazy(() => import(...))` (UI) or `core/lazy.ts` (engine), and keep it out of `@/core`'s barrel.

## Extensions: the registries

Everything a contributor typically adds is a registration, not a core edit (five registries):

| Registry | Registers | Built-ins |
|---|---|---|
| `extensions/panels` | Control-bar panels `{id, title, icon, order, ...lazyPanel(() => import(…)), embedVisible?, mobileVisible?, useHidden?, useBadge?}` | import, layers, stories, measure, embed |
| `extensions/context-menu` | Right-click actions `{id, label, icon, visible(ctx), onSelect(ctx)}` | add marker, measure, zoom-to, properties, copy, delete |
| `extensions/sources` | Data ingestion `{id, label, canHandle(input), load(input) → DataLayer}` | file, url, raw text/paste, sample |
| `extensions/tools` | Exclusive pointer modes `{id, cursor, onMapClick, activate/deactivate}` | measure (future: draw, snap-edit) |
| `extensions/imagery` | Imagery presets `{id, name, group, dated?, create(date)}` for the layers panel's "Add imagery" | NASA GIBS MODIS/VIIRS/HLS/IMERG products |

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
- **Analytics**: `track('<noun>_<verb>', props)` from `lib/analytics.ts` (PostHog when `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` is set; loaded at idle). Keep analytics out of `core/` — capture at the UI/action layer.
- **Security**: untrusted input (story documents, `?geojson=`, SDK calls) never reaches an HTML sink unsanitised — `lib/safe.ts` (`httpUrl`, `sanitizeAttribution`) guards links and MapLibre attribution HTML; story sources/credits are validated at parse time; `lib/external-feature.ts` strips `_`-prefixed internals from anything leaving the app. `public/_headers` sets a CSP (scripts from our origin + the two analytics hosts only), `nosniff`, a referrer policy and cache rules; the app stays frameable for embeds.
- **Build**: `npm run build` = type-check (`tsc` from TypeScript 7; ESLint uses the TypeScript 6 API via the `typescript` alias until typescript-eslint supports 7) + app build (Vite 8/Rolldown) + embed SDK build (IIFE lib). `npm run lint` = ESLint 10 flat config, zero warnings. `npm test` = Vitest (Node environment) for core, state, stories, integrations and registries. `npm run size` = initial-load budget.

## Invariants (do not break)

1. `core/` stays React-free; `state/` stays MapLibre-free (stores hold data, not map objects).
2. All MapLibre ids go through `core/layers/ids.ts` namespaces (`gj:` data incl. pulses/tracks, `img:` imagery, `sys:` overlays/terrain, `embed:`).
3. `_fid` is the only feature-addressing mechanism; never reintroduce positional indices.
4. Embed protocol v1 wire format is frozen; changes are additive (new methods/events) or versioned (`v: 2`).
5. Tile serving stays static/Cloudflare; no feature may require a stateful backend by default.
6. Every registry built-in lives under `extensions/*/builtin/` and registers itself — `app/` composes, it does not enumerate.
7. Internal `_`-prefixed properties never leave the app (`lib/external-feature.ts` for copy, export and protocol events).
8. Optional features load lazily; the initial load stays within the `npm run size` budget.
9. Untrusted strings reach HTML sinks only through `lib/safe.ts` (MapLibre attribution renders HTML); links from documents go through `httpUrl`.
