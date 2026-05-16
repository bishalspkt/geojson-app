# Embedding geojson.app Maps

geojson.app provides a lightweight JavaScript SDK (`embed.js`) that lets you add interactive maps with GeoJSON data to any website. As of v2 the SDK also exposes an **imperative API** for driving the map after it's mounted — fly to new locations, switch themes, swap data — without re-mounting the iframe.

## Quick Start

```html
<div id="my-map" style="width: 100%; height: 450px; border-radius: 12px; overflow: hidden;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#my-map",
    geojson: "https://example.com/data.geojson",
  });
</script>
```

The SDK creates a managed iframe inside the target element, handling sizing, responsive behavior, and cleanup automatically.

## Installation

Add the SDK script to your page. It can be placed anywhere — the SDK processes queued commands, so the script can load before or after your `GeoJSONApp()` calls.

```html
<script src="https://geojson.app/embed.js"></script>
```

### Async Loading

For non-blocking loading, queue commands before the SDK loads. Note that the queued form cannot return the imperative `EmbedInstance` — if you need to control the map after creation, load the SDK synchronously.

```html
<script>
  window.GeoJSONApp = window.GeoJSONApp || function() {
    (window.GeoJSONApp.q = window.GeoJSONApp.q || []).push(arguments);
  };
</script>
<script src="https://geojson.app/embed.js" async></script>
<script>
  GeoJSONApp("create", {
    element: "#my-map",
    geojson: "https://example.com/data.geojson",
  });
</script>
```

## Create Options

### `GeoJSONApp("create", options)`

Creates a new map instance inside the specified element and returns an `EmbedInstance`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `element` | `string \| HTMLElement` | _(required)_ | CSS selector or DOM element to mount the map into. |
| `geojson` | `string` | — | URL to a GeoJSON file (`FeatureCollection` or `Feature`). |
| `center` | `[lng, lat]` | `[105, -5]` | Initial map center as `[longitude, latitude]`. |
| `zoom` | `number` | `2.8` | Initial zoom level (0–22). |
| `theme` | `string` | `"light"` | `"light"`, `"dark"`, `"white"`, `"grayscale"`, `"black"`. |
| `projection` | `string` | `"mercator"` | `"mercator"` or `"globe"`. |
| `interactive` | `boolean` | `true` | Enable map pan, zoom, and click interactions. |
| `chrome` | `string` | `"minimal"` | `"full"`, `"minimal"`, or `"none"`. See below. |
| `attribution` | `string` | (see below) | `"visible"` or `"compact"`. Default `"visible"`; `"compact"` when `chrome: "none"`. |
| `controls` | `boolean` | `false` | **Deprecated** — `true` is equivalent to `chrome: "full"`. |
| `width` | `string` | `"100%"` | CSS width for the iframe. |
| `height` | `string` | `"100%"` | CSS height for the iframe. |

### Chrome Modes

| `chrome` | Layer panel | Context menu | Attribution |
|----------|-------------|--------------|-------------|
| `"full"` | ✓ | ✓ | full |
| `"minimal"` _(default)_ | ✗ | ✓ (when `interactive`) | full |
| `"none"` | ✗ | ✗ | compact pill |

Use `"none"` when your host page provides its own UI and only wants a basemap canvas to drive programmatically. Attribution always renders in some form to keep OSM compliance.

## Imperative API

`GeoJSONApp("create", ...)` returns an `EmbedInstance`. All methods are async — they round-trip through `postMessage` and reject with a typed error if the iframe doesn't ack within **5 seconds**. Commands issued before `ready()` resolves are queued and dispatched once the map's `load` event fires.

```ts
type EmbedInstance = {
  iframe: HTMLIFrameElement;
  destroy(): void;

  ready(): Promise<void>;

  // Camera
  flyTo(opts: { center?: [lng, lat]; zoom?: number; bearing?: number;
                pitch?: number; duration?: number }): Promise<void>;
  jumpTo(opts: { center?: [lng, lat]; zoom?: number; bearing?: number;
                 pitch?: number }): Promise<void>;
  fitBounds(bounds: [[lng, lat], [lng, lat]],
            opts?: { padding?: number; duration?: number; maxZoom?: number }): Promise<void>;

  // State
  setTheme(theme: 'light' | 'dark' | 'white' | 'grayscale' | 'black'): Promise<void>;
  setProjection(projection: 'mercator' | 'globe'): Promise<void>;

  // Data
  setGeoJSON(data: string | GeoJSON.FeatureCollection | GeoJSON.Feature): Promise<void>;
  addLayer(spec: { id: string;
                   data: GeoJSON.FeatureCollection | GeoJSON.Feature;
                   paint?: Record<string, unknown> }): Promise<void>;
  removeLayer(id: string): Promise<void>;
  clearLayers(): Promise<void>;

  // Inspection
  getCenter(): Promise<[lng, lat]>;
  getZoom(): Promise<number>;
  getBearing(): Promise<number>;
  getBounds(): Promise<[[lng, lat], [lng, lat]]>;

  // Events
  on(event: EmbedEvent, cb: (payload: unknown) => void): () => void; // returns unsubscribe
  off(event: EmbedEvent, cb: (payload: unknown) => void): void;
};
```

### Events

