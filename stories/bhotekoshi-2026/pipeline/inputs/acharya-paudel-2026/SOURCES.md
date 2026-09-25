# Source register

Every dataset in `data/` traces to one of the sources below. Grades follow the dossier scheme:
A1 machine-readable primary instrument record, A2 named agency document, B1 named domain scientist,
B2 government figures relayed by wire or documented third-party analysis, C media.

## Used

| Source | What it gave | Grade | Access |
|---|---|---|---|
| **USGS FDSN event service** | Origin times, locations, magnitudes, `event_type=landslide` for `us7000tbwb` and `us7000tc90` | A1 | Public API, queried directly |
| **DHM Flood Forecasting Division, technical situation report, 2083 Bhadra 10** (9 pp, Nepali) | The full official chronology; gauge thresholds and last readings; 4 stations destroyed; Devghat peak discharge 5,850 m³/s, base flow 2,600 m³/s, total 57.40×10⁶ m³, excess 19.96×10⁶ m³; 679,295 SMS; 2–3 yr return period | A2 | Mirrored at `nirajbhusal/rasuwa-flood-bulletin` → `docs/dhm-bhadra10-sitrep.pdf` |
| **DHM live station pages** (`dhm.gov.np/hydrology/hms-Single/{id}`) | Station IDs, series IDs, thresholds, last levels, silent/washed flags | B2 | Mirrored as JSON in the bulletin repo. Graded B2, not B1: a third-party mirror of an instrument feed is not a statement by a named domain scientist. The 11:40 Phurke reading taken from this source conflicts with the sitrep's 11:43 danger-crossing time; the conflict is recorded in `gauges.json`. |
| **ICIMOD press release, 26 Aug 2026** | Galchhi +9 m / Malekhu +7 m in 30 min; preliminary cause assessment; named scientists | A2 | Public |
| **Vantor (Maxar) Open Data STAC** | 13 VHR optical scenes; acquisition times, cloud cover, off-nadir; asset inventory. No scene covers the detachment source | A1 | Public S3 STAC |
| **Planet Crisis Response, Source Cooperative** | 24 scenes: 5 pre-event PlanetScope of 27 May 2026, 19 post-event across PlanetScope, SkySat and Pelican, 0.55 to 3.9 m. Two post-event scenes contain the detachment source; no pre-event scene does. Visual, analytic and usable-data-mask rasters, no stereo or elevation products | A1 | Public STAC, CC-BY-NC-4.0 |
| **GEOFON / GFZ Helmholtz Centre** | Reviewed second seismic solution `gfz2026qrfy`, Mw 5.7, zero depth, event type **Landslide**. Independent corroboration of the USGS classification and a fourth initiation estimate | A1 | Public catalogue |
| **asoto59g/Nepal** | Independent third-party channel distances and a Manning-based routing reconstruction. Retained as a cross-check on the upper-corridor reach lengths measured here; not used as an input | B2 | Public repo, method documented, reproducible |
| **OpenStreetMap Nominatim** | Settlement coordinates, verified individually | A1 | Public API |
| **OpenStreetMap via Overpass API** | River centreline (`waterway=river` main stem) for the measured reach lengths and corridor sinuosity; Nepal–China boundary (`boundary=administrative`, `admin_level=2`) | A1 | Public API, rebuilt by `analysis/build_channel.py` |
| **Xinhua** | Casualties reported on the Tibet side | B2 | Wire |
| **Outlook India** | District mortuary capacity figures, quoting the Kaski CDO and named hospital and police officers; the only source for mortality *location* | B2/C | Wire |
| **CNN, CARE International, Al Jazeera** | The 250-household resettled community destroyed in Rasuwa; three independent outlets carry the same figure | B2 | Wire |
| **Kathmandu Post, Nepalnews, Ratopati** | Independent reproductions of the DHM situation report, used to corroborate the extracted figures and to date the release | B2 | Public |
| **The Watchers, ANI** | District breakdown of bodies recovered | B2 | Wire |
| **Chinese Ministry of Water Resources advisories, via Global Times and CGTN** | Barrier-lake volume, alert level and location in Gyirong County | B2 | Wire relay of an agency advisory |
| **DHM and ICIMOD joint assessment of the 8 July 2025 event** | Supraglacial lake area and growth history; the 2025 mechanism | A2 | Public |
| **Nepali press reporting of Department of Customs, NEA and Department of Roads figures** | Closure duration and cost, reopening date, 2026 hydropower and road damage | B2 | Provisional, revised during the response |
| **Copernicus EMS EMSR927 grading products** | Vector damage grading for three areas of interest: Syapru Besi (323 destroyed), Timure (372) and Bidur (1826), 2521 destroyed and 3207 graded in total; observed-event extent 829.5 ha; affected population 5300. The service classifies the imaged deposit as mass movement, not flood | A2 | Public, downloaded from the Rapid Mapping API 29 Aug 2026 |
| **NDRRMA / Nepal Police via wire** | Casualty totals and the district recovery distribution | B2 | Recorded as a spread with timestamps |

## Rejected, and why

| Source | Why not used |
|---|---|
| **Vantor STAC collection description** | States the surge entered the Bhote Koshi "at approximately 9:15 AM local time". 09:15 is the *alert* time; the wave had destroyed the Syabrubesi gauge by 08:50. Provider paraphrase conflating alert with onset. |
| **DHM report §4 inter-station distances** | The stated 36 km Rasuwagadhi→Betrawati is shorter than the 38.8 km great-circle separation, which is impossible for a channel. Values are prefixed *करिब* ("approximately"). Recorded but not used for celerity. |
| **`Sakil786/Nepal-Flood-Intelligence` `toll-data.json`** | Reports 389 dead / 910 missing stamped `2026-08-28T16:00Z`, below NDRRMA's 538/977 from earlier the same day. The timestamp is a page-update time, not a data-currency time. |
| **`nepalflood2026.vercel.app`; `family.json`, `rasuwa-foreign-rescued`, `army-heli-rescue`, `rasuwa-hospital-dhunche` in the bulletin repo** | Named-individual registries: missing persons, hospital admissions, rescue manifests. **Deliberately not ingested.** Personal data of disaster victims has no place in this dataset and is not needed; only aggregate counts are used. |
| **NDRRMA website** | JS single-page app; returns 1.3 KB of shell. Figures reached only through wire relay. |
| **`dnjeon/nepal-flood-dashboard`** | RSS news aggregator, 57 links from Kathmandu Post, Online Khabar, Yonhap and Rising Nepal, refreshed every ten minutes, highlighting coverage of a Korean contractor. No licence, no primary data, no measurement of any kind. Every item is a link to reporting reachable directly. Useful only as a discovery tool for stories; nothing to ingest |
| **BIPAD portal API** (`bipadportal.gov.np/api/v1/incident/`) | Queried directly on 29 Aug 2026 for the window from 26 Aug. Returns 74 incidents nationwide, of which 8 are floods and 6 fall in the affected corridor, and their linked loss records total 0 dead and 0 missing against 2 injured. No event record for the cascade. Carries no aggregate national toll, so it cannot supersede the wire-relayed NDRRMA figures. Used as a verified negative result, not as a casualty source. |

## Corrections made during the audit

| What was wrong | How it was found | Correction |
|---|---|---|
| Flow-path nodes listed Timure before Rasuwagadhi, routing the wave 3 km upstream and back | Geometric check against the flow direction | Reordered. Source-to-Syabrubesi fell from 35.4 to 30.6 km and the upper-reach celerity from 46 to about 38 m s⁻¹ |
| `source_scar_to_rasuwagadhi` recorded as 17.6 km | Recomputation | That value was the sum of the misordered legs. Direct great-circle separation is 13.5 km |
| Devghat coordinate was the Tanahun rural-municipality centroid | Node failed to snap to the mapped river | Corrected to the Trishuli–Kali Gandaki confluence, 9.4 km away, where the Narayani gauge sits |
| Galchhi coordinate was a rural-municipality centroid | Same | Corrected to the settlement |
| Corridor-wide sinuosity of 1.14 applied to all reaches | Comparison with the traced centreline | Replaced by measured per-reach lengths. Measured sinuosity ranges 1.09 to 1.81 |
| 1935/1964/1981/2016 outburst record attributed to this corridor | Cross-check against Cook et al. (2018) study area | Those events are in the Poiqu basin, draining to the *other* Bhote Koshi at Kodari, 68 km east. Separated in `recurrence.json` |
| Source described as being in Tibet | Comparison with OSM boundary data | All three source estimates lie 5.0–6.5 km inside Nepal. The flow path, not the source, is transboundary |

## Known gaps

