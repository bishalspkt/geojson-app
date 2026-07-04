# Tile worker (Cloudflare)

`wrangler.toml` configures the `osm-pmtiles` worker serving the PMTiles archive from the R2 bucket `pmtiles` on `tiles.geojson.app`. Deploys are manual: `wrangler deploy` from this directory (never automatic from git).

Full operations guide — archive rotation, CORS, env vars, rollback: [docs/deployment.md](../docs/deployment.md). Also available as the `update-tiles` Claude Code skill.
