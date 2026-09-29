# The Bhote Koshi–Trishuli disaster, 26 August 2026 — story pipeline

This folder builds the story served at `/stories/bhotekoshi-2026/story.json`. Open it in the app at `/?story=bhotekoshi-2026`; add `&chapter=<id>` to jump to a chapter. Everything in `public/stories/bhotekoshi-2026/` is generated from open data by the pipeline here. Rebuild it rather than editing it by hand.

```bash
cd stories/bhotekoshi-2026/pipeline
npm install                      # its own deps (turf, geotiff, proj4, sharp, d3-contour, h3-js)
node build.mjs                   # every step, in order (network responses cached in .cache/)
node build.mjs imagery story     # or any steps by name
```

Order matters where steps read each other's outputs: `event:rasuwa-2026 → population, hydropower → story`, and `imagery`, `media`, `unosat` before `story`. A warm rebuild from `.cache/` takes seconds except for the Sentinel-2 windows.

## The story (31 chapters)

Title and corridor · the source (seismic signal, UNOSAT detachment zone) · **riding the front** (chase camera with captions, 08:36–09:06) · the barrier lake · town-by-town before/after: Rasuwagadhi, Timure, Syabrubesi · the gauges that went silent (hydrographs) · the warning (lead time per town) · down the Trishuli (chase, 08:55–10:45) · hydropower (804 workers missing) · Simle/Upper Trishuli-3B · Betrawati · Trishuli and Bidur · Phosretar · Galchhi · six hours to the plains (chase, 10:20–16:10) · Malekhu/Benighat, Mugling, Devghat (Sentinel-2) · seen from the ground (crowdsourced media) · buildings · bridges and roads · Sentinel-2 change · where the debris went · the toll · where bodies were recovered · the bill · lessons · methods.

## Steps

| Step | Output (`public/stories/bhotekoshi-2026/…`) | Source |
|---|---|---|
| `boundaries`, `rivers` | `data/provinces`, `data/rivers-major` | geoBoundaries ADM1 (CC BY 3.0 IGO); OpenStreetMap named rivers (ODbL) |
| `ems` | `data/rasuwa-2026-ems-*` | Copernicus EMS EMSR927 grading (© European Union) |
| `event:rasuwa-2026` | `data/rasuwa-2026-flow/places/buildings/infra/change/keypoints`, `img/rasuwa-2026-<aoi>-before/after.webp` | see *Event method* |
| `gauges2026`, `hot2026` | `data/rasuwa-2026-gauges`, `data/rasuwa-2026-hot-extent`, `data/bridges-hot` | DHM gauges via Acharya & Paudel (2026), CC BY 4.0; HOT flood extent and bridge survey (HDX, ODbL) |
| `population` | `data/population-2km` + facts | Kontur Population H3 r8 (CC BY 4.0) |
| `unosat` | `data/unosat-detachment`, `unosat-lakes`, `unosat-extent`, `heritage` | UNOSAT FL20260826NPL map service (CC BY-SA 4.0) |
| `hydropower` | `data/hydropower` | `inputs/official-2026/hydropower_affected_2026.geojson` (NEA, NDRRMA, press; OSM/DoED locations) + HOT exposed hydropower (ODbL) |
| `imagery` | (facts: per-town scene lists) | Vantor Open Data and Planet Crisis Response scenes (CC BY-NC 4.0), NEA drone orthophotos on OpenAerialMap (CC BY 4.0), HOT post-event mosaic (CC BY-NC) — streamed by the app, not downloaded |
| `media` | `data/media` | `inputs/media/` snapshot: Wikimedia Commons, KartaView, Flickr (CC items only), YouTube links |
| `story` | `story.json`, `data/report-places` | assembles layers and chapters from the derived facts and `inputs/official-2026/` |

## Event method (`event.mjs`)

1. **Flow path** — Acharya & Paudel's centreline from the scar to Devghat (`inputs/flowpaths/`).
2. **Timing** — gauge and report arrival times at chainage anchors (`steps/events.mjs`, each with its source). The front moves at constant speed between anchors and eases between speeds around each (rounded corners, anchors shifted by at most 20 s). It shows when the front passed; it is not a hydraulic model.
3. **Exposure** — OpenStreetMap as it stood the day before (Overpass `[date:…]` attic queries): settlements, buildings within 200 m, bridges, hydropower, schools and health facilities near the channel.
4. **Before/after (10 m)** — Sentinel-2 L2A (Element 84 Earth Search), per stretch of the path, chosen for the least cloud and terrain shadow.
5. **Change** — NDVI drop ≥ 0.2 to below 0.25 with brightening, or water turned bright bare ground, within 500 m of the path; cloud, shadow and snow masked in both scenes.
6. **Building impact** — "hit" means inside a change polygon, or deleted from OSM after the event with nothing redrawn there.

## Town imagery (`steps/imagery.mjs`)

Each town lists its before and after scenes; the first of each is the default swipe pair and the rest become the swipe-label menus. The choice comes from a survey of every Vantor and Planet scene covering each town (cloud checked by eye on contact sheets). Drone orthophotos cover narrow strips, so the story lays them over the side's first full scene. The app streams every scene at native resolution from the providers' buckets through its `cog://` protocol; nothing is re-hosted.

No sub-metre scene exists before the event for the source, Phosretar or Galchhi, or after it for Simle (every post-event scene there is cloudy or hazy); Sentinel-2 fills those sides.

## Research and official figures

- `research/dossier.md` — sourced fact base: times, coordinates, chainages and impacts, with conflicting figures side by side (see its 25 Sep update).
- `pipeline/inputs/acharya-paudel-2026/` — the Acharya & Paudel (2026) data package (CC BY 4.0): gauges, timeline, casualties to 8 Sep, bridges, EMS.
- `pipeline/inputs/official-2026/` — tables transcribed from NDRRMA situation reports, the government's Rapid Damage and Needs Assessment and the Energy Minister's statement (see its README).

All 2026 figures are provisional and were current on 25 September 2026.

## Licences to respect when reusing outputs

Most layers are ODbL (OSM-derived), CC BY or CC BY-SA (UNOSAT), or public data with attribution. Two need care:
- **Vantor and Planet imagery, and HOT's mosaic of Vantor scenes, are CC BY-NC 4.0** — non-commercial use only. For a commercial deployment, drop those scenes from `steps/imagery.mjs` (keep the CC BY drone orthophotos and Sentinel-2).
- **UNOSAT layers are CC BY-SA 4.0**: derived data inherits share-alike.