| Event | Payload | Notes |
|-------|---------|-------|
| `load` | _none_ | Fires once when the map is initialised. |
| `move` | `{ center, zoom, bearing, pitch }` | Throttled to ~60fps. |
| `moveend` | `{ center, zoom, bearing, pitch, bounds }` | Fires after camera settles. |
| `click` | `{ lngLat, features }` | `features` are the GeoJSON features at the click point (basemap excluded). |
| `theme:change` | `{ theme }` | Fires when the active theme changes. |
| `projection:change` | `{ projection }` | Fires when the active projection changes. |
| `error` | `{ code, message, where }` | Fires for failed commands. |

Method errors are also rejections of the corresponding Promise, so listening on `error` is optional.

## Examples

### Headless map driven from your app

```html
<div id="map" style="width: 100%; height: 500px;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  const map = GeoJSONApp("create", {
    element: "#map",
    center: [85.32, 27.71],
    zoom: 11,
    theme: "dark",
    projection: "globe",
    chrome: "none",
  });

  (async () => {
    await map.ready();

    // Fly somewhere new without re-mounting.
    await map.flyTo({ center: [83.99, 28.21], zoom: 11, duration: 800 });

    // Switch themes; camera state is preserved.
    await map.setTheme("light");

    // Drop your own data on the map.
    await map.setGeoJSON({
      type: "FeatureCollection",
      features: [
        { type: "Feature",
          geometry: { type: "Point", coordinates: [83.99, 28.21] },
          properties: { name: "Pokhara" } },
      ],
    });

    // React to user interactions.
    const off = map.on("click", ({ lngLat, features }) => {
      console.log("Clicked", lngLat, features);
    });
    // Later: off();
  })();
</script>
```

### Static one-shot embed (legacy)

```html
<div id="map" style="width: 100%; height: 400px;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#map",
    geojson: "https://example.com/regions.geojson",
    theme: "dark",
    projection: "globe",
  });
</script>
```

### Dashboard updating in real time

```js
const map = GeoJSONApp("create", { element: "#map", chrome: "none" });
await map.ready();

setInterval(async () => {
  const fc = await fetchLatestSnapshot();
  await map.setGeoJSON(fc);
}, 5000);
```

### Multiple maps on one page

```js
const a = GeoJSONApp("create", { element: "#map-a", geojson: "/a.geojson" });
const b = GeoJSONApp("create", { element: "#map-b", geojson: "/b.geojson", theme: "dark" });
```

## postMessage Protocol (v1)

The SDK is a thin wrapper around a postMessage protocol. If you can't or don't want to use `embed.js`, you can target the protocol directly.

**Host → iframe (command):**
```js
iframe.contentWindow.postMessage({
  source: "geojson.app.embed",
  v: 1,
  id: "<uuid>",
  method: "flyTo",
  args: { center: [85.3, 27.7], zoom: 11, duration: 800 },
}, "https://geojson.app");
```

**Iframe → host (response):**
```js
// success
{ source: "geojson.app.embed", v: 1, replyTo: "<uuid>", ok: true, result: undefined }
// failure
{ source: "geojson.app.embed", v: 1, replyTo: "<uuid>", ok: false,
  error: { code: "method_failed", message: "..." } }
```

**Iframe → host (event push):**
```js
{ source: "geojson.app.embed", v: 1, event: "click",
  payload: { lngLat: [85.3, 27.7], features: [...] } }
```

Method names are the same as the imperative API: `flyTo`, `jumpTo`, `fitBounds`, `setTheme`, `setProjection`, `setGeoJSON`, `addLayer`, `removeLayer`, `clearLayers`, `getCenter`, `getZoom`, `getBearing`, `getBounds`.

## Embed Behavior

When a map is embedded:

- **Top bar**: The geojson.app logo and search bar are always hidden in embed mode.
- **Layer panel & toolbar**: Shown only when `chrome: "full"`.
- **Context menu**: Available when `interactive: true` and `chrome` is `"full"` or `"minimal"`.
- **Auto-load**: A `geojson` URL is fetched and rendered automatically.
- **Imperative updates**: `flyTo`, `setTheme`, `setGeoJSON`, etc. take effect in place — no iframe re-mount, no flicker.

## CORS Requirements

The GeoJSON URL is fetched client-side. The server hosting the file must include CORS headers:

```
Access-Control-Allow-Origin: *
```

If the GeoJSON file is hosted on GitHub, use the raw URL:
```
https://raw.githubusercontent.com/user/repo/main/data.geojson
```

## Supported GeoJSON Formats

- **FeatureCollection** — standard GeoJSON with multiple features
- **Feature** — a single Feature, automatically wrapped in a FeatureCollection

## Feature Styling

GeoJSON features support [simplestyle-spec](https://github.com/mapbox/simplestyle-spec) properties:

| Property | Description |
|----------|-------------|
| `marker-color` | Marker fill color (Point geometries) |
| `stroke` | Line/polygon outline color |
| `stroke-width` | Line/polygon outline width |
| `stroke-opacity` | Line/polygon outline opacity |
| `fill` | Polygon fill color |
| `fill-opacity` | Polygon fill opacity |

### Example

```json
{
  "type": "Feature",
  "properties": {
    "name": "Central Park",
    "fill": "#2ecc71",
    "fill-opacity": 0.4,
    "stroke": "#27ae60",
    "stroke-width": 2
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-73.981, 40.768], [-73.958, 40.800], [-73.949, 40.797], [-73.973, 40.764], [-73.981, 40.768]]]
  }
}
```

## Themes

| Theme | Name | Description |
|-------|------|-------------|
| `light` | Light | Default light map with blue tones |
| `dark` | Dark | Dark map with muted colors |
| `white` | Clean | Minimal white/light gray map |
| `grayscale` | Mono | Grayscale map |
| `black` | Midnight | Very dark map |
