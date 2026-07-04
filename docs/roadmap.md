# Roadmap

Where geojson.app is heading, in rough priority order. The philosophy behind every item: keep the serving costs near zero (static app + Cloudflare-hosted tiles), keep the app no-login and instant, and make the platform something others build on — the way people build on Mapbox, but open.

## Recently landed (2026 rewrite)

- Layers-first data model — multiple independent datasets with per-layer visibility, naming, and z-order; stable feature ids end-to-end (no positional indexing).
- Framework-agnostic core engine (`src/core`) — rendering, interactions, camera, overlays decoupled from React.
- Extension registries — panels, context-menu actions, source providers, and tools are registrations, not core edits.
- Unified command surface (`src/integrations`) — embed SDK, URL params, and future MCP execute identical commands; SDK gained `listLayers` / `setLayerVisibility` (additive v1).
- Toolchain: TypeScript 6, Vite 8 (Rolldown), ESLint 10, React 19, MapLibre 5.24, zustand state.

## Near term

- ~~Vitest for `core/` and `state/`~~ — **landed**: 49 tests over stores, executor, ingestion, params + CI (lint/test/build/size-guard). Next testing frontier: renderer diffing against a mocked map.
- **Layer reordering UI** — the store's layer order is z-order; expose drag-to-reorder in the layers panel.
- **Import by URL / paste UI** — the source providers exist (`url`, `text`); give them panel affordances.
- **Export** — download the current layer (or all layers) as GeoJSON; "copy all" beyond single features.
- **MCP companion server (Shape A)** — `@geojson.app/mcp` package: `geojson_view_link`, `geojson_embed_snippet`, `geojson_validate`. See `docs/integrations.md`.

## Medium term

- **Draw & edit tools** — point/line/polygon drawing as registered tools (the `MapTool` interface and exclusive-pointer-mode plumbing already exist); property editing in the properties dialog.
- **More source formats** — CSV/TSV (lat/lng columns), GPX, KML, TopoJSON, WKT as source providers. Each is a self-contained `SourceProvider` registration.
- **Live MCP sessions (Shape B)** — Cloudflare Durable Object relay + `?session=` param so agents drive a map the user is watching. Reuses the frozen protocol envelope.
- **Shareable state links** — encode layers (small data inline, large by URL) + camera + theme into a share URL. Static-only, no backend.
- **PMTiles overlays** — user-supplied PMTiles archives as overlay layers (protomaps/pmtiles is already a dependency).

## Longer term

- **Bring-your-own basemap** — custom tile endpoints and styles (`buildBasemapStyle` already takes a `tilesUrl`); a "custom" theme slot in settings.
- **Plugin packages** — npm-installable plugins that call the four registries; a `defineGeojsonAppPlugin()` helper and a docs page. The registries were designed with this as the end state.
- **Richer data on the shared tiles** — more layers in the hosted Protomaps build (terrain, POIs) as the tile budget allows; the community value compounds while marginal cost stays flat.
- **Collaborative sessions** — the Durable Object relay from MCP Shape B generalizes to multi-user cursors/state sync if demand appears.

## Non-goals

- Accounts, server-side data storage, or per-request backend costs by default.
- Becoming a GIS suite — the bar is "the fastest way to see, inspect, share, and script geo data on the web."
- Closed SDKs. Every capability ships documented or not at all.
