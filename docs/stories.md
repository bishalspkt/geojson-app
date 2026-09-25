# Stories: guided map narratives

A **story** is a JSON document that bundles data layers and imagery with an ordered list of **chapters**. Each chapter moves the camera (optionally in 3D over terrain), decides which layers are visible, and can play the timeline, animate tracks, and open a before/after swipe comparison. Stories are how geojson.app presents analysis: the [Bhote Koshi–Trishuli 2026 story](../public/stories/bhotekoshi-2026/story.json) is the reference example, and its build pipeline lives in [`stories/bhotekoshi-2026/`](../stories/bhotekoshi-2026/).

Everything stays static and cheap: a story is a JSON file plus GeoJSON and images served from any static host (Cloudflare Pages for the built-in ones). Satellite imagery can stream directly from keyless public services (NASA GIBS) or, at full resolution, from cloud-optimised GeoTIFFs in open buckets (Vantor/Maxar Open Data, Planet on Source Cooperative, OpenAerialMap) — nothing is re-hosted.

## Opening a story

| Surface | How |
|---|---|
| Link | `https://geojson.app/?story=<url>&chapter=<index-or-id>` |
| App | Stories panel (or Import panel → Stories) |
| Embed | `GeoJSONApp("create", { element, story: url, chapter })` |
| SDK / agents | `map.loadStory(url, chapter?)`, `map.setStoryChapter(ref)`; event `story:chapter` |

Story URLs must be `http(s)` (or site-relative); relative URLs inside the document resolve against the document's own URL, so a story folder can be moved as a unit. The host must allow CORS for cross-origin stories.

## Document format (version 1)

```jsonc
{
  "version": 1,
  "title": "Nepal floods & debris flows",
  "subtitle": "…",                       // shown on the first chapter
  "theme": "light",                       // basemap theme while the story is open
  "credits": [{ "label": "BIPAD, Government of Nepal", "url": "https://bipadportal.gov.np" }],
  "layers": [ /* StoryLayer[] — loaded once, hidden until a chapter shows them */ ],
  "chapters": [ /* StoryChapter[] */ ]
}
```

### Layers

Two kinds. Ids are story-local (`[A-Za-z0-9_-]+`); in the app they become `story:<id>`.

```jsonc
// Vector data — any format a source provider understands (GeoJSON built in).
{
  "id": "villages", "type": "geojson", "name": "Villages in the flow path",
  "url": "data/villages.geojson",
  "paint":    { "circle-radius": 6 },                 // raw MapLibre paint overrides (optional)
  "display":  { "labelField": "name", "heatmap": false },
  "temporal": { "startField": "arrival" },            // timeline participation (see below)
  "legend":   { "kind": "swatches", "items": [{ "label": "Hit by the flow", "color": "#dc2626" }] },
  "attribution": "© OpenStreetMap contributors"
}

// Imagery — XYZ tiles (optionally time-templated) or one georeferenced image.
{
  "id": "s2-after", "type": "imagery", "name": "Sentinel-2 · 2024-10-28",
  "source": { "type": "image", "url": "img/thame-after.webp",
              "coordinates": [[86.60, 27.86], [86.70, 27.86], [86.70, 27.80], [86.60, 27.80]] },
  "attribution": "Contains modified Copernicus Sentinel data 2024"
}
{
  "id": "rain", "type": "imagery", "name": "GPM IMERG rain rate",
  "source": { "type": "xyz", "maxzoom": 6,
              "tiles": ["https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/{time}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png"] },
  "time": { "format": "datetime", "stepMinutes": 30, "default": "2024-09-27T12:00:00Z" },
  "opacity": 0.8
}
```

```jsonc
// A cloud-optimised GeoTIFF streamed straight from its bucket (needs CORS + HTTP range requests).
{
  "id": "vhr-after", "type": "imagery", "name": "WorldView-3 · 2026-08-27 (Rasuwagadhi)",
  "source": { "type": "cog",
              "url": "https://vantor-opendata.s3.amazonaws.com/events/Nepal-Flooding-Aug-2026/B040001100881610.tif",
              "bounds": [85.362, 28.264, 85.393, 28.291],   // optional clip (lon/lat), also limits tile requests
              "maxzoom": 20 },
  "attribution": "© Vantor Open Data (WorldView-3), CC BY-NC 4.0"
}
```

`{time}` in a tile template follows the timeline (quantized to `stepMinutes`, formatted as `date` / `datetime` / `month`); when the timeline is off it uses `time.default`.

**COG imagery** is read tile by tile in the browser (a `cog://` protocol backed by geotiff.js, decoding in a worker pool) and reprojected to Web Mercator on the fly from EPSG:4326, 3857 or any UTM zone (326xx/327xx). The overview nearest each tile's resolution is used, so a 30 cm scene or a 3.5 cm drone orthophoto shows at native detail when zoomed in and stays light when zoomed out. Pure black is treated as no-data. Headers are opened as soon as a layer becomes visible, so a chapter's scenes are usually ready when its camera flight lands.

### Chapters

