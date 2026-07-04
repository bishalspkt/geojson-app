# Changelog

Notable changes to geojson.app. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); the embed protocol has its own stability rules (see [docs/developers-api.md](docs/developers-api.md)).

## 2.0.0 — 2026-07-04

The layers-first rewrite ([docs/architecture.md](docs/architecture.md)).

### Added
- **Multiple data layers**: independent datasets with per-layer visibility, naming, and z-order; layers panel groups features per layer.
- **Extension registries** for panels, context-menu actions, data-source providers, and interactive tools — contributions register instead of editing core.
- **Unified command surface** (`src/integrations`): embed SDK, URL params, and future MCP agents execute identical commands.
- Embed SDK (additive to protocol v1): `listLayers()`, `setLayerVisibility(id, visible)`.
- `?geojson=<url>` now works on the main app for shareable links, not only embeds.
- Vitest suite for the framework-agnostic core (stores, executor, ingestion, params) and GitHub Actions CI (lint, test, build, embed-size guard).
- Docs: architecture, extending, integrations, styling, deployment, roadmap; CONTRIBUTING; Claude Code skills for common changes.
- Upload panel shows readable errors for unloadable files.

### Changed
- State moved to zustand stores; features are addressed by stable `_fid` ids end-to-end (positional Type-index addressing removed).
- Map behavior extracted into a framework-agnostic engine (`src/core`) with namespaced MapLibre ids (`gj:`/`sys:`).
- Toolchain: TypeScript 6, Vite 8 (Rolldown), ESLint 10 (zero warnings), MapLibre GL 5.24, React 19.
- Analytics only initializes when a PostHog token is configured.

### Fixed
- Theme switching on MapLibre ≥ 5.24 no longer loses data layers (`style.load` fires synchronously for inline styles; the swap handler now registers before `setStyle`).
- Embed `addLayer({ id: "primary" })` can no longer collide with (and silently replace) the primary dataset.
- Embed bridge replies are pinned to the host page's origin and only accepted from the embedding window.

### Removed
- Dead animation subsystem (~1,300 lines, never reachable from the UI).
- Legacy single-collection state (`src/services`), legacy map utilities, per-type feature indexing.

## 1.0.0 — 2026-04

Embed SDK v2 (imperative API + postMessage protocol v1), global place search, measure tool, five basemap themes, globe projection, mobile UX overhaul, PostHog analytics.
