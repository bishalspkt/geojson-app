# Changelog

Notable changes to geojson.app. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); the embed protocol has its own stability rules (see [docs/developers-api.md](docs/developers-api.md)).

## Unreleased — 2026-09

Analysis features for time-varying, terrain-heavy data; a faster, redesigned and hardened base app; and the first built-in story: the Bhote Koshi–Trishuli disaster of 26 August 2026.

### Added
- **Imagery layers** (`useImageryStore`, `core/imagery`): XYZ tiles and georeferenced images beneath data and basemap labels, per-layer opacity, `{time}` templates that follow the timeline; imagery preset registry (`extensions/imagery`) with NASA GIBS products in the layers panel's *Add imagery* menu.
- **3D terrain + hillshade + sky** from open Terrarium elevation tiles; settings toggles and exaggeration; pitch up to 85°.
- **Timeline** (`useTimeStore`, `core/time`): auto-detected time properties, time filters (cumulative / sliding window), pulsing new points, animated tracks for lines with per-vertex `coordTimes`, chase camera (`follow`), histogram scrubber, keyboard play/pause.
- **Before/after swipe compare** (`useCompareStore`, `core/compare`): a synchronized secondary map clipped at a draggable divider.
- **Stories** (`src/stories`, `docs/stories.md`): JSON documents of layers + chapters (camera, layers, terrain, timeline, compare, stats, bar/line charts, sources); Stories panel; `?story=` / `?chapter=` links that stay in sync while reading.
- Layer display options: text labels, heatmaps (with `intensity` for dense datasets), hover tooltips (`display.tooltipFields`), legends and attribution in the layers panel.
- Terrain-aware chase camera: it samples coarse elevation tiles along the route and orbits upward when a ridge would block the view of the flood front.
- Embed SDK / command surface (additive to protocol v1): `addImagery`, `removeImagery`, `listImagery`, `setTerrain`, `setTime`, `setCompare`, `loadStory`, `setStoryChapter`; event `story:chapter`; embed options `story`, `chapter`.
- **Full-resolution COG imagery**: `{ type: 'cog' }` imagery sources (and `addImagery({ cog })`) stream cloud-optimised GeoTIFFs straight from open buckets through a `cog://` protocol — overview selection, UTM/4326/3857 reprojection in the browser, worker-pool decoding, headers warmed as layers appear. Imagery fades in when shown.
- **Smooth camera**: the chase camera is now a rig of critically damped springs on its own animation loop (look-ahead heading, lead room, blended take-over, smoothed terrain-clearance pitch); story flights move at a constant perceived speed with ease-in/out, and autoplay waits for the camera to land. `follow.maxViewSpeed` slows playback while a fast front would race across the view.
- **Timeline captions** (`time.captions`, `setTime({ captions })`): narration above the timeline as the playhead passes each moment, with ticks on the scrubber.
- **Compare scene pickers**: `leftOptions` / `rightOptions` turn the swipe labels into menus of alternative scenes; a side can stack several layers (e.g. a drone strip over a full scene).
- **Media on the map**: features with `image` / `video` / `url` / `credit` / `license` show a hover preview and a media card (see docs/styling.md).
- Story charts: multi-series line charts with legends, dashed series and threshold lines; story bodies support bullet lists.
- **The Bhote Koshi–Trishuli disaster, 26 August 2026** story (`/stories/bhotekoshi-2026/`, 31 chapters) with a rebuildable open-data pipeline (`stories/bhotekoshi-2026/pipeline`): minute-by-minute chase of the debris-flow front with captions; town-by-town before/after of the sharpest open imagery (Vantor and Planet scenes, 3.5–6 cm NEA drone orthophotos, HOT's post-event mosaic); UNOSAT detachment zone, barrier lakes and flow extent; DHM hydrographs and warning lead times; hydropower losses; the government's damage assessment (buildings, bridges, debris, costs); tolls and where bodies were recovered; crowdsourced photos, street-level frames and videos.
- **Real demo datasets** in the import panel, each with its own icon, replacing the hand-drawn samples: every M5.5+ earthquake of 2025 (USGS; pulses on the timeline), all named tropical cyclones of 2025 (NOAA IBTrACS; animated 6-hourly tracks coloured by peak category), the PB2002 tectonic plates and boundaries, and the January 2025 Los Angeles fire perimeters (NIFC). Rebuilt with `node scripts/build-samples.mjs`.

### Changed — a faster, calmer, safer base app
- **Every dependency on its latest release**, including MapLibre GL JS 6 (ESM, WebGL 2), TypeScript 7 (native `tsc`; ESLint keeps the TS 6 API via an alias until typescript-eslint supports 7), Vitest 5, geotiff 3, React 19.3 and Vite 8.3. Node ≥ 22.12.
- **Faster first load, even with all the new features**: the UI paints from ~120 kB of JS while MapLibre and the engine load in parallel — on a throttled phone the UI appears in ~1.4 s (was ~2.9 s) and the map draws no later; 426 kB gzipped until the map is ready (was 470 kB), guarded in CI by `npm run size`. Analytics and prefetching wait until the map has drawn. Playback keeps per-frame work out of React and sends track trails to the worker at ~20 Hz; COG caches are bounded. Stories, the timeline, compare, imagery/COG, terrain, the chase camera, every panel, the media card, the properties dialog, the embed bridge and analytics now load on first use; MapLibre is served unbundled so its worker shares code with the page instead of shipping a second copy; demo datasets are fetched on click; fonts are self-hosted (no Google Fonts request); PostHog and Google Analytics load after the map, and Google Analytics never loads in embeds.
- **Map engine as bindings** (`core/bindings`): data layers, imagery, terrain, chase camera, camera and pointer each bind their stores to the map and rebuild themselves after a basemap swap. Marker icons arrive through MapLibre's missing-image resolver (unknown names get a generic marker).
- **Redesigned chrome**: one panel frame that is a floating card on desktop, a collapsible bottom sheet on phones, and a sidebar in wide embeds; a native-style tab bar on phones; panels report the map area they cover so flights, the timeline and compare labels stay in the visible part; the UI follows the basemap into dark mode; toasts instead of `alert()`; Escape closes panels and menus; error boundaries keep a broken panel from blanking the map.
- **Import panel**: drop zone, load GeoJSON from a link, demo chips, story cards. Importing closes an open story.
- **Layers panel**: layer headers always shown, single-type layers open straight to their features, 150 rows per section with "Show more", cached area/length, "Add imagery" and "Clear all" in a footer; imagery rows only when there is imagery.
- **Story reader**: a chapter list (table of contents), a progress bar instead of 31 dots, exit in the header.
- **Measure**: undo (button, Backspace, Ctrl/Cmd+Z) and "Copy GeoJSON" of the measured path.
- **Embed panel** generates code for the current view (JavaScript SDK or plain iframe), including an open story.
- **Security**: story/SDK attribution strings are sanitised before MapLibre renders them as HTML (a crafted `?story=` link could otherwise run script on geojson.app); story source and credit links must be http(s); every `_`-prefixed internal property is stripped from protocol events, copies and the properties dialog (previously only `_fid`); remote GeoJSON over 25 MB is refused; `public/_headers` adds a Content-Security-Policy, `nosniff`, referrer and permissions policies and long-lived caching for hashed assets.

### Fixed
- `stroke-width: 0` now hides line and polygon outlines instead of falling back to the default width.
- Data-layer sub-layers restack in true draw order (line casing under the line, point glow under the marker).
- With 3D terrain, camera flights no longer end inside mountains (fixed upstream in MapLibre 6; the 5.24 workarounds are gone).
- The swipe-compare map fills the whole viewport (MapLibre's container CSS had collapsed it to a 300 px strip), so the two sides no longer show the same image. The divider starts in the middle of the area the story panel leaves visible — also for a chapter opened from a link — and its labels sit below the search bar.
- A chapter opened from a link over 3D terrain lands at its intended zoom (MapLibre re-derives the zoom from the camera altitude when terrain heights arrive mid-flight; still needed on 6.11).
- COG tiles that are cancelled mid-read no longer leave unhandled promise rejections (geotiff's shared block cache).
- Marker icons (`marker-symbol`) now appear on the compare map and after theme swaps (a shared "already loaded" cache skipped adding them to new maps).

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