```jsonc
{
  "id": "thame",                                   // used in ?chapter= links
  "kicker": "16 Aug 2024 · Solukhumbu",
  "title": "Thame: a glacial lake bursts",
  "body": "Paragraphs separated by blank lines. **Bold**, [links](https://…) and \"- \" bullet lists only.",
  "camera": { "center": [86.65, 27.84], "zoom": 13, "pitch": 65, "bearing": -30, "duration": 4000 },
  "layers": ["thame-flow", "villages"],            // everything else in the story hides
  "terrain": true, "exaggeration": 1.6,             // hillshade follows terrain unless "hillshade" is set
  "time": {
    "start": "2024-08-16T13:00:00+05:45", "end": "2024-08-16T16:00:00+05:45",
    "duration": 25, "autoplay": true, "timeZone": "Asia/Kathmandu",
    "windowMinutes": null,                         // null/omitted = cumulative
    "follow": { "layer": "thame-flow", "zoom": 14, "pitch": 70, "bearing": "track", "maxViewSpeed": 0.15 },
    "captions": [{ "time": "2024-08-16T13:10:00+05:45", "text": "The lake breaks out" }]
  },
  "compare": {
    "left": "s2-before", "right": "s2-after", "leftLabel": "Oct 2023", "rightLabel": "Oct 2024",
    "leftOptions":  [{ "layers": "s2-before", "label": "Oct 2023 · Sentinel-2" },
                     { "layers": ["drone-2023", "s2-before"], "label": "2023 drone survey on Sentinel-2" }],
    "rightOptions": [{ "layers": "s2-after", "label": "Oct 2024 · Sentinel-2" }]
  },
  "stats":   [{ "label": "Buildings hit", "value": "34" }],
  "chart":   { "kind": "bars", "title": "Deaths by year", "data": [{ "label": "2021", "value": 115 }] },
  // or { "kind": "line", "title": "River stage (m)", "series": [{ "label": "Galchhi", "color": "#0369a1", "points": [[6, 0], [10.5, 8.8]] }],
  //      "thresholds": [{ "y": 6, "label": "warning" }], "markers": [{ "x": 8.6, "label": "detachment" }], "xTicks": [{ "x": 6, "label": "06:00" }] }
  "sources": [{ "label": "ICIMOD field report", "url": "https://…" }]
}
```

- **Camera** — flights keep the target centered in the part of the map the story panel doesn't cover. They move at a constant perceived speed (long hops take longer, up to ~6.5 s; `duration` is the minimum) with ease-in/ease-out, and land at the requested zoom even when terrain heights arrive mid-flight.
- **Time** — enables the timeline with a locked extent. `autoplay` starts once the camera flight has landed. `captions` narrate the playback: each appears above the timeline as the playhead passes its `time` (and as a tick on the scrubber).
- **Chase camera** — `follow` makes the camera trail the head of that layer's animated track like a drone: critically damped springs on position, zoom, heading, pitch and ground height, advanced on the camera's own animation loop, so it eases in from the chapter camera and never snaps when the front speeds up, turns or stops. With `"bearing": "track"` it looks where the track goes over the next few kilometres, with a little lead room. With terrain on it keeps the head in sight, lowering the pitch (same zoom) before a ridge would come between camera and head; that limit is itself smoothed so the camera dips and rises gently. `maxViewSpeed` adds slow motion: while the front would cross more than that fraction of the view per second, the timeline slows down (a "slow motion" badge shows the pace). Dragging the map suspends following until the next play.
- **Compare** — `left` imagery renders on a synchronized secondary map clipped to the left of a draggable divider; `right` imagery is shown on the main map. Vector layers draw on both sides. `leftOptions` / `rightOptions` turn the side labels into menus of alternative scenes. A side may show several layers at once — e.g. a drone strip over a full-coverage scene — drawn in story layer order (later layers on top). `position` (0–1 of the map width) places the divider; by default it sits in the middle of the area the story panel leaves visible, and follows it until the reader drags it.
- **Media** — features with `image` / `video` / `url` properties (see [styling](styling.md#media-properties)) show a preview on hover and a media card with credit and licence when selected, so crowdsourced photos and videos can be pinned to the map.

## Time in data (any layer, not just stories)

The timeline works with ordinary GeoJSON. At import, layers are scanned for common time properties (`time`, `timestamp`, `datetime`, `date`, `start`/`end`, …); stories and SDK callers can set the config explicitly:

| `temporal` key | Meaning |
|---|---|
| `startField` / `endField` | Feature is shown from start (to end). Values: ISO-8601, `YYYY`, `YYYY-MM`, epoch ms or s. |
| `coordTimesField` | Lines with per-vertex timestamps (the `coordTimes` convention from GPX/KML converters) animate as a moving **track** with a glowing head. |
| `pulseMs` | How long a newly appeared point pulses (default: 4% of the timeline). |
| `trackColor` | Track colour (default orange). |

Timeline modes: **cumulative** (everything up to now) or **recent** (a sliding window). Space toggles play/pause.

## Building a story from data

Keep raw downloads and processing out of `public/`: put a pipeline next to the story (see `stories/bhotekoshi-2026/pipeline/`) that fetches open data with caching, processes it, and writes `public/stories/<name>/`. Budget sizes — the whole story should load in a few seconds on a phone: simplify geometry, round coordinates to ~1 m (5 decimals), and prefer WebP for imagery chips.
