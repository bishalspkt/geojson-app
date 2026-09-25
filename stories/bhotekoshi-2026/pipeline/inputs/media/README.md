# Crowdsourced media snapshot (collected 25 Sep 2026)

Geotagged photos, street-level frames and event videos within 2 km of the 2026
flow path, collected through each service's public, keyless API. `steps/media.mjs`
turns them into `data/media.geojson`, keeping only items whose licence allows
display (CC0 / public domain / CC BY / CC BY-SA / CC BY-NC-ND with credit;
YouTube thumbnails link to the video).

| File | Source and call | Licence |
|---|---|---|
| `wikimedia-commons.json` | Commons `list=geosearch` (10 km radius) at the towns and every 9 km along the river, plus `Category:2026 Nepal and Tibet floods`; `prop=imageinfo` for licence, author and 960 px thumbnails | per file (CC0, PD, CC BY, CC BY-SA) |
| `kartaview.json` | `api.openstreetcam.org/2.0/photo/?lat&lng&radius` and full sequences (2019–2022, Galchhi → Devghat only) | CC BY-SA 4.0 |
| `youtube.json` | Event videos found by web search, checked with YouTube's keyless oEmbed; placed at the town named in the title | standard YouTube licence (link only) |
| `flickr.json` | Flickr geo feeds by tag (no key); only CC-licensed photos are shown | per photo |

Not included: Mapillary (needs an access token; coverage unknown), Panoramax (no
coverage), Internet Archive re-uploads and ArcGIS StoryMap videos (no licence
stated), all-rights-reserved Flickr photos. No open, geotagged, ground-level
photo or video taken after the event existed in these libraries on 25 Sep 2026.
