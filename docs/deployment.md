# Deployment & Operations

Everything geojson.app serves is either a static file or an R2 object behind a Cloudflare Worker. There is no application backend, no database, and no per-request compute beyond tile serving — that cost profile is a design constraint (see [architecture.md](architecture.md)).

```
geojson.app            Cloudflare Pages   ← dist/ (app + embed.js), built from main
tiles.geojson.app      Cloudflare Worker  ← PMTiles archive in R2 (bucket: pmtiles)
protomaps.github.io    Protomaps CDN      ← basemap fonts (glyphs) + sprites
photon.komoot.io       Komoot             ← place search API (third-party)
```

## The app (Cloudflare Pages)

- `main` is production. Pushing to `main` triggers a Pages build; the CI workflow (`.github/workflows/ci.yml`) runs the same `lint → test → build` gates on every push/PR, so a red CI means don't expect the deploy to be healthy.
- Build command `npm run build` produces `dist/` containing the SPA, `dist/embed.js` (the SDK served at `https://geojson.app/embed.js`), and `dist/vendor/maplibre-gl@<version>/` (MapLibre served unbundled so its worker shares code with the main thread). Node version: `.nvmrc` (24; ≥ 22.12 required).
- Build-time environment variables (Pages project settings):
  - `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` — PostHog project token. Omit and analytics is disabled (the app opts out of capture entirely; local dev and forks run clean).
  - `VITE_PUBLIC_POSTHOG_HOST` — PostHog API host.
  - `VITE_PUBLIC_GA_ID` — optional Google Analytics id; production defaults to the existing property. GA loads at idle and never inside embeds.
- No secrets ship to the client beyond these public tokens. Never add a variable with a private key to the Pages build.

## Tiles (Worker + R2)

Config lives in [`secrets/wrangler.toml`](../secrets/wrangler.toml): worker `osm-pmtiles` on the custom domain `tiles.geojson.app`, reading a PMTiles archive from the R2 bucket `pmtiles`. The worker script is the stock [protomaps/PMTiles serverless worker](https://github.com/protomaps/PMTiles).

- Deploy: `cd secrets && wrangler deploy` (requires Cloudflare auth for the account in the toml). **Worker changes never auto-deploy from git.**
- `ALLOWED_ORIGINS = "*"` — intended so tiles are fetchable from any origin. **As of 2026-09-25 the deployed worker still answers CORS only for `https://geojson.app` and `http://localhost:5173`** (the config change was never deployed): embeds are unaffected (the iframe is on geojson.app), but previews on other ports and direct third-party use fail. Run `cd secrets && wrangler deploy` to apply it.
- The app points at the archive through a **dated TileJSON URL**: `DEFAULT_TILES_URL` in [`src/core/basemap/style.ts`](../src/core/basemap/style.ts) (e.g. `https://tiles.geojson.app/20260308.json`).

### Updating the tile archive

Fresh OSM extracts land as a new dated archive so rollback is a one-line revert (procedure also available as the `update-tiles` Claude Code skill):

1. Build or download a new planet/region PMTiles archive (see [protomaps builds](https://maps.protomaps.com/builds/)).
2. Upload to R2 as `<YYYYMMDD>.pmtiles` (`wrangler r2 object put pmtiles/<YYYYMMDD>.pmtiles --file …` — large files: use the S3 API or dashboard).
3. Update `DEFAULT_TILES_URL` to the new dated `.json` endpoint.
4. `npm run build && npm test`, verify the basemap renders locally (`npm run dev`), then commit + push (Pages deploy picks it up).
5. Keep the previous archive in R2 until the new one has soaked; rollback = revert the one-line URL change.

## Third-party dependencies at runtime

| Service | Used for | Failure mode |
|---|---|---|
| Protomaps CDN (`protomaps.github.io`) | glyphs + sprites | Basemap labels/icons missing; map still works |
| Photon (`photon.komoot.io`) | place search | Search returns nothing; rest of app unaffected |
| Maki CDN (`cdn.jsdelivr.net`) | `marker-symbol` icons (pinned `@mapbox/maki@8.0.1`) | Point markers render without icon glyphs |
| AWS Open Data (`s3.amazonaws.com/elevation-tiles-prod`) | 3D terrain + hillshade (only when switched on / in stories) | Flat map |
| NASA GIBS | "Add imagery" presets | Preset imagery missing |
| PostHog, Google Analytics | analytics, loaded at idle | Nothing user-visible |

All are fetched client-side; none are on the critical path for viewing already-loaded data. If any becomes unreliable, self-hosting on Pages/R2 is the escape hatch (fonts/sprites are static files).

## Domains & headers

- `geojson.app` (Pages) and `tiles.geojson.app` (Worker custom domain) are managed in the Cloudflare dashboard for the account in `wrangler.toml`.
- The embed SDK requires no special headers; the app must remain frameable (`X-Frame-Options` must NOT be set to DENY/SAMEORIGIN, CSP keeps `frame-ancestors *`) or embeds break.
- [`public/_headers`](../public/_headers) (copied into `dist/`) sets, for Pages:
  - a **Content-Security-Policy**: scripts only from our origin, Google Tag Manager and `*.posthog.com` (+ `wasm-unsafe-eval` for the COG decoder); data, tiles, imagery and media from any `https:` origin (users and stories point the app at arbitrary sources); `blob:` workers; no plugins, no forms, no inline scripts. If you add a script host (a new analytics vendor, a CDN), add it here or it will be blocked.
  - `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (geolocation for "Show my location" only).
  - cache rules: hashed `/assets/*` and versioned `/vendor/*` immutable; `/embed.js` and `/stories/*` revalidate hourly (CORS open so other sites can load stories).
- To check headers locally, serve `dist/` with them applied (any static server that reads `_headers`, or the Pages dev server `npx wrangler pages dev dist`).

## Release checklist

CI green (lint, tests, build, load budget, embed-size guard) → push to `main` → Pages deploys → spot-check per the `release-check` skill (import sample, click/select, measure, theme swap, phone width, one embed URL, one story chapter link) and check the browser console for CSP violations.
