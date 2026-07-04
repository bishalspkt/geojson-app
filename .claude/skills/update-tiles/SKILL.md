---
name: update-tiles
description: Rotate the geojson.app basemap tile archive (new PMTiles build) or change tile serving config. Use when asked to update tiles, refresh the basemap/OSM data, bump the tile date, or touch the tile worker.
---

# Update the tile archive / tile worker

Tiles are a PMTiles archive in the Cloudflare R2 bucket `pmtiles`, served by the stock protomaps worker (`secrets/wrangler.toml`, custom domain `tiles.geojson.app`). The app references a **dated** TileJSON endpoint so rollback is a one-line revert. Full ops context: `docs/deployment.md`.

## Rotate to a new archive

1. Confirm the new archive exists in R2 as `<YYYYMMDD>.pmtiles` (the user usually uploads it; `wrangler r2 object put pmtiles/<YYYYMMDD>.pmtiles --file …` for small files, S3 API/dashboard for planet-scale).
2. Edit `DEFAULT_TILES_URL` in `src/core/basemap/style.ts` to `https://tiles.geojson.app/<YYYYMMDD>.json`.
3. Gates: `npm run lint && npm test && npm run build`.
4. Verify in the dev server that the basemap renders (zoom around; check labels + boundaries at z2/z8/z14). If the archive schema/version changed, also confirm `@protomaps/basemaps` still matches (layer ids like `boundaries_country`, `places_locality` are customized in `customizeBaseLayers` — a schema bump can rename them and silently drop the tweaks).
5. Commit (`feat: tiles <YYYYMMDD>`) and push — Pages deploys the app. **Do not delete the previous archive** until the new one has soaked; rollback = revert the URL.

## Change worker config (CORS, caching, domain)

1. Edit `secrets/wrangler.toml` (`[vars]`: `ALLOWED_ORIGINS` must stay `"*"` — embeds run on arbitrary origins; `CACHE_MAX_AGE` optional).
2. Deploy manually: `cd secrets && wrangler deploy` (requires the user's Cloudflare auth — ask them to run it if credentials aren't available). Worker changes never auto-deploy from git.
3. Smoke test: `curl -sI https://tiles.geojson.app/<current>.json | grep -i 'access-control\|200'`.

## Rules

- The tiles URL lives in exactly one place (`DEFAULT_TILES_URL`). If you find another hardcoded tile URL, that's a bug.
- Keep the cost philosophy: tiles stay static-file serving (R2 + worker); never introduce a dynamic tile server.
