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
- Build command `npm run build` produces `dist/` containing the SPA **and** `dist/embed.js` (the SDK served at `https://geojson.app/embed.js`).
- Build-time environment variables (Pages project settings):
  - `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` — PostHog project token. Omit and analytics is disabled (the app opts out of capture entirely; local dev and forks run clean).
  - `VITE_PUBLIC_POSTHOG_HOST` — PostHog API host.
- No secrets ship to the client beyond these public tokens. Never add a variable with a private key to the Pages build.

## Tiles (Worker + R2)

Config lives in [`secrets/wrangler.toml`](../secrets/wrangler.toml): worker `osm-pmtiles` on the custom domain `tiles.geojson.app`, reading a PMTiles archive from the R2 bucket `pmtiles`. The worker script is the stock [protomaps/PMTiles serverless worker](https://github.com/protomaps/PMTiles).

- Deploy: `cd secrets && wrangler deploy` (requires Cloudflare auth for the account in the toml). **Worker changes never auto-deploy from git.**
- `ALLOWED_ORIGINS = "*"` — tiles must be fetchable from any host page because embeds run on arbitrary origins.
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
| Maki CDN (`cdn.jsdelivr.net`) | `marker-symbol` icons | Point markers render without icon glyphs |

All are fetched client-side; none are on the critical path for viewing already-loaded data. If any becomes unreliable, self-hosting on Pages/R2 is the escape hatch (fonts/sprites are static files).

## Domains & headers

- `geojson.app` (Pages) and `tiles.geojson.app` (Worker custom domain) are managed in the Cloudflare dashboard for the account in `wrangler.toml`.
- The embed SDK requires no special headers; the app must remain frameable (`X-Frame-Options` must NOT be set to DENY/SAMEORIGIN) or embeds break.

## Release checklist

CI green (lint, 49+ tests, build, embed-size guard) → push to `main` → Pages deploys → spot-check per the `release-check` skill (import sample, click/select, measure, theme swap, one embed URL).
