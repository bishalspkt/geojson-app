# Embedding geojson.app Maps

geojson.app provides a lightweight JavaScript SDK (`embed.js`) that lets you add interactive maps with GeoJSON data to any website.

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

### Async Loading (Recommended)

For non-blocking loading, queue commands before the SDK loads:

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

## API

### `GeoJSONApp("create", options)`

Creates a new map instance inside the specified element.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `element` | `string \| HTMLElement` | _(required)_ | CSS selector or DOM element to mount the map into. |
| `geojson` | `string` | — | URL to a GeoJSON file (`FeatureCollection` or `Feature`). |
| `center` | `[lng, lat]` | `[105, -5]` | Initial map center as `[longitude, latitude]`. |
| `zoom` | `number` | `2.8` | Initial zoom level (0–22). |
| `theme` | `string` | `"light"` | Map theme: `"light"`, `"dark"`, `"white"`, `"grayscale"`, `"black"`. |
| `projection` | `string` | `"mercator"` | Map projection: `"mercator"` or `"globe"`. |
| `interactive` | `boolean` | `true` | Enable map pan, zoom, and click interactions. |
| `controls` | `boolean` | `false` | Show the features toolbar. |
| `width` | `string` | `"100%"` | CSS width for the iframe. |
| `height` | `string` | `"100%"` | CSS height for the iframe. |

#### Return Value

The `create` command stores an instance internally. Each instance has:

- `iframe` — the `HTMLIFrameElement` created
- `destroy()` — removes the iframe and cleans up observers

## Examples

### Basic Map

```html
<div id="map" style="width: 100%; height: 400px;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#map",
    geojson: "https://example.com/regions.geojson",
  });
</script>
```

### Dark Theme with Globe Projection

```html
<div id="map-globe" style="width: 100%; height: 500px; border-radius: 12px; overflow: hidden;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#map-globe",
    geojson: "https://example.com/flights.geojson",
    theme: "dark",
    projection: "globe",
  });
</script>
```

### Centered on a Specific Location

```html
<div id="map-nyc" style="width: 100%; height: 450px; border-radius: 8px; overflow: hidden;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#map-nyc",
    geojson: "https://example.com/parks.geojson",
    center: [-73.98, 40.75],
    zoom: 12,
    theme: "white",
  });
</script>
```

### Static (Non-Interactive) Map

```html
<div id="map-static" style="width: 600px; height: 400px;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#map-static",
    geojson: "https://example.com/boundaries.geojson",
    interactive: false,
    center: [2.35, 48.86],
    zoom: 10,
  });
</script>
```

### Multiple Maps on One Page

```html
<div id="map-a" style="width: 100%; height: 300px;"></div>
<div id="map-b" style="width: 100%; height: 300px;"></div>
<script src="https://geojson.app/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#map-a",
    geojson: "https://example.com/rivers.geojson",
    theme: "light",
  });
  GeoJSONApp("create", {
    element: "#map-b",
    geojson: "https://example.com/mountains.geojson",
    theme: "dark",
    projection: "globe",
  });
</script>
```

## Embed Behavior

When a map is embedded:

- **No top bar**: The geojson.app logo, title, search bar, and settings button are hidden.
- **Minimal toolbar**: Only a "Features" button is shown by default.
- **Controls**: When `controls: true`, additional toolbar buttons appear and the Features panel renders as a 260px left sidebar.
- **Context menu**: Right-click context menu is available when `interactive: true`.
- **Auto-load**: The GeoJSON URL is fetched and rendered automatically.

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
