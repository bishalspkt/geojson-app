# geojson.app Developer API

A complete reference for embedding and programmatically controlling geojson.app maps from your own application.

- **SDK script**: `https://geojson.app/embed.js`
- **Global**: `window.GeoJSONApp`
- **Current protocol version**: `1`
- **Bundle size**: ~5 kB / ~2 kB gzipped

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [`GeoJSONApp("create", options)`](#geojsonappcreate-options)
6. [Chrome & Attribution](#chrome--attribution)
7. [`EmbedInstance` Reference](#embedinstance-reference)
8. [Events](#events)
9. [postMessage Protocol (v1)](#postmessage-protocol-v1)
10. [Error Reference](#error-reference)
11. [Recipes](#recipes)
12. [GeoJSON Sources & CORS](#geojson-sources--cors)
13. [Feature Styling (simplestyle-spec)](#feature-styling-simplestyle-spec)
14. [Themes](#themes)
15. [TypeScript Types](#typescript-types)
16. [Browser Support](#browser-support)
17. [Versioning & Compatibility](#versioning--compatibility)

---

## Overview

geojson.app exposes an embeddable, scriptable map. There are two ways to use it:

- **One-shot embed** — pass props to `GeoJSONApp("create", ...)` and forget. Good for static maps in articles, READMEs, and dashboards that don't need to change after load.
- **Imperative embed** — capture the returned `EmbedInstance` and drive the map programmatically (`flyTo`, `setTheme`, `setGeoJSON`, ...) and listen to events (`click`, `moveend`, ...). Good for voice agents, real-time dashboards, presentations, and any host UI that already manages its own state.

Both modes share the same iframe + protocol; the imperative methods round-trip via `postMessage`.

---

## Installation

Add the SDK to your page:

```html
<script src="https://geojson.app/embed.js"></script>
```

It exposes a single global, `window.GeoJSONApp`. Each call to `GeoJSONApp("create", ...)` returns an independent `EmbedInstance`.

### Async / deferred loading

You can call `GeoJSONApp("create", ...)` **before** the script has loaded by installing the standard queue stub. Note: when the SDK loads asynchronously, queued calls **don't return an `EmbedInstance`** — they're fire-and-forget. If you need the imperative API, load the SDK synchronously.

```html
<script>
  window.GeoJSONApp = window.GeoJSONApp || function () {
    (window.GeoJSONApp.q = window.GeoJSONApp.q || []).push(arguments);
  };
</script>
<script src="https://geojson.app/embed.js" async></script>
<script>
  GeoJSONApp("create", { element: "#map", geojson: "/data.geojson" });
</script>
```

---

## Quick Start

### One-shot embed

```html
<div id="map" style="width: 100%; height: 450px;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#map",
    geojson: "https://example.com/data.geojson",
  });
</script>
```

### Imperative embed

```html
<div id="map" style="width: 100%; height: 500px;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  const map = GeoJSONApp("create", {
    element: "#map",
    chrome: "none",
    theme: "dark",
    projection: "globe",
  });

  (async () => {
    await map.ready();
    await map.flyTo({ center: [85.32, 27.71], zoom: 11, duration: 800 });

    map.on("click", ({ lngLat, features }) => {
      console.log("clicked at", lngLat, "features:", features);
    });
  })();
</script>
```

---

## Core Concepts

### The iframe model

`GeoJSONApp("create", ...)` builds an `<iframe>` pointed at `https://geojson.app/?embed=1&...` and inserts it into your container. The iframe owns the MapLibre canvas; your page communicates with it exclusively through `postMessage`.

### The command queue and `ready()`

Methods like `flyTo` can be called immediately after `create()`. They're internally **queued** until the iframe's `load` event fires, then dispatched in order. `instance.ready()` resolves at that same moment.

You don't *have* to `await ready()` before calling commands — but doing so makes intent explicit and lets you handle initialisation failures with one `try/catch`.

### Timeouts

Every method has a **5-second timeout**. If the iframe doesn't acknowledge within that window, the returned Promise rejects with an error whose `.code` is `"timeout"`. This protects host pages against a hung or detached iframe.

### Cross-origin safety

The SDK sends commands with a fixed `targetOrigin` (the origin from which `embed.js` was loaded). The iframe accepts commands only when their source `Window` matches its own; responses include `replyTo` IDs so out-of-order or spoofed messages can't satisfy your pending Promises.

---

## `GeoJSONApp("create", options)`

Creates a map instance inside `options.element` and returns an `EmbedInstance`.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `element` | `string \| HTMLElement` | **required** | CSS selector or DOM node to mount into. |
| `geojson` | `string` | — | URL to a GeoJSON file (`Feature` or `FeatureCollection`). Auto-loaded after init. |
| `center` | `[lng, lat]` | `[105, -5]` | Initial map center. |
| `zoom` | `number` | `2.8` | Initial zoom (0–22). |
| `theme` | `MapTheme` | `"light"` | One of `"light"`, `"dark"`, `"white"`, `"grayscale"`, `"black"`. |
| `projection` | `"mercator" \| "globe"` | `"mercator"` | Map projection. |
| `interactive` | `boolean` | `true` | If `false`, all pointer interactions are disabled. |
| `chrome` | `"full" \| "minimal" \| "none"` | `"minimal"` (embed) | UI to show. See [Chrome & Attribution](#chrome--attribution). |
| `attribution` | `"visible" \| "compact"` | `"visible"` (or `"compact"` when `chrome: "none"`) | Style of the OSM/Protomaps attribution. |
| `controls` | `boolean` | `false` | **Deprecated.** `true` ≡ `chrome: "full"`. |
| `width` | `string` | `"100%"` | CSS width for the iframe. |
| `height` | `string` | `"100%"` | CSS height for the iframe. |

### Return value

Synchronous: an `EmbedInstance`. See [`EmbedInstance` Reference](#embedinstance-reference).

If the queue stub form is used (async script load), the call returns `undefined`.

### Errors thrown synchronously

- `Error("Element not found: ...")` — `options.element` couldn't be resolved.

---

## Chrome & Attribution

The `chrome` option controls the in-iframe UI.

| `chrome` value | Layer panel | Context menu | Attribution default |
|---|---|---|---|
| `"full"` | shown | shown | `visible` |
| `"minimal"` _(default in embed)_ | hidden | shown if `interactive` | `visible` |
| `"none"` | hidden | hidden | `compact` |

Notes:

- The top bar (logo + search) is **never** shown in embed mode, regardless of `chrome`. This preserves prior behavior and keeps the canvas clean for host UIs.
- Attribution always renders in *some* form (OSM/Protomaps licence compliance).
- `chrome: "none"` is intended for hosts that paint their own overlays/controls.

---

## `EmbedInstance` Reference

All methods (except `destroy`) are **async** and return Promises. All reject after 5 s with `{ code: "timeout" }` if the iframe doesn't respond.

```ts
type EmbedInstance = {
  iframe: HTMLIFrameElement;
  destroy(): void;

  ready(): Promise<void>;

  // Camera
  flyTo(opts: FlyToArgs): Promise<void>;
  jumpTo(opts: JumpToArgs): Promise<void>;
  fitBounds(bounds: Bounds, opts?: FitBoundsArgs): Promise<void>;

  // State
  setTheme(theme: MapTheme): Promise<void>;
  setProjection(projection: "mercator" | "globe"): Promise<void>;

  // Data
  setGeoJSON(data: GeoJSONInput): Promise<void>;
  addLayer(spec: AddLayerArgs): Promise<void>;
  removeLayer(id: string): Promise<void>;
  clearLayers(): Promise<void>;

  // Inspection
  getCenter(): Promise<[lng, lat]>;
  getZoom(): Promise<number>;
  getBearing(): Promise<number>;
  getBounds(): Promise<[[lng, lat], [lng, lat]]>;

  // Events
  on(event: EmbedEvent, cb: (payload: unknown) => void): () => void;
  off(event: EmbedEvent, cb: (payload: unknown) => void): void;
};
```

### Lifecycle

#### `iframe: HTMLIFrameElement`

The created iframe DOM node. You generally shouldn't modify it directly, but it's exposed for inspection, dimensions, accessibility attributes, etc.

#### `destroy(): void`

Tears down the iframe, removes event listeners, clears the resize observer, and rejects all pending Promises with `{ code: "destroyed" }`. Idempotent.

```ts
const map = GeoJSONApp("create", { element: "#map" });
// ...later
map.destroy();
```

#### `ready(): Promise<void>`

Resolves once the iframe's MapLibre map fires `load`. Commands called before `ready()` are buffered and dispatched in order after `load`. Rejects with `{ code: "destroyed" }` if you destroy before `load`.

```ts
await map.ready();
```

### Camera

#### `flyTo(opts): Promise<void>`

Smoothly animates to a new camera position.

| Field | Type | Description |
|---|---|---|
| `center` | `[lng, lat]` | Target center. |
| `zoom` | `number` | Target zoom. |
| `bearing` | `number` | Target bearing in degrees. |
| `pitch` | `number` | Target pitch in degrees. |
| `duration` | `number` | Animation duration in milliseconds. |

All fields optional; omitted fields keep their current values.

```ts
await map.flyTo({ center: [83.99, 28.21], zoom: 12, duration: 800 });
```

#### `jumpTo(opts): Promise<void>`

Like `flyTo`, but instantaneous (no animation).

```ts
await map.jumpTo({ center: [83.99, 28.21], zoom: 12 });
```

#### `fitBounds(bounds, opts?): Promise<void>`

Frames the camera so the given bounds are visible.

| Param | Type | Description |
|---|---|---|
| `bounds` | `[[lng, lat], [lng, lat]]` | SW + NE corners. |
| `opts.padding` | `number` | Pixel padding around the bounds. |
| `opts.duration` | `number` | Animation duration in milliseconds. |
| `opts.maxZoom` | `number` | Cap zoom level. |

```ts
await map.fitBounds(
  [[83.5, 27.5], [84.5, 28.5]],
  { padding: 40, maxZoom: 14, duration: 600 },
);
```

### State

#### `setTheme(theme): Promise<void>`

Switches the basemap theme. The camera (center/zoom/bearing/pitch) and overlay data are preserved across the swap. Fires a `theme:change` event.

```ts
await map.setTheme("dark");
```

Valid values: `"light"`, `"dark"`, `"white"`, `"grayscale"`, `"black"`. Throws `method_failed` if the value is invalid.

#### `setProjection(projection): Promise<void>`

Switches between `"mercator"` and `"globe"`. Fires a `projection:change` event.

```ts
await map.setProjection("globe");
```

### Data

#### `setGeoJSON(data): Promise<void>`

Replaces the primary data layer with the given GeoJSON. Accepts:

- a `FeatureCollection`
- a single `Feature` (wrapped automatically)
- a stringified JSON of either of the above

After loading, the map auto-fits the new bounds.

```ts
await map.setGeoJSON({
  type: "FeatureCollection",
  features: clusters.map(c => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: c.location },
    properties: { name: c.topic },
  })),
});
```

#### `addLayer({ id, data, paint? }): Promise<void>`

Adds a named overlay layer alongside the primary data. Useful for layering hover heatmaps, route lines, or pinned markers on top of an existing dataset.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique layer id. Re-using an id replaces the existing layer. |
| `data` | `FeatureCollection \| Feature` | Layer data. |
| `paint` | `Record<string, unknown>` _(optional)_ | MapLibre paint spec to merge over the defaults. See [Layer paint spec](#layer-paint-spec). |

```ts
await map.addLayer({
  id: "route",
  data: routeFeatureCollection,
  paint: { "line-color": "#ff5722", "line-width": 3 },
});
```

#### `removeLayer(id): Promise<void>`

Removes a layer previously added with `addLayer`.

```ts
await map.removeLayer("route");
```

#### `clearLayers(): Promise<void>`

Removes **all** layers added via `addLayer`. Does not touch the primary data set via `setGeoJSON` or the `geojson` URL.

```ts
await map.clearLayers();
```

##### Layer paint spec

`addLayer` picks the MapLibre layer type from the first feature's geometry:

| Geometry | Layer type | Default paint |
|---|---|---|
| `Point`, `MultiPoint` | `circle` | radius 6, fill `#1d4ed8`, white stroke 1.5 px |
| `LineString`, `MultiLineString` | `line` | color `#1d4ed8`, width 2 |
| `Polygon`, `MultiPolygon` | `fill` | color `#1d4ed8`, opacity 0.35, outline `#1d4ed8` |

`paint` is merged on top of these defaults using MapLibre's paint-property names (`circle-radius`, `line-color`, `fill-opacity`, etc.).

### Inspection

All inspection methods return the current value as a Promise.

#### `getCenter(): Promise<[lng, lat]>`

```ts
const [lng, lat] = await map.getCenter();
```

#### `getZoom(): Promise<number>`

```ts
const z = await map.getZoom();
```

#### `getBearing(): Promise<number>`

Returns the current bearing in degrees clockwise from north.

#### `getBounds(): Promise<[[lng, lat], [lng, lat]]>`

Returns `[southwest, northeast]` corners of the current viewport.

### Events

#### `on(event, cb): () => void`

Registers a listener. Returns an **unsubscribe** function; it's equivalent to `off(event, cb)`.

```ts
const off = map.on("click", ({ lngLat, features }) => {
  console.log(lngLat, features);
});
// stop listening
off();
```

Listeners that throw don't break the dispatcher — exceptions are logged and other listeners still fire.

#### `off(event, cb): void`

Removes a previously-registered listener for the exact `cb` reference.

---

## Events

| Event | Payload | When it fires |
|---|---|---|
| `load` | _(none)_ | Once, when the iframe's MapLibre map emits `load`. |
| `move` | `{ center, zoom, bearing, pitch }` | While the camera is animating or being dragged. Throttled to ~60 fps via `requestAnimationFrame`. |
| `moveend` | `{ center, zoom, bearing, pitch, bounds }` | Once the camera settles. `bounds` is `[[lng, lat], [lng, lat]]`. |
| `click` | `{ lngLat, features }` | On a map click. `features` lists overlay features (uploaded GeoJSON + `addLayer` layers, **basemap features excluded**). Each is a standard GeoJSON `Feature` with `geometry` and `properties`. |
| `theme:change` | `{ theme }` | After `setTheme` succeeds. |
| `projection:change` | `{ projection }` | After `setProjection` succeeds. |
| `error` | `{ code, message, where }` | A command failed. `where` is the method name. |

Payload conventions:

- All coordinates are `[lng, lat]` arrays of two numbers.
- All zoom/bearing/pitch are numbers (`zoom` 0–22, `bearing` 0–360, `pitch` 0–60).
- `lngLat` is always `[lng, lat]` (longitude first), matching GeoJSON convention.

---

## postMessage Protocol (v1)

The SDK is a thin wrapper over a versioned postMessage protocol. You can target it directly — useful for languages/frameworks where embedding a JS SDK is awkward, for sandboxed contexts, or for writing your own SDK in another language.

### Wire format

Every protocol message has these envelope fields:

- `source: "geojson.app.embed"` (constant string discriminator)
- `v: 1` (protocol version — bump on breaking changes)

#### Host → iframe — command

```js
iframe.contentWindow.postMessage({
  source: "geojson.app.embed",
  v: 1,
  id: "<uuid>",            // your correlation id; will be echoed in replyTo
  method: "flyTo",         // see method list below
  args: { center: [85.3, 27.7], zoom: 11, duration: 800 },
}, "https://geojson.app");
```

#### Iframe → host — response (success)

```js
{
  source: "geojson.app.embed",
  v: 1,
  replyTo: "<uuid>",
  ok: true,
  result: undefined,       // void; or the return value for inspection methods
}
```

#### Iframe → host — response (failure)

```js
{
  source: "geojson.app.embed",
  v: 1,
  replyTo: "<uuid>",
  ok: false,
  error: { code: "method_failed", message: "setTheme: invalid theme \"chartreuse\"" },
}
```

#### Iframe → host — event push

```js
{
  source: "geojson.app.embed",
  v: 1,
  event: "moveend",
  payload: { center: [85.3, 27.7], zoom: 11, bearing: 0, pitch: 0,
             bounds: [[85.1, 27.6], [85.5, 27.8]] },
}
```

### Method names

`flyTo`, `jumpTo`, `fitBounds`, `setTheme`, `setProjection`, `setGeoJSON`, `addLayer`, `removeLayer`, `clearLayers`, `getCenter`, `getZoom`, `getBearing`, `getBounds`.

Argument shapes match the imperative API exactly. See [`EmbedInstance` Reference](#embedinstance-reference) above.

### Minimal vanilla-JS client

```js
const iframe = document.querySelector("iframe");
const pending = new Map();

function call(method, args) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("timeout"));
    }, 5000);
    pending.set(id, { resolve, reject, timer });
    iframe.contentWindow.postMessage(
      { source: "geojson.app.embed", v: 1, id, method, args },
      "https://geojson.app",
    );
  });
}

window.addEventListener("message", (ev) => {
  const d = ev.data;
  if (!d || d.source !== "geojson.app.embed" || d.v !== 1) return;
  if ("replyTo" in d) {
    const p = pending.get(d.replyTo);
    if (!p) return;
    pending.delete(d.replyTo);
    clearTimeout(p.timer);
    d.ok ? p.resolve(d.result) : p.reject(new Error(d.error.message));
  } else if ("event" in d) {
    console.log("event:", d.event, d.payload);
  }
});
```

---

## Error Reference

Methods reject with `Error` objects that carry a `.code` property. The `error` event payload uses the same `code` strings.

| `code` | Meaning |
|---|---|
| `timeout` | The iframe didn't respond within 5 seconds. The map may be hung, the iframe may be detached, or the worker may have crashed. |
| `destroyed` | The instance was destroyed before the command resolved (or before `ready()` resolved). |
| `detached` | The iframe has no `contentWindow` (typically removed from the DOM). |
| `postmessage_failed` | The underlying `postMessage` call threw — usually a serialization issue (e.g. non-cloneable values in `args`). |
| `method_failed` | The command was received but the iframe rejected it. The `.message` describes the cause (validation error, unknown method, runtime exception). |

Typical handling pattern:

```ts
try {
  await map.setTheme(userInput);
} catch (err) {
  if (err.code === "method_failed") {
    showToast(`Theme rejected: ${err.message}`);
  } else if (err.code === "timeout") {
    showToast("Map is not responding.");
  } else {
    throw err;
  }
}
```

---

## Recipes

### Voice agent: turn-by-turn camera

```ts
const map = GeoJSONApp("create", { element: "#map", chrome: "none", theme: "dark" });
await map.ready();

async function handleCommand(cmd) {
  if (cmd.intent === "show_location") {
    await map.flyTo({ center: cmd.location, zoom: 12, duration: 1000 });
  } else if (cmd.intent === "switch_theme") {
    await map.setTheme(cmd.theme);
  }
}
```

### Real-time dashboard

```ts
const map = GeoJSONApp("create", { element: "#map", chrome: "none" });
await map.ready();

const ws = new WebSocket("wss://example.com/live");
ws.onmessage = async ({ data }) => {
  const fc = JSON.parse(data);
  await map.setGeoJSON(fc);
};
```

### Stepping through a presentation

```ts
const map = GeoJSONApp("create", { element: "#map", chrome: "none", theme: "white" });
await map.ready();

const slides = [
  { center: [85.32, 27.71], zoom: 11 },     // Kathmandu
  { center: [83.99, 28.21], zoom: 11 },     // Pokhara
  { center: [86.92, 27.99], zoom: 12 },     // Lukla
];

document.addEventListener("keydown", async (e) => {
  if (e.key !== "ArrowRight") return;
  const next = slides.shift();
  if (next) await map.flyTo({ ...next, duration: 1200 });
});
```

### Click → detail panel

```ts
const map = GeoJSONApp("create", { element: "#map", geojson: "/clusters.geojson" });
await map.ready();

map.on("click", ({ lngLat, features }) => {
  const top = features[0];
  if (!top) return hideDetail();
  showDetail(top.properties);
});
```

### Sync two maps side-by-side

```ts
const a = GeoJSONApp("create", { element: "#a", chrome: "none" });
const b = GeoJSONApp("create", { element: "#b", chrome: "none" });
await Promise.all([a.ready(), b.ready()]);

let syncing = false;
function sync(from, to) {
  from.on("moveend", async ({ center, zoom, bearing, pitch }) => {
    if (syncing) return;
    syncing = true;
    await to.jumpTo({ center, zoom, bearing, pitch });
    syncing = false;
  });
}
sync(a, b);
sync(b, a);
```

### Replace static-style image with an interactive embed

```html
<a href="https://geojson.app/?geojson=...">
  <img src="/map.png" alt="Map of cities" />
</a>
<!-- becomes -->
<div id="map" style="aspect-ratio: 16/9; max-width: 800px;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", { element: "#map", geojson: "/cities.geojson" });
</script>
```

---

## GeoJSON Sources & CORS

The iframe fetches `options.geojson` and `setGeoJSON` URLs *client-side*. The hosting server must allow it:

```
Access-Control-Allow-Origin: *
```

For GitHub-hosted files, use the **raw** URL:

```
https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path>.geojson
```

Supported shapes:

- `FeatureCollection` — standard.
- `Feature` — single feature; auto-wrapped into a `FeatureCollection`.

When you pass a parsed object to `setGeoJSON` directly, no fetch is needed — the data crosses the iframe boundary via `structuredClone`. Empirically, this scales to ~50k point features; if you need more, host a file and pass its URL via the `geojson` option or via a URL parameter.

---

## Feature Styling (simplestyle-spec)

Features can self-describe their styling using [simplestyle-spec](https://github.com/mapbox/simplestyle-spec):

| Property | Applies to | Notes |
|---|---|---|
| `marker-color` | `Point`, `MultiPoint` | Fill color. |
| `marker-size` | `Point`, `MultiPoint` | `"small" \| "medium" \| "large"`. |
| `marker-symbol` | `Point`, `MultiPoint` | Maki icon name or a single character. |
| `stroke` | line + polygon | Outline color. |
| `stroke-width` | line + polygon | Outline width in pixels. |
| `stroke-opacity` | line + polygon | Outline opacity 0–1. |
| `fill` | polygon | Fill color. |
| `fill-opacity` | polygon | Fill opacity 0–1. |

Example:

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
  "geometry": { "type": "Polygon", "coordinates": [[ /* ... */ ]] }
}
```

For `addLayer`, the `paint` option uses **MapLibre paint spec keys directly** (e.g. `line-color`, not `stroke`).

---

## Themes

| `theme` | Description |
|---|---|
| `"light"` | Default. Light basemap with blue water. |
| `"dark"` | Dark basemap, muted UI accents. |
| `"white"` | Minimal white/light grey. |
| `"grayscale"` | Monochrome. |
| `"black"` | Near-black "Midnight" — high-contrast. |

Use `setTheme` to switch at runtime; camera and overlay state are preserved.

---

## TypeScript Types

The SDK doesn't ship a `.d.ts`, but the public types are stable. Copy this into your project for IDE support:

```ts
type LngLat = [number, number];
type Bounds = [LngLat, LngLat];

type MapTheme = "light" | "dark" | "white" | "grayscale" | "black";
type MapProjection = "mercator" | "globe";

interface EmbedOptions {
  element: string | HTMLElement;
  geojson?: string;
  center?: LngLat;
  zoom?: number;
  theme?: MapTheme;
  projection?: MapProjection;
  interactive?: boolean;
  chrome?: "full" | "minimal" | "none";
  attribution?: "visible" | "compact";
  /** @deprecated use `chrome` instead. */
  controls?: boolean;
  width?: string;
  height?: string;
}

interface FlyToArgs {
  center?: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  duration?: number;
}
interface JumpToArgs {
  center?: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
}
interface FitBoundsArgs {
  padding?: number;
  duration?: number;
  maxZoom?: number;
}

interface AddLayerArgs {
  id: string;
  data: string | object;          // FeatureCollection | Feature
  paint?: Record<string, unknown>;
}

type EmbedEvent =
  | "load"
  | "move"
  | "moveend"
  | "click"
  | "theme:change"
  | "projection:change"
  | "error";

interface EmbedInstance {
  iframe: HTMLIFrameElement;
  destroy(): void;
  ready(): Promise<void>;

  flyTo(opts: FlyToArgs): Promise<void>;
  jumpTo(opts: JumpToArgs): Promise<void>;
  fitBounds(bounds: Bounds, opts?: FitBoundsArgs): Promise<void>;

  setTheme(theme: MapTheme): Promise<void>;
  setProjection(projection: MapProjection): Promise<void>;

  setGeoJSON(data: string | object): Promise<void>;
  addLayer(spec: AddLayerArgs): Promise<void>;
  removeLayer(id: string): Promise<void>;
  clearLayers(): Promise<void>;

  getCenter(): Promise<LngLat>;
  getZoom(): Promise<number>;
  getBearing(): Promise<number>;
  getBounds(): Promise<Bounds>;

  on(event: EmbedEvent, cb: (payload: unknown) => void): () => void;
  off(event: EmbedEvent, cb: (payload: unknown) => void): void;
}

declare global {
  interface Window {
    GeoJSONApp: (action: "create", opts: EmbedOptions) => EmbedInstance;
  }
}
```

---

## Browser Support

- Modern evergreen browsers: Chrome, Firefox, Safari, Edge.
- Requires: `postMessage`, `ResizeObserver`, `Promise`, `URLSearchParams`, `crypto.randomUUID` (falls back to a deterministic v4 generator on older browsers).
- Mobile Safari and Chrome on Android are supported. The `globe` projection requires WebGL2; on devices without WebGL2 the projection falls back to `mercator`.
- The iframe enables `allow="geolocation; clipboard-write"` and `allowfullscreen`.

---

## Versioning & Compatibility

### Embed URL parameters (also accepted directly on `https://geojson.app/?embed=1&...`)

`embed`, `center`, `zoom`, `theme`, `projection`, `geojson`, `interactive`, `chrome`, `attribution`, `controls` _(deprecated)_.

### postMessage protocol version

The `v` field on every protocol message is currently `1`. Bumps will be announced; older versions will continue to be served at least one minor cycle after a new version ships.

### Stability guarantees

- **Stable** (won't change without a major version bump):
  - URL parameter names accepted by `?embed=1`.
  - `GeoJSONApp("create", ...)` signature and option names.
  - `EmbedInstance` method names and signatures.
  - Event names, payload shape, and `code` strings on errors.
  - postMessage envelope (`source`, `v`, `id`/`replyTo`, `method`/`event`).
- **May evolve** without notice:
  - The DOM/CSS inside the iframe (don't reach into it).
  - The exact MapLibre version under the hood.
  - Default styling of layers added via `addLayer` (override with `paint`).

### Deprecations

- `controls: boolean` — superseded by `chrome`. `controls: true` is silently mapped to `chrome: "full"` and will continue to work indefinitely. New code should use `chrome` directly.
