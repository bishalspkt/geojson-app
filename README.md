# geojson.app

**The fastest way to see, inspect, share, and script geospatial data on the web.**

[geojson.app](https://geojson.app) is an open-source, no-login map for working with GeoJSON and geo-adjacent data. Drop in a file and you get a fast MapLibre map with layer management, feature inspection, styling via [simplestyle-spec](https://github.com/mapbox/simplestyle-spec), measuring, search, five basemap themes, and a globe. Everything is also scriptable — embed live maps in your own pages or drive them from code and agents.

Built entirely on the open web-mapping stack: [MapLibre GL JS](https://maplibre.org/), [Protomaps](https://protomaps.com/) vector tiles (PMTiles on Cloudflare — serving a map view costs effectively nothing), React 19, TypeScript, Vite.

## Using the app

- **Load data** — drag & drop a `.geojson`/`.json` file, use the Import panel, or link data directly: `https://geojson.app/?geojson=<url-to-geojson>`
- **Inspect** — click features to highlight and select; right-click for zoom/properties/copy/delete; the Layers panel lists every feature with visibility toggles, sorting, and per-layer controls.
- **Style** — features carry their own style via simplestyle-spec properties (`marker-color`, `stroke`, `fill`, `marker-symbol` Maki icons, …).
- **Measure** — the measure tool computes running great-circle distances.
- **Search** — global place search (Photon/OSM) pins results as map features.
- **Themes & globe** — light/dark/white/grayscale/black basemaps, mercator or globe projection (with a starfield).

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
npm run lint       # ESLint, zero-warnings policy
npm run preview    # preview the production build
```

Requires Node ≥ 20.19. CI runs lint + test + build + an embed-size guard on every PR. All docs are indexed in **[docs/](docs/README.md)**; changes are tracked in the **[CHANGELOG](CHANGELOG.md)**.

## Architecture in one paragraph

State lives in zustand stores (`src/state`) with a **layers-first** model — every dataset is an independent layer with stable feature ids. A framework-agnostic engine (`src/core`) subscribes to the stores and reconciles MapLibre: rendering, interactions, overlays, camera. The React UI (`src/features`) never touches MapLibre directly. Extensibility comes from four registries (`src/extensions`): panels, context-menu actions, data-source providers, and tools — built-ins register through the same doors a future plugin would. External callers (embed SDK, URL params, MCP agents) all speak one command schema (`src/integrations`). The full story: **[docs/architecture.md](docs/architecture.md)**.

## Contributing

Contributions are welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, project conventions, and recipes for the most common changes (new panel, new context-menu action, new data format, new tool), plus **[docs/extending.md](docs/extending.md)** for the extension APIs. The direction of the project lives in **[docs/roadmap.md](docs/roadmap.md)**.

## License & data

App code is open source. Basemap © [OpenStreetMap](https://openstreetmap.org) contributors, tiles by [Protomaps](https://protomaps.com). Search by [Photon](https://photon.komoot.io/) (Komoot).
