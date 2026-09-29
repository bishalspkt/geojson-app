---
name: add-story
description: Create or extend a geojson.app story — a guided map narrative (chapters with camera, layers, 3D terrain, timeline animation, before/after imagery) built from open data. Use when asked to build a data story, an analysis walkthrough, an animated event map, or to add chapters/layers to an existing story.
---

# Add a story

A story is data: `public/stories/<name>/story.json` plus the GeoJSON/images it references. The format reference is `docs/stories.md`; the Bhote Koshi–Trishuli 2026 story (`public/stories/bhotekoshi-2026/`, built by `stories/bhotekoshi-2026/pipeline/`) is the worked example.

## Steps

1. **Pipeline first, JSON second.** Anything derived from external data gets a rebuildable pipeline in `stories/<name>/pipeline/` (its own `package.json`; `node_modules/` and `.cache/` are gitignored). Cache every network response (`cachedFetch` / `overpass` in the Nepal pipeline's `lib.mjs`), write outputs to `public/stories/<name>/data|img/`, and generate `story.json` from code so numbers in the text match the data.
2. **Layers** — `geojson` layers for vector data (`display.labelField`, `display.heatmap`, `display.tooltipFields`, `temporal`, `legend`, `attribution`), `imagery` layers for rasters (single georeferenced WebP chips, or keyless XYZ such as NASA GIBS with `{time}`). Style with simplestyle properties baked into features (`marker-color`, `stroke`, `fill`…) plus raw paint overrides.
3. **Time** — points/polygons animate with `temporal.startField` (`endField` optional); lines with per-vertex `coordTimes` animate as tracks. Chapters lock the timeline extent with `time.start/end`; `time.follow` turns on the chase camera.
4. **Chapters** — each sets `camera` (pitch/bearing for 3D), `layers` (everything else hides), `terrain`, `time`, `compare` (before/after swipe between imagery layers), `stats`, `chart` (`bars` or `line`), and `sources`. Keep bodies short; cite sources per chapter; state modelled vs observed values explicitly.
5. **Budget** — round coordinates to 5 decimals, simplify geometry, WebP imagery; aim for < 10 MB per story. Only link keyless, CORS-enabled services; attribute every source (credits + layer attribution).
6. **List it** in `FEATURED_STORIES` (`src/features/story/featured.ts`) if it ships with the app.

## Verify

- `node build.mjs` in the pipeline reruns offline from cache.
- `npm run lint && npm test && npm run build`.
- Dev server: `/?story=<name>` (≡ `/stories/<name>/story.json`) → every chapter: camera lands in the visible area (panel doesn't cover the subject), the right layers show, timeline plays, swipe works, legends/sources render, no console errors. Use `?chapter=<id>` to jump straight to a chapter. In the hidden preview pane rendering can stall — drive a headless Chrome (Playwright with the system Chrome) for screenshots instead.
