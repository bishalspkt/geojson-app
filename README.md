# geojson.app

**The fastest way to see, inspect, share, and script geospatial data on the web.**

[geojson.app](https://geojson.app) is an open-source, no-login map for working with GeoJSON and geo-adjacent data. Drop in a file and you get a fast MapLibre map with layer management, feature inspection, styling via [simplestyle-spec](https://github.com/mapbox/simplestyle-spec), measuring, search, five basemap themes, and a globe. Everything is also scriptable — embed live maps in your own pages or drive them from code and agents.

Built entirely on the open web-mapping stack: [MapLibre GL JS](https://maplibre.org/), [Protomaps](https://protomaps.com/) vector tiles (PMTiles on Cloudflare — serving a map view costs effectively nothing), React 19, TypeScript, Vite.

## Using the app

- **Load data** — drag & drop a `.geojson`/`.json` file, use the Import panel (file, pasted link, or a demo), or link data directly: `https://geojson.app/?geojson=<url-to-geojson>`
- **Inspect** — click features to highlight and select; right-click for zoom/properties/copy/delete; the Layers panel lists every feature with visibility toggles, sorting, and per-layer controls.
- **Style** — features carry their own style via simplestyle-spec properties (`marker-color`, `stroke`, `fill`, `marker-symbol` Maki icons, …).
- **Measure** — the measure tool computes running great-circle distances (undo, copy the path as GeoJSON).
- **Search** — global place search (Photon/OSM) pins results as map features.
- **Themes & globe** — light/dark/white/grayscale/black basemaps (the whole UI follows into dark mode), mercator or globe projection (with a starfield).
- **Phones & embeds** — a tab bar and collapsible bottom sheets on phones; embeds with `chrome=full` get a sidebar (or a sheet when narrow).
- **3D terrain & relief** — open elevation tiles as 3D terrain (with exaggeration) and hillshade; tilt up to 85° for valley-level views.
- **Imagery** — add satellite and Earth-observation layers (NASA GIBS: MODIS, VIIRS, HLS 30 m, IMERG rainfall…), or georeferenced images; adjust opacity; **swipe-compare** any two for before/after.
- **Timeline** — data with time properties (`time`, `date`, `start`/`end`, …) plays on a timeline with a histogram scrubber, cumulative or sliding-window modes; lines with per-vertex `coordTimes` animate as moving tracks, and new points pulse as they appear.
- **Stories** — guided, shareable narratives (`?story=<url>&chapter=<id>`): each chapter flies the camera, switches layers, plays the timeline (optionally with a chase camera), and opens before/after comparisons. See the built-in **Bhote Koshi–Trishuli disaster (26 August 2026)** story and [docs/stories.md](docs/stories.md).

## Embedding & scripting

Add a live map to any page with the ~2 kB SDK:

```html
<div id="map" style="width:100%;height:450px"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  const map = GeoJSONApp("create", {
    element: "#map",
    geojson: "https://example.com/data.geojson",
    theme: "dark",
  });
  // Imperative API, e.g.:
  // await map.ready();
  // await map.flyTo({ center: [85.32, 27.71], zoom: 11 });
  // map.on("click", ({ lngLat, features }) => …);
</script>
```

Full reference — options, methods, events, the underlying postMessage protocol, and stability guarantees: **[docs/developers-api.md](docs/developers-api.md)**. The integration architecture (URL params, embed SDK, MCP for AI agents): **[docs/integrations.md](docs/integrations.md)**.

## Development

```bash
npm install
npm run dev        # Vite dev server
npm test           # Vitest unit tests (stores, executor, ingestion — no mocks)
npm run build      # type-check + app build + embed SDK build
npm run size       # initial-load budget (after build)
npm run lint       # ESLint, zero-warnings policy
npm run preview    # preview the production build
```

Requires Node ≥ 22.12 (`.nvmrc`: 24). CI runs lint + test + build + the initial-load budget + an embed-size guard on every PR. All docs are indexed in **[docs/](docs/README.md)**; changes are tracked in the **[CHANGELOG](CHANGELOG.md)**.

## Architecture in one paragraph

State lives in zustand stores (`src/state`) with a **layers-first** model — every dataset is an independent layer with stable feature ids. A framework-agnostic engine (`src/core`) subscribes to the stores and reconciles MapLibre: rendering, interactions, overlays, camera. The React UI (`src/features`) never touches MapLibre directly. Extensibility comes from registries (`src/extensions`): panels, context-menu actions, data-source providers, tools, and imagery presets — built-ins register through the same doors a future plugin would. Imagery, terrain, the timeline, before/after compare, and stories are engine features driven by their own stores (`src/state`, `src/stories`) and load only when used, so the base map stays fast. External callers (embed SDK, URL params, MCP agents) all speak one command schema (`src/integrations`). The full story: **[docs/architecture.md](docs/architecture.md)**.

## Contributing

Contributions are welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, project conventions, and recipes for the most common changes (new panel, new context-menu action, new data format, new tool), plus **[docs/extending.md](docs/extending.md)** for the extension APIs. The direction of the project lives in **[docs/roadmap.md](docs/roadmap.md)**.

## License & data

App code is open source. Basemap © [OpenStreetMap](https://openstreetmap.org) contributors, tiles by [Protomaps](https://protomaps.com). Search by [Photon](https://photon.komoot.io/) (Komoot). Terrain from [Mapzen/Tilezen Terrarium tiles](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) on AWS Open Data; Earth-observation imagery from [NASA GIBS](https://earthdata.nasa.gov/gibs) and Copernicus Sentinel-2. Story datasets carry their own credits (see each story).
