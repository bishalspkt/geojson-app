# Official figures (transcribed 25 Sep 2026)

Small tables transcribed from government reports and statements, so the story's
numbers are reproducible. Facts only; each row names its source. Figures were
still being revised when collected.

| File | Contents | Source |
|---|---|---|
| `casualty_timeseries_nepal.csv` | Dead (incl. partial remains), missing and rescued, 26 Aug → 23 Sep | NDRRMA bulletins and situation reports #01–#20; earlier points via ADRC and the Acharya & Paudel package; last row is the separate Nepal Police register |
| `bodies_by_recovery_district_timeseries.csv` | Bodies recovered per district, 30 Aug → 23 Sep | NDRRMA situation reports. SitRep #20's p. 3 chart swaps Rasuwa and Nuwakot; its p. 4 table (used here) matches the daily series and the police count |
| `rdna_summary.json`, `rdna_sector_effects.csv`, `rdna_private_buildings_by_local_level.csv`, `rdna_bridges_roads.csv`, `rdna_modelled_deposition_by_reach.csv` | Damage, losses and recovery needs by sector; affected buildings per municipality; bridges and roads; the debris-deposition model by reach | Government of Nepal (NDRRMA with NPC), *Rapid Damage and Needs Assessment, Rasuwa–Bhotekoshi Flood 2026* — data cut-off 3 Sep, published 17 Sep: <https://ndrrma.gov.np/mediafiles/rasuwa/Rapid_Damage_and_Needs_Assessment_RDNA_Rasuwa-Bhotekoshi_Flood_2026.pdf> |
| `hydropower_affected_2026.geojson` / `.csv` | Affected hydropower projects: capacity, pre-event status, damage, workers missing (23 Sep), bodies recovered; one point per mapped component | Energy Minister to Parliament via the Kathmandu Post (23 Sep), NEA statements (Kathmandu Post 30 Aug), NDRRMA SitRep #20, company sites; locations from OpenStreetMap (ODbL) and DoED licence points via HOT |

Used by `steps/story.mjs` (tolls, charts, costs, debris) and `steps/hydropower.mjs`.