1. Station positions are settlement coordinates, not surveyed gauge locations. Every node now lies within 0.6 km of the mapped river centreline, which bounds the error more tightly than the earlier ±1–2 km estimate, but the true instrument positions remain unpublished.
2. No stage hydrographs, only the threshold-crossing times and last readings. Galchhi survived and would have a full record.
3. ~~No public Copernicus EMSR927 vector products.~~ **Closed 29 Aug 2026.** Grading products for Syapru Besi, Timure and Bidur were released between 27 and 29 Aug and are now used. A fourth area of interest, Bharatpur in Chitwan, was requested but had not been delivered, so the most downstream district, where most bodies were recovered, is still unmapped.
4. The detached **volume** cannot be measured from open data. Narrowed a fourth time on 1 Sept. A **pre-event Pleiades tri-stereo surface of the source area at 2 m**, acquired 13 October 2019 and released openly on 28 August 2026 by Berthier ([10.5281/zenodo.22147118](https://doi.org/10.5281/zenodo.22147118), CC-BY-4.0), covers all four initiation estimates. Its elevations are now measured and recorded in `event.json` (`analysis/source_elevations.py`), and they corroborate the reported 4880 m to within about 60 m while reaching nothing near the reported 5200 to 5400 m. Vantor's WorldView-3 stereo pair still stops 0.6 km west of the source. So the pre-event surface exists at 2 m and the post-event one does not: the gap is now **one missing acquisition**, not an absence of data.
5. ~~The headwater segment from the source scar to Rasuwagadhi is not mapped in OpenStreetMap, so it is carried as a 13.5–24.4 km bound.~~ **Closed 1 Sept 2026.** Measured at **20.1–24.0 km** by steepest-descent tracing on the Copernicus GLO-30 terrain model after priority-flood depression filling, calibrated on the OSM-mapped Rasuwagadhi–Syabrubesi reach and taken over all four initiation estimates (`analysis/trace_headwater.py`). Every dependent quantity still carries the range, which is now measurement spread rather than a bound. See the fourteenth sweep below.
6. No mortality-by-district-of-occurrence dataset exists. Only bodies recovered by district is available, which is a recovery location. The manuscript states this limit explicitly.
7. The first-notification time is recorded as 09:00 here and as 09:05 in three independent press reproductions of the same document. Both are carried; the analysis uses 09:00, the value that makes institutional latency appear shorter.

## Update sweep, 29 August 2026

Every live source in this register was re-queried three days after the event.

| Source | Result |
|---|---|
| USGS FDSN `us7000tbwb`, `us7000tc90` | Unchanged. M 5.2 and M 4.2 `ms_vx`, `event_type=landslide`, hypocentres and origin times identical to the values recorded here. Both now carry review status `reviewed`, so the origin solutions are final rather than automatic |
| Copernicus EMS EMSR927 | **Changed.** Three grading products released. Known gap 3 closed and the building-damage figures replaced |
| Vantor Open Data STAC | **Changed.** 13 scenes, up from 12; the addition is pre-event and covers neither the source nor Syabrubesi. All 9 post-event scenes remain 71–81 % cloud. Footprints were tested against the source for the first time, which tightened gap 4 |
| NDRRMA casualty totals | **Changed.** 616 dead and 1924 missing on 29 Aug, against 538 and 977 on 28 Aug. The district distribution kept its shape: Rasuwa stayed at 13 while Chitwan rose from 186 to 233 |
| BIPAD portal API | Queried for the first time. Verified negative, recorded above |
| DHM station feed, via the bulletin repository | Unchanged in substance. Betrawati is still silent at its 3.549 m reading of 26 Aug 09:20 and Phurke is still logged washed at 10.48 m from 11:40, three days on, so those records are final rather than provisional. Dhunche, Kali Khola and Devghat report normally and are below warning |
| `asoto59g/Nepal` | Active. Added the EMSR927 grading products, a two-hourly watcher on the activation, and on 29 Aug extended its HAND and Manning routing from Devighat hydropower to Bharatpur. Now used as a convergent-validity check on the channel measurement, recorded in `damage_independent.json`. Still not an input |
| `Sakil786/Nepal-Flood-Intelligence` | Still rejected. `toll-data.json` unchanged since 28 Aug and now further behind the agency figures |

Named-individual registries in the bulletin repository grew substantially over the same period and were again not ingested.

## Second sweep, 29 August 2026

Prompted by two sources not previously checked.

| Source | Result |
|---|---|
| **Planet Crisis Response** on Source Cooperative | **New, and it corrects a stated limitation.** 24 scenes. Two post-event scenes contain the detachment source, which the Vantor collection never does, so the source is not unimaged. No pre-event scene contains it, and nothing anywhere is stereo, so the volume still cannot be measured. Pre-event coverage of Syabrubesi improves from a 35-month baseline to 3 months, and the earliest post-event acquisition moves from 27 Aug to 26 Aug 05:44 UTC, about three hours after the failure |
| **GEOFON `gfz2026qrfy`** | **New.** A second reviewed agency solution, Mw 5.7 at zero depth, typed **Landslide**, independently reaching the USGS classification. Added as a fourth initiation estimate. It is the northernmost, so the spread widens from 1.9 to 3.5 km and the margin inside Nepal narrows from 5.0–6.5 km to 3.3–6.6 km. All four estimates remain inside Nepali territory |
| Wikipedia, *2026 China–Nepal floods* | Not citable itself, and used only as a pointer. It led to the GEOFON record. Its ice-block geometry, about 610 m wide falling about 1200 m from 5200–5400 m, traces to BBC reporting and is media-grade; the 1200 m figure already sits at the lower bound of the drop range carried here. Its casualty figures, 626 dead and 1924 missing, are a further increment on the 616 recorded here and confirm that totals were still moving |

## Third sweep, 29 August 2026

Five further sources checked. Three ingested, one used as corroboration only, one rejected.

| Source | Grade | Verdict |
|---|---|---|
| **HOT, flood affected area** (`hot_flood_npl`, ODbL) | A2 | **Ingested.** Bridge status for 39 named structures with the original Nepali terms retained and district attribution. 32 washed out, 3 damaged, 4 intact. The washed-out fraction falls monotonically downstream, 16 of 16 in Rasuwa, 11 of 13 in Nuwakot, 5 of 7 in Dhading, 0 of 3 in Gorkha. Bridges cannot be displaced downstream, so this is the spatially fixed damage measure the mortality data cannot supply |
| **HOT, fAIr damage assessment** (`hot_flood_npl_buildings_damage`, CC-BY) | B2 | **Ingested as a cross-check only.** 1053 OpenStreetMap footprints scored by a model over 14 km²: 677 destroyed, 105 major, 155 minor, 113 undamaged. Graded B2 because the class is a model score, not an analyst interpretation, and it runs on the same Vantor imagery already enumerated here, so it is an independent analysis of dependent imagery |
| **Keystone GIS exposure atlas** (doi:10.5281/zenodo.22118798) | B1 | **Corroboration.** Publishes the EMS observed extent as 829.52 ha and 24 bridges destroyed within the EMS areas; both were derived independently here as 829.54 ha and 24. Its 62.4 km corridor is not a disagreement: its endpoint is Devighat hydropower in Nuwakot, not Devghat in Chitwan, the confusion the manuscript already flags |
| **Planet Crisis Response** (see second sweep) | A1 | **Ingested.** Corrected the imagery limitation |
| **nepalflood.wiki** | C | **Rejected.** No sources, no methodology, no licence, no structured download. Reports 588 dead in Nepal against the agency figures recorded here for the same date |

## Fourth sweep, 29 August 2026

| Source | Grade | Verdict |
|---|---|---|
| **geo-pera, Bhote Koshi 2026 reconstruction** (GitHub, MIT) | B1 | **Ingested as corroboration.** Recovers about 37 m s⁻¹ in the headwater reach from trimline superelevation on opposing valley walls, against 38 m s⁻¹ derived here from arrival times over measured channel distance. The two methods share no input, so the agreement is a genuine check. Also reports 12 × 10⁶ m³ of deposition from opposite-look WorldView-3 parallax, trimline depths of 40 to 134 m, and a total upper-corridor event volume of about 10⁸ m³ at ±40 %, which is not comparable to the excess flood volume used here 178 km downstream |
| **HOT and HDX flood map** (`nepal-flood-map.pages.dev`, ODbL) | A2 | **Recorded.** Sentinel-2 water extent of 31.7 km² observed on 27 August within a 90.1 km² area of interest. A different quantity from the 8.3 km² Copernicus EMS observed-event area, which maps the mass-movement deposit inside three settlement areas rather than the water surface |
| **HOT raw-data overview** (`hot_flood_npl_overview.html`) | — | Data-quality report for the 22 OpenStreetMap and Overture layers behind the HDX dataset already ingested. Attribute-coverage metadata, no new measurements |
| **Copernicus EMS `EMSR927/stats`** | — | JavaScript page, returns no figures to a fetch. The grading products themselves are already ingested and carry the same statistics |
| **GEOFON event explorer** | — | Same solution as the `eqinfo` record already ingested |

**Known gap 4 survives this sweep, and more strongly than before.** The geo-pera reconstruction assembled the best terrain combination anyone has published for this event, a pre-event NASA HMA 8 m DEM against post-event WorldView-3 stereo, and still published no detachment volume. Its stereo differencing runs from chainage 25 to 47 km, the downstream deposition reach, and does not extend to the source. No open measurement constrains the detached volume.

### Additions from the reconstruction write-up and the EMS product notes, 29 August

| Fact | Bearing |
|---|---|
| EMS graded AOI 01 against a **Pleiades Neo pre-event image of November 2025**, by visual interpretation | The EMS grading rests on a commercial pre-event reference outside the open record. This is why it resolves change at the settlements while the open imagery alone cannot, and it does not weaken known gap 4, which concerns the source rather than the settlements |
| AOI 01 land cover affected: forest 61.6, shrub and herbaceous 31.8, inland wetlands 12.1, other 3.4, agricultural 2.1 ha | Sums to 111.0 ha against the 111.09 ha computed here from the polygon geometry. Independent confirmation of the extraction |
| Day-of cloud 62–93 %, with a **15 km stretch including Rasuwagadhi having no cloud-free pixels at all**; a separate Sentinel-2 attempt reached 2.1 % joint clear sky with the pre-event pass, none over the river | Independent corroboration of the cloud limitation recorded here, and a documented negative result |
| Pre-event terrain is a 2017-vintage 8 m model needing datum correction with about 12 % voids near the channel; the pre-event very-high-resolution baseline of 2021 predates the July 2025 outburst in the same valley | Explains why a pre-event elevation surface existing in principle still does not yield a detachment volume, and warns that two-epoch comparison in this valley conflates two events |
| A sustained dam-and-breach was **excluded by hydraulic routing**: it reaches the border 30–60 min late and peaks near a third of measured trimline heights. A blockage failing within minutes and a direct debris flow both remain admissible | An independent test of the falsifiable mechanism statement in Sect. 4, by a route the manuscript did not propose, and it agrees |

### Convergent-validity check on the channel measurement, 29 August

`asoto59g/Nepal` independently reimplemented the measurement this study makes: shortest path along the OpenStreetMap river network, combined with the DHM chronology.

| Quantity | Theirs | Ours | Note |
|---|---|---|---|
| Syabrubesi to Betrawati | 30.0 km | 30.885 km | 2.9 % apart |
| Celerity over that reach | 16.67 m s⁻¹ | 17.16 m s⁻¹ | The same 2.9 %, since both divide by the same observed 30 min |
| Devghat front arrival | 15:20 NPT | 15:20 NPT | Same DHM source |
| Public alert | 09:15–09:16, 679,295 messages | 09:16, 679,295 messages | Same DHM source |
| Corridor length | 181.44 km to Bharatpur | 178.147 km to Devghat | Different endpoints; Bharatpur lies downstream, so a longer value is expected |

This is an independent **implementation**, not an independent **observation**: the same OpenStreetMap data and the same agency report. It guards against measurement and coding error in this study and nothing more, which is why it is recorded here and not cited in the manuscript. Their results file also carries its own note distinguishing Devighat hydropower in Nuwakot from Devghat at the Trishuli–Kali Gandaki confluence, independent confirmation that the naming trap the manuscript flags is a real hazard.

Their hypothetical automatic alert fires 90 s after the seismic signal, tighter than the 2 and 5 min assumed in the counterfactual architectures here, so the lead-time gains this study reports are not the most optimistic available.

## Fifth sweep, 29 August 2026, evening

| Source | Result |
|---|---|
| Copernicus EMS EMSR927 | Unchanged. Three products delivered, AOI 04 Bharatpur still `W`. Activation still open |
| USGS `us7000tbwb`, `us7000tc90` | Unchanged, both still reviewed |
| GEOFON | Unchanged |
| Vantor Open Data | Unchanged at 13 scenes |
| Planet Crisis Response | Unchanged at 24 scenes |
| DHM station feed | Unchanged in substance four days on. Betrawati still silent at 3.549 m from 26 Aug 09:20, Phurke still washed at 10.48 m from 11:40. Dhunche, Kali Khola and Devghat report normally and are below warning |
| **NDRRMA casualty figures** | **Changed.** 626 dead and 2426 out of contact, against 616 and 1924 that morning. Missing rose by 502 in a day. NDRRMA notes that out of contact is not the same as dead, since damaged phones, power and internet still prevent families reaching people in the flood zone. 4451 rescued, 101 in hospital |
| District distribution | Chitwan 233 and Nawalparasi East 158 both unchanged since the 616 revision, Rasuwa still 13. Gorkha 48 to 54 and Dhading 45 to 49 absorbed the rest. Third consecutive revision in which the shape holds and Rasuwa does not move |
| **`geo-pera/bhotekoshi-2026-reconstruction`** | **Changed, and it reopened a question here.** Added verified GIS vector products, Sentinel-1 SAR change detection, and modelled arrival times. Their chainage puts Rasuwagadhi 23.9 km from the source against the 13.5 to 15.4 km carried here |
| `asoto59g/Nepal` | One commit, a hydraulic depth chart. No new measurements |
| `Sakil786/Nepal-Flood-Intelligence` | Unchanged since 28 Aug |

### The headwater bound was too tight, and has been widened

On the reach both studies can measure, Rasuwagadhi to Syabrubesi, they agree to 1.7 per cent: 14.751 km here against 15.00 km there. The disagreement is confined entirely to the headwater segment that neither can measure. Overpass was re-queried over that box on 29 August: OpenStreetMap now maps the Kyirong Tsangpo and Chhochen Khola there, but the source still snaps 1.7 km from the nearest mapped waterway and no connected path exists, so the segment remains unmeasurable by this method.

The upper bound carried here applied a sinuosity of 1.146, taken from the short Rasuwagadhi–Timure reach. That reach contains no cross-border detour, while the headwater does: the Lhende Khola drains north into Tibet and the combined flow returns south. Applying instead the largest reach sinuosity measured anywhere on this corridor, 1.81, gives 24.39 km and brackets the independent estimate of 23.9 km almost exactly. Two independent lines therefore agree that the old bound understated the segment.

| Quantity | Before | After |
|---|---|---|
| Headwater segment | 13.5–15.4 km | **13.5–24.4 km** |
| Source to Syabrubesi | 28.2–30.2 km | **28.2–39.1 km** |
| Upper-reach celerity | about 38 m s⁻¹ | **37–51 m s⁻¹** |
| Celerity decay | about ninefold | **nine- to thirteenfold** |

`build_channel.py` now derives the bound from the corridor-wide maximum rather than the adjacent reaches, so the change is reproducible rather than patched. Every dependent quantity is recomputed from the data. The conclusion is unaffected in direction: the margin was negative along the entire inhabited upper corridor on any admissible reading, and the upper-reach value still exceeds Chamoli at both ends of the bracket.

## Sixth sweep, 29 August 2026, late

| Source | Result |
|---|---|
| `dnjeon/nepal-flood-dashboard` | **New to this register, rejected.** RSS aggregator, no primary data. Recorded in the rejected table above |
| `asoto59g/Nepal` | No change since the fifth sweep. Its repository description now states that the DHM message went out 38 min later than an 08:38 alert would have allowed, which is the same institutional latency of 38.8 min measured here, reached independently |
| `nirajbhusal/rasuwa-flood-bulletin` | **Two substantive items.** The upper barrier lake still carries a burst risk on the 29 August DHM bulletin, four days on and still without satellite verification. Separately, the cabinet has declared the affected local units disaster crisis zones for three months under Section 32 of the Disaster Risk Reduction and Management Act, covering Rasuwa, Nuwakot, Dhading, Gorkha and one further district. Both recorded in `event.json`; neither enters the warning-chain analysis, which concerns the interval between detachment and public message |

Named-individual registries in the bulletin repository continue to grow and continue not to be ingested.

## Seventh sweep, 29 August 2026, night

| Source | Result |
|---|---|
| **Keystone GIS exposure atlas, v7** (`10.5281/zenodo.22152427`, concept `10.5281/zenodo.22118798`) | **Updated and re-checked.** Their v7 folds in the EMS Bidur product, the same one ingested here. Every Copernicus figure they publish matches the extraction here exactly: areas of 111.078, 129.383 and 589.079 ha against 111.09, 129.38 and 589.07; a combined 829.52 ha against 829.54; and building counts of 2521 destroyed, 285 damaged and 401 possibly damaged, identical on all three grades. Two independent extractions of the same vector products reaching the same numbers is a real check on this study's parsing |
| Same, exposure dataset | **New to the record.** Height-above-channel envelope on Copernicus GLO-30 with WorldPop 2020: 39.37 km² and 17,167 residents within 80 m of the channel, of which Nuwakot holds 26.29 km² and 15,850 people against Rasuwa's 13.08 km² and 1317. This study does not compute exposure, and the figures are recorded because they bear on how district counts should be read: Nuwakot carries roughly twelve times the riverside population of Rasuwa, so absolute counts reflect exposure as well as lead time. Now cited in the discussion as a third confounder alongside the lead-time and flow-intensity collinearity already stated |

## Eighth sweep, 30 August 2026

| Source | Result |
|---|---|
| **HOT bridge inventory** | **Changed materially.** Re-pulled after an HDX update at 04:06. The survey grew from 39 structures to 59 overnight and now records 39 washed out, 4 damaged and 16 intact. Four intact bridges appeared in Rasuwa that were absent the day before, so the earlier reading of 16 of 16 washed out was an artefact of an incomplete survey rather than a real total loss. The monotonic decline is gone: Rasuwa 0.85, Nuwakot 0.55, Dhading 0.63, Gorkha 0.00. The direction from the impact reach to the furthest downstream district holds, the ordering of the two middle districts does not. The manuscript sentence and the validator were both rewritten to match |
| **NDRRMA casualties** | **Changed.** 734 dead and 2498 missing at 09:00, against 626 and 2426 the previous afternoon. Wire reports the same morning carried 675, superseded by the agency figure. Missing include 933 underground hydropower workers, 589 foreign citizens and 127 Nepalis travelling with them. 279 workers were rescued from flooded tunnels |
| District distribution | Chitwan 259, Nawalparasi East 184, Nawalparasi West 82, Gorkha 58, Nuwakot 52, Dhading 50, Tanahun 36, **Rasuwa 13**. Fourth consecutive revision, 489 to 616 to 626 to 734, and Rasuwa has not moved from 13 on any of them |
| Copernicus EMS EMSR927 | Unchanged. AOI 04 Bharatpur still `W`, activation still open |
| USGS, GEOFON | Unchanged, both reviewed |
| Vantor, Planet | Unchanged at 13 and 24 scenes |
| DHM station feed | Unchanged in substance five days on. Betrawati still silent, Phurke still washed |
| `asoto59g/Nepal`, `geo-pera` | No commits since 29 Aug |
| `nirajbhusal/rasuwa-flood-bulletin` | Active. Latest entry splits the map and timeline onto a separate page. No new measurements |
| `dnjeon/nepal-flood-dashboard` | Still an RSS aggregator, still rejected |
| Keystone GIS | v7 checked in the seventh sweep, no newer version |

## Provenance completeness audit, 30 August 2026

`analysis/audit_sources.py` was added to answer a question the other two gates do not. `validate.py` checks the numbers are internally consistent. `audit_provenance.py` checks every number in the manuscript resolves to a field in the data. Neither asks whether every field in the data itself declares where it came from.

The new audit walks all 1363 values under `data/` and requires each to sit inside a block naming a source, or to be declared as computed by named code. It also checks that grades come from the A1–C scheme and that a block declaring a source also declares a grade, either on itself or on an ancestor.

**Result: 1363 values traced, 0 unaccounted, 0 bad grades, 0 unpaired blocks.**

Getting there exposed nine real gaps, now fixed rather than excused:

| Where | Gap | Fix |
|---|---|---|
| `event.json` `source_geometry` | Langtang Lirung peak elevation and name carried no source | Per-field source and grade added |
| `event.json` `source_location_estimates.territory` | Declared a grade, named no source | Source added: OSM `admin_level=2` boundary against the three initiation estimates |
| `event.json` `flow_path_nodes` | Named a source, declared no grade | Grade added, split between coordinates and arrival times |
| `event.json` `_provenance_resolved.bipad_portal` | Declared a grade, named no source | The direct API query recorded as the source |
| `channel.json` `headwater_segment` | Declared a grade, named no source | Recorded explicitly as a derived bound, not an obtained value |
| `gauges.json`, `timeline.json` `_meta` | Used `primary_source` and `grade` outside the underscore convention | Renamed to `_source` and `_grade` |
| `casualties.json` `tibet`, `bodies_recovered_by_district`, `mortuary_capacity` | Named sources, declared no grades | Grades added |

Four documentation blocks that were being treated as data were also moved under the underscore convention: `sinuosity_note`, `provenance_resolved`, `known_gaps` and `rejected`. The destroyed-station summary in `gauges.json` was restructured from three loose sibling keys into a properly sourced block, and `validate.py` follows the new shape.

The audit is now part of `package_archive.py`, so a deposit cannot be built while any value in the data lacks provenance.

## Ninth sweep, 30 August 2026, evening

| Source | Result |
|---|---|
| **`asoto59g/Nepal`** | **Changed, and it narrowed a limitation here.** Added Sentinel-1 and Sentinel-2 detection of the Langtang source scar, plus a debris-dammed lake mapping and a flood clock aligned to the Geopera arrivals. The scar work matters because it differences imagery across the failure **at the source**, which the very-high-resolution record cannot do. Recorded as B2: automated thresholding, published as code and output, not validated. Its arithmetic was checked here and reproduces |
| **NDRRMA casualties** | 781 bodies at the 18:00 bulletin, relayed by the mirror, against 734 corroborated at 09:00. Recorded as a single-source relay and **not** adopted for the district distribution, which still uses the corroborated 734 breakdown. A wire figure of 675 from the previous evening was superseded and is noted as such |
| **Copernicus EMS EMSR927** | A **monitoring** grading product for AOI 03 Bidur now appears in the feed with imagery acquisition scheduled for 30 August 18:00 UTC. Not delivered, not used. AOI 04 Bharatpur still waiting |
| **HOT bridge inventory** | HDX metadata touched at 10:05 but the data is unchanged: still 59 structures with identical counts. Re-pulled and compared rather than assumed |
| USGS, GEOFON, Vantor, Planet | Unchanged |
| DHM station feed | Unchanged. Betrawati still silent, Phurke still washed |
| `geo-pera` | No commits since 29 Aug |
| `nirajbhusal/rasuwa-flood-bulletin` | Active, now publishing named rescue lists of 4395 people. **Not ingested**, consistent with the standing privacy rule |

## Tenth sweep, 30 August 2026, late

Prompted by a set of specific commits and one issue in `asoto59g/Nepal`.

| Item | Result |
|---|---|
| Issue #2, EMSR927 watcher | Their bot's automated status table. Corroborates exactly what was read from the Copernicus API here: Bidur published on Satellogic and BlackSky, Bharatpur still waiting on Legion. Nothing new |
| `878cde41` hydraulic depth chart | Presentation only, no new measurement |
| `2e4f7d59` EMSR927 status | Already recorded in the ninth sweep |
| `593de61c` Sentinel scar mapping | Already ingested in the ninth sweep; it narrowed known gap 4 |
| **`ab5c8718` debris-dammed lake** | **New, and it resolves an open status here.** Sentinel-1 of 28 Aug already shows the lower lake overflowing, and Chinese authorities report it emptied on 30 Aug, corroborated by remote sensing showing the surface reduced to effective drainage. A second lake of about 14,000 m² remains monitored with overflow probability assessed low. The record here previously said the risk persisted with no satellite verification; that is superseded |
| Same, lake **position** | **An unresolved disagreement, now recorded as one.** The position carried here comes from Chinese advisories naming the Chhochen–Purepu confluence. Their Sentinel-2 detection finds 3.72 ha of new water 4.8 km away, beside a Satellogic optical candidate of about 20 ha. Neither is adopted over the other. The manuscript cites only the reported volume and alert level, neither of which depends on the position |
| **`5922aa10` flood clock** | **Bears on the headwater bound.** They now route from the detected Sentinel scar rather than the seismic hypocentre, and revise scar-to-Rasuwagadhi from 23.9 km down to **19.0 km**. Both their old and new values fall inside the 13.5–24.4 km bracket carried here. The bracket is unchanged: a third-party model input that has already moved once is not a measurement, and their origin sits 1.6 km from ours, small against an 11 km bracket |

The manuscript gains one clause, that the barrier lake drained on 30 August, so the passage does not read as an ongoing hazard to someone reading it later.

## External practitioner review, 30 August 2026

A reader who works on sensor networks and downstream alerting responded to the preprint. The substance: destroyed sensors and network dropouts are indistinguishable, both simply stop reporting; wireless links carry long and variable latency; and triggering on absence of data produces false alarms, which are themselves harmful because they erode trust in the alert.

The manuscript already anticipated the basic form of this, proposing coincidence at two or more consecutive stations rather than triggering on any single silence. Checking the objection properly nonetheless exposed two things the paper had wrong.

**The independence assumption was unstated and untestable.** The claim that coincidence detection has a false-alarm rate "orders of magnitude below" single-station loss holds only if station failures are independent. Stations sharing power or transmission backhaul are not, and monsoon conditions that produce the hazard also stress the communications, so failures may be positively correlated with the very event the detector is meant to catch. No topology or outage history for the DHM network is public, so this cannot be tested here.

**The proposed rule would not have worked on this event.** Syabrubesi lost telemetry at 08:50 and Betrawati at 09:20, thirty minutes apart, and the second falls after the 09:16 public alert. A rule requiring two stations within minutes would not have fired in time. The ten-minute gain the manuscript reports comes from acting on the first loss alone, which is precisely the higher false-alarm case the reviewer warns about. A fourth destroyed station, Rasuwa Bhote Koshi, has no published loss time, so whether a tight coincidence was available upstream cannot be determined.

Both passages were rewritten. The recommendation stands, because telemetry loss remains the only quantity that rose fast enough to be diagnostic, but it now states the trade between the two forms instead of presenting coincidence detection as strictly better.

## Eleventh sweep, 31 August 2026

| Source | Result |
|---|---|
| **Copernicus EMS EMSR927** | **Changed, and it moved the paper's damage figures.** A Bidur monitoring product was delivered at 01:07 and supersedes the original. It is cumulative, not additional: its five observed-event polygons include the original two and add three more. Bidur's extent rose from 589.07 to **702.63 ha** and its destroyed count from 1826 to **2479**. Totals across the three mapped areas are now **943.10 ha, 3174 destroyed and 3922 graded**, against 829.54, 2521 and 3207. AOI 04 Bharatpur still waiting |
| **NDRRMA casualties** | **Changed, and it broke a claim here.** 903 dead and 4247 missing at 09:00, the missing nearly doubling as previously unreported cases were registered. 592 foreign nationals among them. Tibet 16 dead, 546 missing |
| District distribution | Chitwan 272, Nawalparasi East 207, Nawalparasi West 151, Nuwakot 95, Gorkha 62, Dhading 55, Tanahun 37, **Rasuwa 24**. Rasuwa held at 13 across four revisions and has now moved for the first time |
| **Vantor Open Data** | 14 scenes, up from 13. The new acquisition of 31 August is **94 per cent cloud**, the worst yet, widening the post-event range from 71–81 to **71–94 per cent**. It covers Syabrubesi but not the source, so source coverage remains zero |
| HOT bridge inventory | Metadata refreshed at 04:06 but data unchanged: 59 structures, identical counts. Re-pulled and compared |
| USGS, GEOFON, Planet | Unchanged |
| `geo-pera` | No commits since 29 Aug |

### The Rasuwa stability claim has been withdrawn

The manuscript argued that the total rose while the Rasuwa count did not move, and drew from that a widening downstream displacement. Rasuwa has now moved from 13 to 24, so the argument as stated is no longer supportable and has been rewritten.

| Revision | Total | Rasuwa | Rasuwa share | Chitwan : Rasuwa |
|---|---|---|---|---|
| 28 Aug | 489 | 13 | 2.7 % | 14 : 1 |
| 29 Aug | 616 | 13 | 2.1 % | 18 : 1 |
| 29 Aug | 626 | 13 | 2.1 % | 18 : 1 |
| 30 Aug | 734 | 13 | 1.8 % | 20 : 1 |
| **31 Aug** | **903** | **24** | **2.7 %** | **11 : 1** |

Rasuwa's share fell across four revisions and then returned to where it began, which is not a trend in either direction. The contrast between the district that received most bodies and the district where the wave began remains large but is **narrowing**, from about twenty to one down to about eleven to one, as recovery reaches the upper corridor. The manuscript now rests the inference on the magnitude of that contrast and states explicitly that the displacement is a feature of retrieval effort and distance rather than a fixed property of the event.

## Twelfth sweep, 1 September 2026

| Source | Result |
|---|---|
| **Vantor Open Data** | 16 scenes, up from 14, with two more on 1 September at 71 and 78 per cent cloud. 12 post-event, range still 71–94 per cent |
| **Planet Crisis Response** | 26 scenes, up from 24, 21 of them post-event |
| Both, source coverage | **Unchanged and still the point.** No Vantor scene covers the detachment source. Planet covers it twice, both post-event, at 3.4 m under 88 per cent cloud on 26 August and 3.8 m under 81 per cent on 28 August. Pre-event coverage of the source remains zero on both |
| Copernicus EMS EMSR927 | Unchanged since the Bidur monitoring product. AOI 04 Bharatpur still waiting, activation still open |
| **NDRRMA casualties** | Unchanged at 903 dead and 4247 missing, now with 1473 injured recorded. An intermediate wire figure of 797 circulated and is superseded |
| HOT bridge inventory | Metadata refreshed at 23:01 but data unchanged for the third consecutive day: 59 structures, identical counts |
| USGS, GEOFON | Unchanged |
| `asoto59g`, `geo-pera` | No commits since 30 and 29 August |
| `nirajbhusal/rasuwa-flood-bulletin` | Active, now publishing rescue name lists of 3141 people, **not ingested**. Its other new entries concern Kathmandu valley rainfall and the Bishnumati at Gongabu, a separate event outside this corridor |

### A brittleness fixed

Both imagery collections are still growing, and the manuscript carried hard counts that went stale within a day: Vantor has run 12, 13, 14, then 16, and Planet 24 then 26. The sentence now dates them, "sixteen and twenty-six very-high-resolution scenes by 1 September and both still growing", so a reader knows the record was open when the paper was written. The claim that rests on those collections has never moved on any pull: no scene in either release covers the detachment source before the failure.

## Thirteenth sweep, 1 September 2026

| Source | Result |
|---|---|
| **`geo-pera`** | **Retracted a product this register cited.** Their parallax elevation-change map and every figure from it are withdrawn: they had assumed the two WorldView-3 looks were opposite-azimuth, when the pair is same-side in-track stereo, so the offset-to-height conversion was wrong in sign and magnitude and the map was dominated by registration residuals. Caught by differencing a rigorous 0.5 m DSM against the pre-event DEM and by re-deriving the geometry from the RPC cameras. The deposition volume recorded here is withdrawn with no replacement adopted. The two things the manuscript cites them for are unaffected, and they say so: the headwater velocity is from trimline superelevation, and the dam-and-breach exclusion is from routing on the pre-event DEM |
| **Vantor stereo release** | **Found because of that retraction, and it corrects a claim in the manuscript.** An unindexed `stereo/` directory holds two RPC-bearing WorldView-3 strips of 27 August. The STAC never exposes them. The manuscript said neither release carries stereo pairs; that is now false and has been rewritten |
| Same, coverage | The pair reaches Syabrubesi and stops **about 0.6 km west of the source**, at longitude 85.509 against 85.515. Confirmed twice over, by the STAC footprint polygons and by the RPC normalisation boxes independently. The closest any stereo has come |
| **NDRRMA casualties** | 987 dead, and missing **down** from 4247 to 3916 as people were traced. Chitwan 321, Nawalparasi East 216, Nawalparasi West 170, Nuwakot 95, Gorkha 65, Dhading 55, Tanahun 38, Rasuwa 27 |
| Copernicus EMS, USGS, GEOFON | Unchanged. AOI 04 Bharatpur still waiting |
| HOT bridge inventory | Metadata refreshed at 06:09, data unchanged for the fourth consecutive day |
| Vantor, Planet STAC | 16 and 26 scenes, unchanged since the twelfth sweep |
| `asoto59g` | One commit, recording EMSR927 status. No new measurement |

### Corrected findings from the retraction, recorded but not adopted

Their superseding result reverses the retracted one: the corridor above Syabrubesi is erosional with 2 to 12 m of floor lowering, the main deposit of 12 to 18 m sits where the valley opens at km 40.5 to 43.6, and the river has re-incised 13 to 21 m where it confines again downstream. None of this enters the analysis here, which measures the warning chain and not the sediment budget. It is recorded because a source that corrects itself in public is worth more than one that does not, and because their retraction is the only reason the stereo release was found.

## Fourteenth sweep, 1 September 2026: the headwater measured

The largest single source of uncertainty in the paper was the unmapped headwater, carried since 29 August as a 13.5–24.4 km bound. It is now measured.

**Existing traces were checked first.** geo-pera traced 23.9 km on 29 August and revised it to 19.0 km on 30 August after re-anchoring on the Sentinel-2 scar centroid. asoto59g carries 19.0 km but states their arrivals are aligned with geo-pera's, so the two are not independent. OpenStreetMap still cannot measure the reach: the source snaps 1.7 km from the nearest mapped waterway and no connected path exists.

**An independent measurement was then made** (`analysis/trace_headwater.py`). A 1044 × 1008 window of the Copernicus GLO-30 terrain model was fetched over the headwater, depressions were filled by priority flood with an epsilon gradient, and the steepest-descent path was followed from each of the four initiation estimates. All four traces converge into the same channel within 103 m of Rasuwagadhi, loop north across the border to 28.337° N, and reproduce geo-pera's independently traced northern apex of 28.3369° N to about 20 m. The method is self-calibrated: on the mapped Rasuwagadhi–Syabrubesi reach the grid path gives 15.54 km against 14.751 km on the OSM centreline, a 5.3 % overmeasure, and that factor corrects the headwater.

| Start estimate | Calibrated scar–Rasuwagadhi |
|---|---|
| USGS hypocentre | 22.88 km |
| Planet initiation point | 22.26 km |
| Glaciological estimate | 22.24 km |
| Sentinel-2 scar centroid | 21.16 km |

The start-point envelope of 21.16–22.88 km, widened by the ±5.1 % calibration residual, gives **20.09–24.04 km**, grade A1. The old bound's lower end, the 13.46 km great-circle separation, was never physically attainable because of the cross-border loop. geo-pera's original 23.9 km falls inside the measured range; their revised 19.0 km falls about 1 km below it, and from the same scar-centroid start the calibrated trace here gives 21.2 km, a 10 % disagreement that remains unresolved and is recorded in `damage_independent.json`.

**Propagated.** Upper-reach celerity 37–51 → **45–50 m s⁻¹**, decay factor nine–thirteen → **eleven–thirteen**, source-to-Devghat corridor about 190 → **about 200 km**, Timure and Rasuwagadhi channel distance 13–28 → **20–28 km**. The geo-pera trimline velocity of 37 m s⁻¹ now sits below the celerity bracket instead of at its lower end, the expected ordering for a section velocity against a wave celerity, and the manuscript, `damage_independent.json`, the figures and all three audits were updated together.

## Fifteenth sweep, 1 September 2026: the gauge series behind the report

A hydrologist reviewing the preprint asked whether the Devghat time series had been obtained and what rating DHM uses. Neither question had been pursued: every arrival time in the study came from the situation report's prose. The department still serves the underlying ten-minute series, and retrieving it changed more than the Devghat entry.

**How it was retrieved.** The river-watch station pages expose a CodeIgniter form, not an API. A page load yields a session cookie, a CSRF token and the station's internal series identifier; a POST to `getRiverWatchBySeriesId_Single` with a date returns an HTML table. Two traps had to be handled: rows come newest first, and the clock labels are twelve-hour with no meridiem, so 16:10 prints as 04:10. The feed also drops samples, so a fixed ten-minute cadence cannot be assumed. `analysis/fetch_dhm_series.py` assigns times by an order-preserving walk anchored on each row's explicit calendar date, and refuses to write unless the result reproduces the hourly aggregate view, the report's telemetry-loss time at Betrawati, its 6.57 m peak at Devghat and its danger crossing at Kali Khola. All thirteen checks pass, and the whole series is stored in `data/gauge_timeseries.json`.

**The corridor has two Bhote Koshi stations, and this study had fused them.** The report names four destroyed stations, including both "Rasuwa Bhote Koshi" and "Rasuwa Syabrubesi". This package carried a single record for them: warning 6.0 m, danger 7.0 m, last reading 1.62 m at 08:40, telemetry ceasing 08:50. The service resolves it. Station 4913, *Bhotekoshi at Rasuwagadi* at 28.2713 N 85.3776 E, publishes warning 6.0 and danger 7.0 and its series ends with 1.62 m at 08:40. Station 191, *Bhote Koshi at Shyaprubesi* at 28.1707 N 85.3426 E, publishes warning 5.50 and its series ends with 3.80 m at 08:50. The fused record took the first station's stage and thresholds under the second station's name, with the second station's cessation time. Both are silent still.

**A gauge stood at Rasuwagadhi.** That is the most consequential correction. The manuscript's architecture B posits an in-channel sensor at the border as a counterfactual; the sensor was there, two kilometres inside Nepal, reporting normally until the wave reached it. What the corridor lacked was a rule that reads its silence.

**The telemetry-loss question the package recorded as undeterminable is answered.** The previous record noted that the fourth destroyed station had no published loss time and that "whether a tight coincidence was in fact available upstream cannot be determined". It was available. Rasuwagadhi's 08:50 report never arrived and Syabrubesi's 09:00 report never arrived, ten minutes apart, both before the Division was notified at 09:00 and well before the 09:16 alert. A single-station rule was available at 08:50, twenty-six minutes before the alert; a two-station rule at 09:00, sixteen minutes before it. Coincidence detection costs ten minutes on this event rather than being unavailable, which answers the practitioner's objection of 30 August directly.

**Arrival times moved, and the celerity with them.** Every destroyed station's last reading is at its ordinary river level, so the front arrived *after* it, not at it. Galchhi turns out to have recorded the wave and is no longer a forecast node: flat at 360.62 m at 10:20 and 363.58 m at 10:30, peaking at 369.45 m, against a forecast bulletin time of 10:28 that falls inside the measured interval. Kali Khola, between Mugling and Devghat where the study had no node, is a new measured node. Devghat's front arrived between 14:30 and 14:40, not at 15:20; the report's 15:20 entry falls mid-rise at 5.70 m.

| Quantity | Before | After |
|---|---|---|
| Source to Syabrubesi celerity | 45–50 m s⁻¹ | **25–49 m s⁻¹** |
| Lower-reach celerity | 4.0 m s⁻¹, Mugling–Devghat | **5.5–7.1 m s⁻¹, Kali Khola–Devghat** |
| Decay factor | eleven to thirteen | **three to nine** |
| Syabrubesi lead time | −26 min | **−26 to −16 min** |
| Betrawati lead time | −6 to +4 min | **+4 to +14 min** |
| Destroyed below threshold | 2 stations, 27 % and 87 % | **4 stations, 27, 69, 74 and 87 %** |
| Stations timing the front | 4, from report prose | **6, from instrument series** |

Two bugs surfaced while wiring this in, both in `analysis/leadtime.py`. Reach lengths treated the unmeasured headwater as independent uncertainty at both ends of every reach, inflating each by twice its width; it is a single offset shared by all nodes below it and cancels in any reach not starting at the source. And the latency decomposition used the Syabrubesi arrival where it meant the first missing report. Fixing the first tightens every intermediate reach bracket.

**Still open.** The rating curve the reviewer asked about is not published: the service serves stage, not discharge, so the 5850 m³ s⁻¹ peak and the 19.96 × 10⁶ m³ excess volume remain DHM's rating-derived figures with the caveat already recorded in `event.json`. A stage-discharge relation for station 265 would let the volume be recomputed independently, and it is now the most valuable single thing a Nepal-based collaborator could supply. Station coordinates for Devghat and Betrawati are published to two decimal places, about a kilometre, which is why the Devghat station is not adopted for chainage; three others are given to five or six.

## Reproducibility pass, 1 September 2026

The package was rebuilt so that someone with no more than Python, `numpy` and `matplotlib` can pull every input, recompute every number and check it against the paper, without help from anyone who worked on it.

**One command runs and checks everything.** `analysis/reproduce.py` runs the pipeline in order and ends with the three checking stages, printing `All stages passed` only if the data, the code and the manuscript agree. It runs offline against the committed data; `--refetch` re-pulls OpenStreetMap and the gauge series so the committed copies can be tested against the live services. Tested by extracting the deposit archive into an empty directory and running it there, which is the only test that matters: 44 files, no network, all stages pass.

**Two generated reports make the package traversable.** `data/CLAIMS.md` lists all 82 numbers printed in the manuscript beside the value the data gives for each, grouped by the file it comes from, so a reader can go from a figure in the paper to the field that holds it. `data/INDEX.md` lists all 45 top-level blocks across the eleven data files with their grades and sources. Both are generated (`--write-report`, `--write-index`) and cannot drift, because the audits that emit them fail first if anything has moved.

**A fourth check was added, on the typeset output.** The provenance audit compares the data with the LaTeX source, which cannot catch a number that is correct in the source but never reaches the reader, because a float failed to place or a table overflowed. `analysis/check_pdf_claims.py` reads the built PDF and requires every row of `CLAIMS.md` to appear in the typeset text. It is wired into `make check`. All 82 appear.

**Bugs and defects found and fixed in this pass.**

| Where | What was wrong |
|---|---|
| `analysis/gauge_chainage.py` | Iterated the station block without skipping the two documentation keys, so it crashed on the current data file |
| `analysis/make_figures.py` | Figure 3 asserted "Bodies recovered by 29 Aug 2026" while the data it plots is the 1 September revision. The date is now read from the data's own `_as_of` field |
| Figure 2b | Still titled "Celerity decays by an order of magnitude" after the decay became three- to ninefold. Its reach brackets also double-counted the headwater, and the two headwater sub-reaches ran off the axis because their arrival brackets abut. It now shows the five reaches the manuscript reports, with exact reach lengths |
| Figure 2a | Rasuwagadhi, Syabrubesi and Betrawati labels overlapped each other in the lower-left corner; now staggered across the curve |
| Figure 2b ticks | Six full station names collided; now abbreviated as the manuscript's own tables abbreviate them |
| Figure 3a | Value labels were offset upwards and read as belonging to the row above, and collided with the counterfactual markers; now inside their own bars |
| Figure 3a | The −10 tick was illegible against −30 on the compressed side of the symmetric-log axis and was dropped. The axis was then extended from −90 to −150, because the two negative value labels had barely a label's width between the bar tip and the frame, and the single remaining negative tick moved to −40, which also brackets the earliest admissible arrival at Rasuwagadhi |
| Figure 2a | Second pass on the labels. Rasuwagadhi had fallen below the x-axis and Syabrubesi onto the y-axis; both now sit inside the shaded band, clear of the alert line. Kali Khola ran outside the frame and now drops into the empty wedge below and right of its marker, which also keeps it off Mugling's label four kilometres upstream. Devghat is centred above its marker so it clears the legend. The axis-widening guard, which measured only the left-hand labels, now measures both ends |
| Deposit contents | `references.bib` was missing, so the manuscript source could not be compiled and its citations could not be checked |
| `README.md` | Was four days stale: 18 pages, 30 checks, a 13.5–15.4 km headwater, an 08:40–08:50 Syabrubesi bracket, and links to files the archive does not contain |

**Independent recheck.** Thirty headline values were recomputed from the raw stage series and the channel geometry by a separate path that shares no code with the provenance audit, covering the six arrival brackets and their consecutiveness in the series, both celerity brackets, the decay factor, the three threshold fractions, four lead times and the presence of each string in the manuscript. All thirty agree.

**Portability.** Every script parses under Python 3.8 grammar and uses only the standard library plus `numpy` and `matplotlib`. The Copernicus LaTeX class is copyright Copernicus GmbH and is not redistributed; the manuscript source and bibliography are included so the text can be read and checked without compiling it.

## Source registry, 1 September 2026: every value leads to something you can open

The package already required every value to name a source. That is not the same as being able to get at the source: 108 of the 114 source declarations were prose, some of it as thin as "DHM sitrep" or "Xinhua". A reader could see that a number came from somewhere without being able to go there.

**`data/sources_registry.json`** now holds one entry per source, 23 in all, and every entry carries a `retrieve` field: a URL, a DOI, or the exact query and script that obtains the data. Blocks in the other files carry `_source_ref` keys naming entries here, so the shorthand still reads naturally in place while resolving to something actionable. The repeated shorthands collapse cleanly: twenty-one `"DHM sitrep"` strings in `timeline.json` all point at one registry entry that says exactly what the document is and how to get at it.

**The audit now enforces it.** `analysis/audit_sources.py` requires each source declaration either to carry a link itself or to name registry entries that do, and reports any that cannot be followed. Tested by deleting one `_source_ref`: the audit fails and names the block. Four new checks in `validate.py` require every registry entry to carry a title, publisher, kind, retrieve route and access date, every `_source_ref` to resolve, every entry to be referenced by at least one block, and every `bib_key` to name a real entry in `references.bib`, which ties the data package to the paper's bibliography.

**Links are checked, not asserted.** `analysis/check_links.py` requests every link and separates four outcomes, because only one is a problem: reachable, reachable but refusing automated requests, a certificate the checking machine cannot verify, and actually gone. Two GET probes that first looked dead were artefacts of the method rather than dead links, and both are now handled by name: the river-watch series endpoint answers only to POST, and the USGS landslide page fails TLS verification on this machine while other clients verify it. Current result: **29 reachable, 0 gone**.

**Two sources have no permanent link, and the registry says so rather than implying otherwise.** The DHM situation report was never posted to a citable location; its entry names the three contemporaneous reproductions that agree on every figure used here and the bulletin mirror, and records that obtaining a citable copy is the first collaborator ask. The press relays of official casualty figures have no captured article URLs; their entry names the outlets and dates, points at the official record for the same figures, and states plainly that no conclusion in the manuscript rests on a press-only value.

**The generators had to be fixed too.** Four scripts rewrite whole blocks, so they were dropping the `_source_ref` on every regeneration and the audit failed after the first rerun. `build_channel.py`, `fetch_dhm_series.py`, `trace_headwater.py` and `gauge_chainage.py` now emit their own refs, which is what makes this survive a refetch.

**`data/INDEX.md`** gained a column: for every block, the link that retrieves its source. That is the traversal path the reproducibility pass was missing, from a number in the paper through `CLAIMS.md` to the field, and from the field to the source's own address.

## Release 2.0.0, 1 September 2026

Published to the reserved Zenodo DOI `10.5281/zenodo.22236865`, under the unchanged concept DOI `10.5281/zenodo.22153581`. A major version rather than a point release, because both the structure and the results moved. `data/gauges.json` now holds the two Bhote Koshi stations as separate instruments with their own names, thresholds and loss times, where 1.2.0 carried them as one record, so code written against the older file breaks on this one. Upper-reach celerity moved from 45 to 50 m s⁻¹ down to 25 to 49, and the decay factor from elevenfold to three- to ninefold. Anyone who cited 1.2.0 for a number should re-read it here.

The archive is now self-describing and self-verifying. `README.md` opens with the release number and the three DOIs, so a downloader can tell what they are holding without going back to Zenodo. `MANIFEST.txt` carries a SHA-256 for every file, checkable with `shasum -a 256 -c MANIFEST.txt`. The build is deterministic, every entry stamped with the release date rather than its own mtime, so rebuilding the same content reproduces the archive byte for byte. And `package_archive.py` now refuses to build if any file in the deposit still states a superseded headline value outside the correction history, or if the release version is missing from `README.md` or `CITATION.cff`; the guard was tested by planting an old celerity in the README, which it caught. Retrieving the gauge series had left three such values behind: the headwater-velocity crosscheck in `damage_independent.json`, the arrival and celerity passages of the evidence dossier, and two file counts in the README.

New in this release: `data/gauge_timeseries.json`, the ten-minute stage series for eight stations; `data/sources_registry.json`, every source with a way to retrieve it; `data/CLAIMS.md` and `data/INDEX.md`, both generated; `analysis/reproduce.py`, one command that runs and checks everything; and `analysis/fetch_dhm_series.py`, `trace_headwater.py`, `gauge_chainage.py`, `check_links.py` and `check_pdf_claims.py`. `references.bib` is now in the archive so the citations can be checked without building the paper.

## Sixteenth sweep, 1 September 2026: the false-alarm rate, measured

A second practitioner, from a company that runs sensors and alerts downstream stakeholders, made the cry-wolf objection in its strongest form. A destroyed station does not report that it has been destroyed, it simply stops reporting, and that is indistinguishable from an ordinary radio or power failure. Trigger on silence and you get false alarms, and an alarm nobody trusts is worse than none. They cited the Durban 2022 floods, where the downstream gauges went with the bridges they sat on.

The objection is testable on this network, because the river-watch service serves the days before the event as well. `analysis/telemetry_gaps.py` measures the gap rate over the retrievable pre-event window and converts it into a false-alarm rate for the two rules the manuscript discusses. Retention reaches back to 17 August, so the baseline is the eight days ending at 05:40 on 26 August, before the 08:37 detachment. Gaps are counted as episodes, not as missing samples, because a station offline for three hours is one alarm to an operator and not eighteen.

| Rule | Alarms in 8 days | Per day |
|---|---|---|
| One missing report at any flow-path station | 9 | **1.13** |
| Two adjacent flow-path stations silent within 30 min | 0 | **0, bounded above by 0.38** |

The six flow-path stations dropped 34 reports in nine episodes, the longest 170 minutes at Syabrubesi and 100 at Kali Khola. **The objection is correct about single-station triggering**, which at about one alarm a day is unusable as a public trigger, and this is now stated in the paper rather than left as an open operational judgement. It is not correct about the corroborated rule, which raised nothing in the same window. Zero observed is not a rate of zero: the one-sided 95 per cent Poisson limit for that count is 0.38 a day, so the defensible claim is a separation of at least threefold, not an absolute rate.

Two limitations are recorded with the measurement and both push the same way. It counts gaps as the archive shows them now, so a report that arrived late and was backfilled looks complete here while a real-time detector saw silence, which makes every rate above a **lower bound**, and the single-station rate can only be worse. And the independence assumption behind coincidence detection still cannot be tested, because no topology or outage history for the network is public. Both arguments favour the stricter rule and warn against treating these particular numbers as transferable. The method transfers even where the numbers do not, and the manuscript now says so: an operator can run this on their own reporting history before choosing a rule.

The Durban 2022 comparison is not in the manuscript. It belongs there as a precedent alongside Melamchi 2021, where the Nakote station recorded the flood and was then lost, but only with a citable reference, and none was offered. Worth asking for.

Section 3.3 of the manuscript is rewritten around this, the recommendation in the discussion now names the corroborated rule rather than the fast one, and the conclusion carries the measured separation. Eight new checks in `validate.py` tie the arithmetic together, including that the baseline ends before the detachment. The provenance audit caught one error while this was being written: the manuscript said 35 dropped reports where the stations sum to 34.

### Packaging caught two ways the deposit could go stale

Two faults surfaced while checking that the archive matches the work. `package_archive.py` ran the audits without their write flags, so a deposit could ship a `CLAIMS.md` that predated the claims it was meant to list: the file said 82 audited values while the audit checked 90. The packager now regenerates both reports as part of building, so they cannot lag. And the README quotes counts about the package itself, four of which were stale. The packager now reads those counts back out of the README and compares them with the real ones, refusing to build on a mismatch. Tested by planting an old check count, which it caught.

## Seventeenth sweep, 1 September 2026: a pre-event surface, and a collaborator

Animesh Paudel reproduced the analysis independently and converted the outputs to GeoJSON, which is the first external reproduction of this package. He also pointed to a dataset this register had missed.

**The pre-event source surface.** Etienne Berthier released Pleiades tri-stereo digital elevation models of the rock-ice avalanche source area on 28 August 2026, acquired 13 October 2019, at 2, 4 and 20 m and under CC-BY-4.0 ([10.5281/zenodo.22147118](https://doi.org/10.5281/zenodo.22147118)). Its footprint spans 85.43 to 85.57 E and 28.24 to 28.35 N, covering all four initiation estimates but stopping about 4 km short of Rasuwagadhi, so it cannot re-trace the headwater. What it can do is replace commentary with measurement at the source.

`analysis/source_elevations.py` samples it, and checks the georeferencing before reporting anything: the model's highest cell must land on Langtang Lirung, and it does, 67 m from the catalogued position at 7198 m against a catalogued 7227 m, the difference being what 20 m resampling does to a sharp summit. The script refuses to write otherwise.

| Initiation estimate | Elevation | Relief within 100 m |
|---|---|---|
| Planet imagery | 4821 m | 94 m |
| Glaciological assessment | 4831 m | 79 m |
| USGS hypocentre | 5073 m | 155 m |
| GEOFON epicentre | 3819 m | 93 m |

Two findings. The reported detachment elevation of about 4880 m is corroborated to within about 60 m at two estimates, while the reported 5200 to 5400 m is not reached at any of the four, so the upper reported cluster is unsupported at every named position, although it may describe the top of a scar that none of these points marks. And the GEOFON epicentre sits a kilometre below the other three, which is a caution against using any single teleseismic position as an initiation point in terrain this steep rather than evidence about where the mass left the slope.

The fall height that the melt budget depends on is **not** changed by this, and the script says so in its own docstring. A fall height needs the scar extent, the scar is the difference between this surface and a post-event one, and no post-event surface has been released. The reported 1200 to 1830 m therefore stands as its sources give it, with the measurement recorded beside it.

**Work now under way elsewhere.** Paudel is pursuing a better centreline from HydroSHEDS at 1 arcsec and the NASA SWORD river database, and has approached DHM through a contact for the Devghat rating curve, which they say requires a formal request with forms and a fee. He notes correctly that integrating the rating minus base flow would be the best available validation of the flood volume, and that bodies recovered by district is a poor proxy for the spatial distribution of severity, which is what the manuscript already says where the claim is made.

## Eighteenth sweep, 2 September 2026

**The Copernicus activation grew from four areas of interest to six.** This is the substantive change.

| Area | District | Status |
|---|---|---|
| 05 Phosretar | Dhading | **Delivered 2 Sept**: 264 destroyed, 69 damaged, 230 possibly damaged of 563 graded, 422.56 ha, 1,200 of 14,000 people affected |
| 06 Kyundi | Chitwan | Added after 1 Sept, pending. On the Narayani below the confluence |
| 04 Bharatpur | Chitwan | Still pending, but now has a Legion acquisition scheduled for 3 Sept 02:25 UTC |

Phosretar was imaged by Pléiades and Pléiades Neo on 31 August. Its land-cover breakdown sums to 422.5 ha against the 422.56 ha observed-event area, the same internal agreement found at Syapru Besi, and an independent geodesic recomputation of its 41 polygons gives 424.11 ha, a 0.4 per cent difference. All 41 are classified `6-Mass Movement` / `Landslide`, as in every other area. It reports bridges as affected length, 2.5 km of 2.9 km, rather than as a count, so the corridor bridge total is unchanged by it and the difference is recorded.

Totals across the mapped areas move to **3438 destroyed and 4485 graded** over **1365.66 ha**, from 3174 and 3922 over 943.10 ha. The manuscript sentence in Sect. 3.5 is updated and now says four areas mapped with two more requested.

This broke the Keystone atlas cross-check, correctly. That check reconstructs the products as they stood on 29 August, and it was summing every delivered area, so a fifth area arriving in September was folded into a reconstruction of an August state. It now excludes areas delivered after the cutoff rather than netting them out, and reports how many areas it reconstructed, so the next addition cannot break it the same way.

**Everything else is unchanged.** No post-event surface has been released in Berthier's record, so the volume gap stands exactly where the seventeenth sweep left it. All four destroyed gauges were re-queried and are still silent on 2 September, which extends that evidence by two days. geo-pera's last commit is the 1 September retraction already recorded. asoto59g committed three times on 1 and 2 September, all of them recording Copernicus product status, which is the same change pulled directly here. Sakil786 unchanged since 28 August. Vantor still lists 16 items, matching what is recorded. The Planet catalogue returned an HTTP error on this attempt and was not re-counted. No casualty revision later than the 1 September 09:00 bulletin was found.

### Every value now leads to an address, 2 September 2026

The registry made every source declaration followable, but eight blocks resolved only to `press_relay`, a catch-all whose retrieve route honestly said no article URLs had been captured. That is still "just said". Those eight were chased down.

| Block | Now cites | Verified |
|---|---|---|
| Crisis declaration | Kathmandu Post and Ratopati on the Nepal Gazette notice | 200 |
| Hydropower and road damage | Kathmandu Post, 30 Aug, on NEA figures | 200 |
| Border closure and reopening | Himalayan Times and OnlineKhabar | 200 |
| Tibet-side toll | Al Jazeera and NBC News carrying the Xinhua figures | 200 |
| Exposure, both blocks | **CARE International's own pages**, not a relay | 200 |
| Mortuary capacity | Kathmandu Post, Outlook India, The Tribune | 200 |

Six new registry entries, 43 links reachable and none gone. Two findings came out of the chase rather than the linking. The crisis declaration's fifth district was recorded here as "reported in the Nepali bulletin, not yet confirmed by name": it is **Tanahun**, and the notice covers 15 local units, four each in Rasuwa, Nuwakot and Dhading, two in Tanahun and one in Gorkha, under Section 32(1) of the DRRM Act 2017. And the exposure figures turn out to trace to CARE's own reporting rather than to newspapers quoting it, which raises them from a relay to a primary source.

The hydropower figure is now linked but not changed. The same report itemises the affected plants and gives about 281 MW operational and 700 MW under construction, while its own itemised list sums to roughly 296 and 395. The article is not internally consistent, the 748 MW carried here sits between its readings, and the disagreement is recorded rather than resolved by preference.

**One value was withdrawn instead of linked.** An inundation cross-check attributed to the Microsoft AI for Good Lab, 37 km² and 4977 buildings and 10,200 people, rested on an attribution with no retrievable primary source, and repeated searches found no publication or dataset from that group for this event. Nothing in the manuscript rested on it. It is withdrawn with the reason recorded, and can be reinstated if the group publishes.

**The audit now reports the residual instead of passing it silently.** `audit_sources.py` separates entries whose retrieve route contains no address at all, and names any block resting on those alone. Two remain, both `this_study`: the adopted detachment-volume range and the threshold summary, whose provenance is a script in this same archive. Every `press_relay` citation that survives now sits alongside a source that does have an address, so no value in the package depends on an unaddressable source. A later casualty figure found during the chase, 1056 recovered and 4606 missing on the afternoon of 1 September, is recorded and explicitly not adopted: its scope is Nepal and India combined, which is not comparable with the NDRRMA series the analysis uses.

## Nineteenth sweep and full review, 3 September 2026

**Freshness.** Nothing new to ingest. The Copernicus activation is still open with six areas of interest and four delivered. Bharatpur's Legion acquisition was listed for 02:25 UTC on 3 September and had produced no product by that evening, so Chitwan remains unmapped. Kyundi and the Phosretar monitoring product are still pending. Berthier's record still holds only the 2019 pre-event surface, so the volume gap is unchanged. All four destroyed gauges were re-queried and remain silent.

**One real defect, in the code.** The lower-reach celerity was stated as 5.5 to 7.1 m s⁻¹ on the strength of the ten-minute arrival brackets alone. That reach ends at the Devghat gauge, whose published position is given to two decimal places and snaps 3.5 km off the channel, so it was never adopted for chainage and the distance was measured to the settlement node instead. The gauge and the node are **3.72 km apart**, which is 12 per cent of a 29.9 km reach, and none of that was propagated. The front was being timed at one place and the distance measured to another.

`gauge_chainage.py` now computes a `position_uncertainty_km` for every flow-path gauge: the snap distance where the station's own position was adopted, and the station-to-node separation where it was not. `leadtime.py`, `make_figures.py` and `audit_provenance.py` all propagate it.

| | Before | After |
|---|---|---|
| Lower reach, Kali Khola to Devghat | 5.5–7.1 m s⁻¹ | **4.8–8.0 m s⁻¹** |
| Decay over the corridor | three to nine | **three to ten** |
| Upper reach, source to Syabrubesi | 25–49 | unchanged, that gauge snaps to 25 m |

Three checks in `validate.py` now require every flow-path gauge to carry the uncertainty, require an adopted gauge's to be at least its snap distance, and require a gauge that could not be placed to carry a kilometre-scale figure rather than zero. Section 3.2 says plainly why the lowest reach is the widest, and the Fig. 2b caption says the bars there include it.

**Coverage gap closed in the audit.** The threshold fractions were audited in their prose form, 27, 69 and 87 per cent, but Table 4's own decimal cells were not, so a cell could have drifted from the data behind it. Six row-level claims now tie each cell to its station's stage over its warning stage. The audit runs 100 claims, up from 94.

**Reviewed and found sound.** All sixteen analysis scripts compile, and one dead variable was removed from `audit_sources.py`. Geodesy constants agree across scripts, 6371.0088 km in one and 6371008.8 m in the others, the same mean radius in different units. Every corridor node resolves to exactly one chainage under the rule the scripts share, five from gauge positions and four from settlement nodes. An independent recomputation of the headline kinematics straight from the JSON, using none of the project's own functions, reproduces every published figure. Style constraints hold: no prose semicolons, no em dashes, no first person, and the abstract is 198 words against a 200 limit.

### Casualty revision of 3 September, and what it does to the spatial claim

The seventh revision landed while this review was running, and it is the most consequential data change in the study. The NDRRMA search, rescue and relief update of 3 September, figures to 12 noon, gives **1252 dead and 4216 missing**, and itemises five districts.

| District | 1 Sept | 3 Sept |
|---|---|---|
| Chitwan | 321 | **355** |
| Nawalparasi East | 216 | **218** |
| Nawalparasi West | 170 | **208** |
| Nuwakot | 95 | **177** |
| **Rasuwa** | **27** | **127** |
| Gorkha, Dhading, Tanahun | 65, 55, 38 | not itemised, carried forward |

**Rasuwa rose 4.7-fold in two days.** The Chitwan to Rasuwa ratio has gone 14, 18, 18, 20, 11, 12 and now **2.8** to one. The manuscript's sentence that the displacement "is narrowing" and is "a feature of retrieval effort and distance, not a fixed property of the event" was written before this and is now demonstrated rather than asserted, so Sect. 3.5 is rewritten to rest on the instability itself: a snapshot of recoveries measures where retrieval had got to on the day it was taken. The spatial inference continues to rest on the bridge gradient, which cannot be carried downstream, and that was the reason for building it that way.

Three points of discipline. The bulletin itemises only five districts, so the other three are **carried forward and flagged** rather than dropped or guessed, with the itemised and carried sets named in `_version_h_provenance`. The eight sum to 1243 against a national total of 1252, and that **9-body residual is recorded, not distributed**; the version key names 1243 so that every version's label still equals its own arithmetic, which is what the validator checks. And the figures rest on a single relay with no second outlet corroborating them at the time of writing, which the registry entry says.

Three consequences elsewhere: Fig. 3b is regenerated and its caption now states that five districts are current to 3 September and three are carried from 1 September; the mortuary passage notes that Chitwan's 355 recoveries have passed even the 250-capacity emergency facility; and three provenance claims were added for the revised national totals and the ratio, taking the audit to 103.

`check_pdf_claims.py` was the only casualty of the process. It reads the generated claim list, and a stale list had it checking yesterday's numbers against today's PDF for the third time in this study. It now regenerates the list itself before reading it, and refuses to run if the provenance audit fails.

### The recurrence question, 3 September 2026

The alerting practitioner came back with the right challenge: eight days is not enough to establish a false-alarm rate, and rather than counting alarms one should calculate the expected wait until two stations drop together, which he expected to be days or weeks.

That is computable from the same baseline. Two independent outage processes of rate λ and duration d coincide within a window W at a rate of about λ₁λ₂(d₁+d₂+2W). Summed over the five adjacent pairs on the flow path, with a thirty-minute window:

| | Wait for a false coincidence |
|---|---|
| On the observed rates | **114 days**, about four months |
| Every rate at its 95 % upper limit at once | **5 days** |

**He is right and the paper now says so.** Eight days of history cannot separate a four-month wait from a five-day one, and that, not the count of zero, is the real limit on what the measurement establishes. His expectation of days to weeks sits inside the range. The worst case is deliberately pessimistic rather than a joint bound, and it gives the two stations that recorded no gap the corridor's mean outage duration, since a station with no observed gap has no observed duration either. Both choices are stated in the function that computes it.

His design critique is also now in the discussion, and it lands on the weak point rather than the arithmetic. Six stations are not a network for this hazard, and the measurement is better read as a bound on what the existing instruments can support than as a design. Fluvial forecasting works in hours and tolerates a sparse network with a human in the loop; a corridor whose first inhabited settlement is thirteen minutes from the source does not. The specific change that follows is **redundancy at a single point on separate power and telemetry**, which would make the independence assumption defensible instead of untested and would let equipment failure be told apart from site destruction, the discrimination every rule considered here lacks. A camera that stops returning frames while its co-located gauge still reports says something neither says alone.

**One reproducibility limit recorded.** The baseline is retrievable only while the service retains it, about two weeks. This measurement was taken on 1 September reaching back to 17 August, and re-running the script now reaches a shorter window and cannot reproduce the counts. The script therefore fixes the measurement date rather than using today's, with `--today` to take a fresh window knowingly, and the stored series and counts are the record.

## Twentieth sweep, 3 September 2026: an independent study of the same two events

**A new deposit, published today, is the most useful find in several sweeps.** Li et al., [10.5281/zenodo.22269502](https://doi.org/10.5281/zenodo.22269502), CC-BY-4.0: *Beyond source-specific GLOF hazard maps, a two-event empirical stress test of infrastructure exposure in the Gyirong–Trishuli trans-Himalayan corridor*. It takes published GLOF hazard envelopes for Lake II as a fixed pre-event baseline and tests their out-of-sample capture of documented damage from both the 8 July 2025 Purepu outburst and the 26 August 2026 cascade. Evidence cutoff 30 August 2026.

**It reproduces this study's recurrence interval exactly.** Their customs-yard chain gives 177 days from damage to recovery and 237 days from recovery to redamage. Those are the two numbers in Fig. 4b and in Sect. 4, derived here from different sources. Independent agreement to the day on both intervals.

Their parallel chain for the road bridge gives **173 and 241 days**, because they date the bridge's functional recovery to 28 December 2025 and the customs point's to 1 January 2026. That is a useful caution rather than a disagreement: the crossing is one thing in ordinary speech and several assets operationally, and the interval depends on which is counted. The manuscript now says so and cites them for both.

**Four primary sources located through their release**, each requested and responding, recorded as leads rather than registry entries because no value here is yet taken from them:

| Source | Bears on |
|---|---|
| [UNOSAT damage vectors](https://doi.org/10.63253/1y26ihdq) | Institutional remote sensing independent of Copernicus EMS |
| NDRRMA Rasuwagadhi situation report, 8 July 2025, archived PDF | The 2025 event, and evidence that the authority does archive some reports |
| Nepal Electricity Authority annual report 2081-82 | The primary behind the hydropower figure carried here from press, and the way to settle its recorded inconsistency |
| Nepal Red Cross situation update, 26 August 2026 | Damage and response |

That distinction is now written into the registry's contract: it holds sources a value is actually drawn from, so a reference from a data block always means the value came from there. Leads live in `damage_independent.json` and here.

**The Durban 2022 reference the practitioner asked about does not appear to exist in the open literature.** Two targeted searches found the event well documented, including a peer-reviewed flood chronology in the South African Geographical Journal and a World Weather Attribution report, but nothing on gauging-station or weir destruction or on the resulting hydrometric data gaps. The closest relevant finding is the general point that weirs operating above design capacity produce unreliable records, which is not the same claim. It stays out of the manuscript, and the negative result is worth reporting to him, since his company's operational experience may be the only record of it.

**Nothing else moved.** Bharatpur's Copernicus product had still not appeared by 17:00 UTC on 3 September despite the acquisition listed for 02:25 that morning, and Kyundi and the Phosretar monitoring product are still pending. Berthier's record still holds only the 2019 pre-event surface.

## DHM correspondence, 4 September 2026: what the department holds

A data request to the Hydrological Data and Network Section, made through a co-worker, produced three statements that matter whether or not the curves themselves arrive.

| Station | Number | Most recent rating the department holds |
|---|---|---|
| Narayani at Devghat | 450 | **2023**, three years before the event |
| Trishuli at Kali Khola | 449.91 | **2019**, seven years before |
| Trishuli at Galchi | none issued | **None held** |

**The first goes straight into the paper.** The discharge and volume figures for Devghat, including the 19.96 × 10⁶ m³ excess volume that anchors the melt budget, rest on a rating last revised three years before a hyperconcentrated debris flow passed through the section. The manuscript carried a generic caveat about ratings shifting by tens of per cent; it now carries the agency's own statement of the vintage, which is a sharper and more checkable version of the same point. The third also goes in: Galchhi can never yield discharge, only stage, which is why it contributes an arrival time here and nothing else.

**Two independent confirmations of the station identification.** The department refers to 449.91 as Trishuli at Kali Khola and 450 as Narayani at Devghat, and says Galchi has no station number. Those are exactly the `station_index` values this package rebuilt from the river-watch service, and Galchhi's is empty. Since the Rasuwagadhi and Syabrubesi correction rested entirely on getting station identity right, an independent agreement from the numbering authority is worth recording.

The curves are requested at a quoted fee of NPR 540 and have not arrived. The correspondence is registered as a source in its own right, cited institutionally through the department's published data-request channel rather than by anyone's personal address, since it states things about the department's holdings that no public page records.

## Twenty-first sweep and review, 6 September 2026

**The primary source for the casualty series was found, and it confirms the relays exactly.** NDRRMA Situation Report #01, 1 September 09:00, is archived at a stable URL: [ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf](https://ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf). Its district table gives Chitwan 321, Nawalparasi East 216, Nawalparasi West 170, Nuwakot 95, Gorkha 65, Dhading 55, Tanahun 38 and Rasuwa 27, with 987 dead and 3,916 missing. That is the version this package adopted from wire reporting, district by district and on both totals. The relayed figures were faithful, and the series now rests on the authority's own document. Only number 01 is retrievable at that URL pattern.

**It corroborates the headwater trace.** The report describes the source as *approximately 20 km upstream of Rasuwagadhi*. The trace on GLO-30 gives 20.1 to 24.0 km, so the agency's own figure sits at the lower edge of the range. This is the first statement of that distance from a source that is not a reimplementation of this study's method, and it is now cited in Sect. 2.

**It also contains the station conflation.** The report states that the Bhote Koshi station at Syabrubesi stopped transmitting at about 08:50 with a last level of 1.62 m. The archive shows 1.62 m is the last reading of the **Rasuwagadhi** station, warning stage 6.0 m, while Syabrubesi last read 3.80 m against a 5.50 m warning stage. The error is in the official record, not only in relays of it, which makes the correction a contribution rather than a housekeeping note. Sect. 2 and the Table 4 caption now say so.

Three further confirmations: the chronology, peak discharge, flood volumes and SMS count all match; the greater-than-5 Mw signal is described as generated by the mass movement and not its cause, which is the reading adopted here; and Devghat is given as 15:20, which the station's own series places mid-rise at 5.70 m.

**New from the report, recorded but not merged:** about 1.6 million people impacted, 41 motorable bridges washed away and 4 damaged on the authority's count, 3,702 households and 14,461 people isolated in Gosaikunda and Amachhodingmo for up to six days, 11,814 rescued including 253 foreign nationals, 21,011 personnel deployed, and an estimated 1 km² detachment area, which is a new constraint on the source with no thickness attached.

**Copernicus.** The Phosretar monitoring product was delivered on 5 September from Legion and Pléiades Neo imagery and supersedes the original: extent 422.56 to 639.20 ha, destroyed 264 to 397. Totals across the four mapped areas move to **3571 destroyed and 4685 graded over 1582.30 ha**. Bharatpur and Kyundi are still pending, and Bharatpur's 3 September acquisition produced nothing.

**Casualties to 4 September**: 1,294 dead and 4,216 missing, with Chitwan 359, Nawalparasi East 219, Nawalparasi West 212, Nuwakot 184, Rasuwa 140, Gorkha 72, Dhading 63 and Tanahun 38. The district table sums to 1287 against a headline of 1294, leaving seven unattributed, with nine more recovered in India and counted apart from both. The discrepancy is carried, not reconciled. The Chitwan to Rasuwa ratio is now **2.6 to one**, down from twenty on the third day, which is the behaviour the manuscript predicted and the reason the spatial claim rests on the bridge gradient rather than on this distribution.

**Two checks were repaired.** The 29 August reconstruction in the Keystone cross-check broke again when Phosretar acquired a superseded block of its own: the function tested for supersession before it tested whether the area existed on the cutoff date. It now takes each area's *first* delivery, superseded versions included, so an area added in September is excluded however many times it is later revised. And the float-placement check, which had lived in a scratch file and been lost twice, is now `analysis/check_floats.py` and runs inside `make check`.

All four destroyed gauges were re-queried and remain silent on 6 September, eleven days after the event.

## Collaborator delivery, 6 September 2026: a centreline and a review

**An independently digitised centreline.** A. Paudel supplied a single CRS84 LineString of 1024 vertices running from the scarp to Devghat, 200.04 km in total. Its scarp-to-Rasuwagadhi length is **22.32 km**, against the 20.1 to 24.0 km traced here on GLO-30, so it falls almost exactly at the midpoint. This is the first independent measurement of that segment that is neither a reimplementation of this study's method nor another reading of the same terrain model, and the segment is the largest single uncertainty in the paper. Node positions snap to his line within 0.54 km, most within 0.2 km.

Downstream of Betrawati his line runs systematically shorter, by about 1 km at Malekhu, 1.6 at Mugling and 2 at Devghat. He explains why, and the explanation matters more than the difference: the channel is braided and moves within its valley floor between years, and at this scale the flow follows the steepest grade and short-circuits bends rather than tracking a mapped low-flow centreline. A flood path should therefore be shorter through meandering reaches. That is also an endorsement of the method used here, since the headwater was traced by steepest descent for exactly that reason, and it is now stated in Sect. 2. His geometry is recorded as a cross-check and not adopted: treating one digitisation of a shifting braided channel as definitive would misstate what is knowable.

**The line now ships and is used.** It is committed as `data/river_centreline_paudel.geojson`, carrying its own source, grade and licence statement inside the file, and the comparison is reproducible by `analysis/compare_centreline.py`, which writes the `independent_centreline_check` block in `data/channel.json` and runs as a stage of `analysis/reproduce.py`. Figure 1 draws the headwater from this geometry, where every earlier version drew a straight dash between the source and Rasuwagadhi and the caption said so. The measured lengths the analysis uses are unchanged. One consent item is outstanding: the file is released with the package under CC-BY-4.0 on the assumption that a contributor who supplied it for this work agrees to that, and the assumption should be confirmed before the deposit is published.

**Thirty-five review comments**, recovered from the annotated PDF and saved to `paper/review/paudel-2026-09-06.md`. Three are applied:

- **Celerity is the wrong word.** It denotes a wave property, and what this study measures is the arrival of a front over a distance. Every use is now **flood front velocity**, seven in text and captions.
- **Base flow is the wrong word** for the discharge the river happened to be carrying, which is **antecedent discharge**.
- **A numerical inconsistency he caught**: the paper gave ice temperatures as 0 to −10 °C in one place and 0 to −5 in another. Neither was wrong, they describe the closed-form table and the sensitivity grid respectively, but the paper did not say so. It does now.

One of his figures was checked and not adopted: he suggests 19.90 × 10⁶ m³ for the event volume where this package carries 19.96, and the authority's own situation report gives 19.96.

**A caution about what he reviewed.** His marked-up copy is the version posted to EarthArXiv: twenty pages, velocity decaying by nine to thirteen, Devghat at 4.0 m s⁻¹, and the two Bhote Koshi stations still held as one record. Several comments target text that has already changed for other reasons. The remaining ones, including his recommendation to express stage as metres below the warning level rather than as a fraction, need a pass against the current manuscript.

**A packaging fault, caught before publication.** His zip was dropped into `data/` and the packager swept it into a build: 372 kB of opaque archive in the deposit. This is the same failure that put the agent-tooling database in v1.0.0. The packager now refuses nested archives and says so, rather than including what it cannot inspect. The archive itself has been unpacked and removed: its centreline is committed as above, and the annotated PDF is kept out of the deposit under `paper/review/`, which is correspondence rather than data.

## Practitioner review, second round, 6 September 2026

A flood-forecasting practitioner pressed four points: eight days is too short to
establish a reporting mechanism, the expected wait for two stations to drop
together is calculable and probably days to weeks, six sensors is not a network
for this hazard, and the answer is cameras and redundant instruments at a point
rather than more gauges.

**Three were already measured and are in Sect. 4.2.** The wait for a false
coincidence is 114 days on the observed rates and about five days with every
rate at its upper limit, so his estimate matches the pessimistic end and the
honest answer is that eight days cannot separate the two. The paper already says
six stations are not an adequate network, that fluvial forecasting works in
hours where this corridor works in minutes, and that redundant instruments and
cameras that fail informatively would help more than additional silent gauges.

**The fourth sent the search somewhere useful.** Both recommendations have
domestic precedent that this register had missed. The Tsho Rolpa system of 1998
used fully redundant sensing, so that several sensors had to fail before a false
alarm or a missed event, across seventeen warning stations in two valleys
([Bell et al. 1999](https://www.iahr.org/library/infor?pid=13718)). It had ceased
operating by 2002, which the national assessment attributes partly to the lake
having been lowered and the hazard being taken to have passed
([ICIMOD 2011](https://documents1.worldbank.org/curated/en/150061467986261271/pdf/98829-WP-Box393178B-PUBLIC-Glacial-lakes-and-glacial-late-outburst-floods-in-Nepal.pdf)).
So the architecture recommended here is a return to a design this country
already built, and the constraint is sustainment rather than knowledge.

**The same assessment carries the stronger finding.** A system installed in 2001
on the **other** river named Bhote Koshi, the one entering Nepal at Kodari, was
assessed as yielding six minutes of warning because every station lay below the
border, and the remedy identified was instruments in the upper catchment in the
Tibet Autonomous Region rather than more of them downstream. That is the
structural limit this study measures on the Rasuwa corridor, stated a decade
earlier for the neighbouring catchment, and it answers the practitioner's
strongest point directly: density is not what bounds lead time, placement
relative to the source is. Both are now in Sect. 4.2. The two rivers are easy to
confuse, which is why the data block recording this says in terms which one it
means.

## Language and framing pass, 6 September 2026

The manuscript was checked against the documented signs of machine-written prose
and against a stricter concern, that a paper measuring a warning chain can read
as an indictment of the people who operated it.

**The mechanical tells were already absent.** A scan for the vocabulary,
constructions and punctuation habits those guides list returned nothing beyond a
proper noun and factual uses of "never triggered". No em-dashes or semicolons
appear in the prose.

**The abstract understated the toll by more than half.** It said the cascade
killed "more than 500 people", written when the reported figure was 538 and never
revised as it passed a thousand. It now reads at least 1294 killed and 4216
missing, matching the preferred entry in `casualties.json`. The reason it drifted
is that no claim covered it, so five checking stages passed a stale number in the
most-read sentence of the paper. Both figures are now audited.

**The paper described only what the warning chain failed to do.** It carried no
account of the response, although the figures sit in the data package.
Section 4.3 now records 11,814 rescued, 253 of them foreign nationals, 21,011
personnel deployed and 14,461 people isolated for up to six days, and states
plainly that what this study measures is settled before any responder can act.
The two should not be read as one verdict.

**Three phrasings carried reproach rather than measurement.** "The time the
institutional chain consumed" became lead time set against flood magnitude. "Is
still classified as an equipment fault" became enters the system as an equipment
fault rather than as a hazard signal, which describes the architecture rather
than anyone's diligence. "Became the body-recovery zone" became received most of
the bodies, in both the abstract and the conclusions.

The conclusions previously ended on the design case for a replacement bridge.
They now close on the point that every measurement here came from records the
agencies already publish, so the same assessment can be made on other networks
before an event rather than after one. Thousands separators were standardised to
the thin space, the paper having mixed two conventions.

## Figure palette audit, 6 September 2026

The four figures were checked against a colour validator that measures OKLab
separation under simulated protanopia and deuteranopia rather than judging it by
eye. The three categorical hues in use, Okabe-Ito blue, vermillion and green,
pass every check, worst adjacent pair 11.0 under deuteranopia and 25.8 under
normal vision. Two faults turned up that eyeballing had missed.

**Figure 1 carried two oranges 8.7 apart.** The detachment source star used
`#D55E00` and the destroyed-gauge triangles `#B4460A`, which is below the
separation at which two hues can be told apart even with full colour vision, and
both sat in the same legend for unrelated categories. Marker shape already
separates a star from a triangle, so both now use the event colour. That also
leaves `#B4460A` meaning one thing across the whole paper, negative lead time and
the impact reach, where before it meant that in three figures and "destroyed
gauge" in the fourth.

**The river line was the faintest element on the page**, `#5A9BC4` at 2.96:1
against the paper, below the 3:1 floor, on a figure where the channel carries the
geography. It is now `#4A90B8`, which clears 3:1 at the same chroma, so the base
layer stays recessive relative to the data marks without dropping out in print.

The validator also fails the river on a chroma floor, correctly by its own terms
and not applicably here: that floor exists so a hue keeps doing identity work as
a categorical series, and the channel is a base layer rather than a series. The
same reasoning applies to the serif face, which a dashboard guide would flag and
which is right for a paper set in a serif body font.

Structural checks pass. No figure uses two y-scales, gridlines are solid
hairlines rather than dashed, markers carry a surface ring rather than a border,
and no figure labels every point.

## Co-author confirmation, 9 September 2026

A. Paudel replied on the open questions and joined as a co-author, ORCID
0009-0005-3833-2718.

**The consent item is closed.** He confirmed that inclusion of his centreline in
the Zenodo archive, the CC-BY-4.0 terms and attribution under his name are all as
he wants them, and that keeping his line as a cross-check rather than adopting it
is the right treatment. The file and its registry entry now record the
confirmation instead of an assumption, so nothing blocks publication of the
deposit on that account.

**He confirmed two readings of the gauge archive.** The Devghat front arrives at
14:40, the upper end of the 14:30 to 14:40 bracket carried here, and Rasuwagadhi
peaks at 1.62 m against a 6.0 m warning stage while Syabrubesi peaks at 3.80 m
against 5.50 m, both falling silent below their thresholds. This is a second
hydrologist reading the same archive rather than a separate measurement, and it is
graded that way.

**He asked for the departure from the official chronology to be stated, and it now
is.** Taking arrival times from the instrument archive rather than from the
department's published chronology moves every front velocity in the paper, and
Sect. 2 previously showed the correction at one station without saying that the
same choice applies throughout. It now states that where the two disagree the
instrument record is used, gives Devghat as the second instance, and records his
point that the situation report was a rapid analysis written during the response
and for the response rather than to fix a chronology for later work.

**Terminology settles where it is.** The manuscript is consistent on flood front
velocity and the data fields keep `celerity`, at his suggestion, because renaming
them would break code written against release 2.x. The README now says so, so a
reader moving between the paper and the package is not left to guess that the two
names are the same quantity.

**His comment 22 was about wording, not the figure.** The volume sentence set a
57.40 total flow beside a 19.96 excess in a way that invited the larger number to
be read as the event's. It now says that removing the antecedent discharge leaves
19.96, which is the volume the event delivered.

**Still open.** His affiliation, which the author block carries as a placeholder
that `make check` reports. The stage-as-percentage change and the mortality
sentence, which he has offered to draft in LaTeX directly. And the rating curve,
which the department has still not supplied, along with no confirmed price, the
NPR 540 having been a verbal quote.

The float-placement check was loosened from one page to two. Section 3 first
cites the chronology table, the propagation figure and the architectures table
within about a page of each other and only two of the three fit on the page after,
so one necessarily lands two pages out. That is a property of how much the section
has to show at once rather than a placement fault.

## Prune and four-reviewer audit, 9 September 2026

The package was reviewed as four roles at once, data curation, software, editing
and research integrity, and pruned on the findings.

**A published number rested on a coordinate with no source.**
`analysis/trace_headwater.py` hardcoded its four start points rather than reading
`event.json`, and the copy had drifted: it traced a `sentinel2_scar` point at
28.28508 N, 85.51282 E that `event.json` has never held, and never traced
`gfz_seismic`, which it has held since 28 August. The script now reads the start
points, the settlement positions and the calibration length from the data. Traced
again on the same GLO-30 window, the four estimates the package actually holds
give 22.88, 22.26, 22.24 and 19.17 km, an envelope of 18.20 to 24.04 km against
the 20.09 to 24.04 published. The lower bound had been set by the phantom point.
This is recorded and not yet adopted, because whether the GEOFON epicentre
belongs in the envelope is a judgement the source elevations bear on: it sits
about a kilometre below the other three on the Pléiades surface.

**Four telemetry rates were about twelve per cent high.** The denominator took
the minimum span across stations, which is Galchhi's: that station came online a
day into the window, so the divisor was 8.0 days while the gap episodes were
summed over each station's own nine-day record. On the union window the
single-station rate is 1.0 a day rather than 1.1, the Poisson upper limit 0.33
rather than 0.38, and the false-coincidence wait 144 days centrally and about
seven at the upper limits rather than 114 and five. The threefold separation
between the two rules is unchanged, because both rates scale together. Galchhi
recorded no episode, so no count moved, only the divisor.

**The timeline reproduced the error the paper exists to correct.** Its 08:40 and
08:50 entries attributed Rasuwagadhi's 1.62 m reading and its warning stages to
Syabrubesi, which is the situation report's conflation, uncorrected and unflagged.
Both entries now carry the instrument record with a `_corrects` field saying what
the report said.

**A withdrawn figure was shipping in the deposit.** A 1,900 m fall height reached
an early draft from a source-free summary; `event.json` records it as withdrawn
because it appears in no source. It survived in four places in
`evidence/EVIDENCE-DOSSIER.md`, which ships in the archive, including as a live
row of the melt table that is the paper's novel contribution. The row is
recomputed at 1,830 m, the three other mentions are marked, and the packager now
watches for the string.

**Deleted.** `docs/`, five language-model drafts that nothing read and the
deposit excluded by construction. `paper/manuscript.md`, a superseded drafting
copy that still asserted casualty figures the study had withdrawn and carried an
unfilled author placeholder, together with the dead machinery in
`audit_provenance.py` that checked it and the instruction in
`paper/latex/README.md` telling an editor to keep it in sync.
`analysis/archive/`, which shipped in the deposit while its own README said it
did not, and which carried the station conflation with no note in the file.
`paper/latex/pdfscreen.sty` and `pdfscreencop.sty`, Copernicus production files
unreachable from any author build and absent from the build log. The `response`
block in `casualties.json`, the only block in the package with no source, no
grade and no date, superseded by the situation report's own figures and read by
nothing. `paper/latex/manuscript.fls`, tracked, gitignored, and leaking an
absolute local path.

**Corrected without deletion.** The grade legend in `README.md` and in the
generated `data/INDEX.md` defined B1 and B2 as "bounded or modelled estimates",
where `event.json` defines them as a named domain scientist and government
figures relayed by wire. The competing-interests statement was singular for a
two-author paper, and the submission checklist had certified it as such. A claim
in the plan that `README.md` labelled the drafts as AI-generated, which it never
did. The discussion asserted a debris flow "above 45 m/s", the top of a 25 to 49
bracket stated as though it were the measurement. A novelty claim that the same
section disclaims. An EMS classification given for three sites where four
products are delivered.

**Recorded and not acted on.** The Perth affiliation does not trigger the
Research4Life waiver, so the fee route is unsatisfied and the exposure stands.
`references.bib` is the one layer outside the provenance machinery, its DOIs
checked by nothing; all 35 were verified against Crossref by hand in this audit
and all resolve with matching titles. Episode timestamps are not stored in
`telemetry_reliability.json`, so the zero-coincidence result cannot be
recomputed from the package.

## Currency sweep and release 3.0.0, 9 September 2026

**Every live source was re-queried.** Three had moved, one had not, and the rest
are geometric or archival and do not move.

**Casualties, 8 September.** NDRRMA figures now stand at **1357 dead and 5326
missing**, against the 1294 and 4216 this package carried from 4 September, with
13,583 rescued and 6827 injured treated. The abstract, Sect. 3.3 and the
conclusions carry the new figures. Graded B2: the bulletin itself was not located
at a stable URL, so the source is a relay.

**The missing are now resolved by district, which the paper needed.** Sect. 3.3
had to infer mortality location from a bridge-washout gradient because the only
district-resolved figure was bodies recovered, which measures where retrieval had
reached rather than where people were lost. NDRRMA's 8 September breakdown gives
**2860 missing registered in Rasuwa and 1981 in Nuwakot**, the two districts
where lead time was negative or negligible, with about 587 foreign nationals not
attributed to a district. That is 4841 of 5326 in the two upstream districts, and
it points the same way as the bridge gradient from an independent measure. The
three figures sum to 5428 against the stated total of 5326, an excess of 102
which is carried and not reconciled. Registration district is not proof of
location when the wave arrived, and the paper says so.

**Copernicus EMS is unchanged.** Re-queried against the activation's
machine-readable status: AOI04 Bharatpur and AOI06 Kyundi still list no products,
and the four delivered are as recorded, so the damage totals stand.

**Every registry link was re-requested.** 52 reachable, 0 refusing automated
requests, 0 with an unverifiable certificate, 0 gone, and 3 sources that carry no
permanent link by nature and say so.

**Release 3.0.0, not 2.1.0.** The published state is 2.0.0. Its archive was
downloaded and diffed against this build rather than the version being guessed.
Three changes make it major by the same standard 2.0.0 was held to, that both the
structure and the results changed:

- `casualties.json` no longer carries a `response` block, so code reading it
  raises rather than returning a stale figure.
- `analysis/archive/` is gone, two files that shipped in 2.0.0.
- The telemetry false-alarm rates are recomputed on the corrected nine-day
  window: 1.0 a day rather than 1.125, a Poisson limit of 0.33 rather than 0.375,
  and a false-coincidence wait of 144 days rather than 114.

The version DOI is `10.5281/zenodo.22679444`, reserved and returning 404 until the
draft is published, under the unchanged concept DOI `10.5281/zenodo.22153581`
that the manuscript cites and that always resolves to the newest release.
