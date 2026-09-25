# Nepal floods, debris flows, GLOFs & flood-triggered landslides — geospatial dossier

Compiled 2026-09-24. All times are **Nepal Time (NPT, UTC+05:45)** unless marked. Coordinates are **WGS84 decimal degrees (lat, lon)**.
Precision tags: `OSM` = OpenStreetMap node or polygon centroid (ODbL); `DHM` = Dept. of Hydrology & Meteorology station record; `ward centroid` = BIPAD ward centroid (only locates the ward, not the site); `approx` = my estimate, error stated where possible.
`km` = chainage along the flow path, measured by me on OSM river centrelines (or the Acharya & Paudel 2026 centreline for the 2026 event). It is a channel distance, not a straight line.

## 0. Files next to this report (in `research/`)

| File | What it is |
|---|---|
| `events_points.geojson` / `.csv` | 84 key points (origins, villages, infrastructure, gauges, record rain stations) with `event`, `seq`, `role`, `precision`, `source`, `chainage_km`, `time_npt` |
| `melamchi/melamchi_flowpath.geojson` | Pemdang lake → Melamchi Khola → Indrawati → Dolalghat, 73.6 km (OSM) |
| `thame/thame_flowpath.geojson` | Upper Ngole lake → lower lake → Thame Khola → Bhote Koshi → Dudh Koshi, 124.6 km (OSM; the Dudh Koshi below ~90 km has small gaps) |
| `rasuwa2025/rasuwa2025_flowpath.geojson` | Purepu lake (approx) → Purepu/Chusumdo Tsangpo → Lende Khola → Rasuwagadhi → Trishuli → Devghat, 211 km (OSM plus Paudel centreline) |
| `rasuwa2026/rasuwa2026_flowpath_paudel_CC-BY.geojson` | Source scar → Devghat, 200 km, 1,024 vertices (Acharya & Paudel 2026, Zenodo 10.5281/zenodo.22679444, **CC-BY 4.0**, cite it) |
| `sep2024/roshi_khola.geojson` | Roshi Khola headwaters → Panauti → Khopasi → Roshi RM → Sun Koshi, 60.8 km (OSM) |
| `bipad/*.csv` | Official BIPAD incident pulls (loss counts per incident) for each event window |

**About BIPAD** (`bipadportal.gov.np/api/v1/incident/`, the official Nepal Government incident database). Its point coordinates are usually **ward centroids**, and ward attribution is sometimes wrong. For example, the Jhyaple Khola bus landslide is filed under Netrawati Dabjong-1, about 35 km north of the real site. Use BIPAD for counts, not for locations.

---

## Summary

| # | Event | Date / key time (NPT) | Type | Dead / missing (best official) | Path length |
|---|---|---|---|---|---|
| 1 | Melamchi flood | 15 Jun 2021; began ~16:30, main surge ~19:00–21:00 | Rain and snowmelt → headwater erosion, small moraine-lake breach, landslide-dam outburst → debris flood | 5 dead + 20 missing (NDRRMA/BIPAD); ≈25 lives (Chen et al. 2024) | ~74 km to Dolalghat |
| 2 | Thame GLOF | 16 Aug 2024; breach ~13:00, Thame ~13:30 | Cascading moraine-lake GLOF | 0 dead, 1 injured, 135 displaced | Deposition 9 km; effects over 50 km |
| 3 | Late-September floods | 26–29 Sep 2024; peak night of 27–28 Sep | Extreme rain (Daman 410 mm/24 h) → floods and landslides | 244–250 dead, 18 missing, ~178 injured | Multi-basin |
| 4 | Rasuwa (Lende) GLOF | 8 Jul 2025; Rasuwagadhi/Timure ~03:00–03:10 | Supraglacial-lake GLOF (Purepu Glacier, Tibet) → debris flow | NDRRMA 10 July: 10 bodies, 19 missing (Nepal); Tibet ~11 missing | >100 km (Mugling) |
| 5 | Koshi / Ilam | 3–5 Oct 2025; deaths on 4 Oct | Post-monsoon extreme rain → landslides | Police 5 Oct: 52 dead nationally, 37 in Ilam | — |
| 6 | Simaltal | 12 Jul 2024 | Landslide pushed 2 buses into the Trishuli | see §6 | — |
| 7 | **Rasuwa–Gyirong catastrophe** | **26 Aug 2026 08:37:10 (USGS; EMSC 08:37:44)** | Ice–rock avalanche (Langtang Lirung N face) → debris flow and barrier lake | **Nepal 1,451 bodies/remains recovered, 5,705 missing (NDRRMA 22 Sep 2026); China 43 dead, 519 missing** | 200 km to Devghat |
| 8 | Rest of 2026 monsoon | onset 19 Jun 2026 (6 days late) | Floods and landslides | ~87 deaths outside 26 Aug (BIPAD, 1 Jun–23 Sep); worst: Thabang, Rolpa, 12 Aug (13 dead) | — |

---

## 1. Melamchi flood / debris flow — 15 June 2021 (Sindhupalchok)

**What the source was.** It was not a single glacial lake. ICIMOD (Maharjan et al. 2021) and Chen et al. (*Nature Geoscience* 2024) describe a cascade:
1. Rain from 9 June plus heavy snowmelt eroded glacial deposits in the Pemdang, Yangri and Larke headwaters (≈70,000 m² of moraine in the Pemdang headwater alone).
2. A small moraine-dammed lake at the head of the **Pemdang Khola** breached. It was 2,761 m² in Nov 2020 at 4,770 m, with a 40–50 m breach; Chen et al. give 4,725 m.
3. The flow filled and then cut through the **Bremthang (Bremathang)** old landslide-dam plain (≈0.5 × 2 km, ~3,600 m). The dam was incised by more than 100 m, releasing **48.6 Mm³** from a 3.8 km reach, 64% of all eroded material. Bremthang is 5.8 km below the lake and 1.8 km below the Pemdang–Melamchi confluence.
4. Undercutting triggered a **new landslide at Melamchigaon** that dammed the river for ~45–60 minutes. ICIMOD gives 0.18 km² and ~0.67 Mm³ (2,400→2,000 m); Chen et al. give ~6 Mm³ below Melamchi Ghyang.
5. The dam burst, followed by bank erosion and massive downstream aggradation.

**Timeline, 15 June 2021**
| Time | Event | Source |
|---|---|---|
| 9–15 Jun | Rain from 9 Jun; Sermathang (2,625 m) >100 mm on 11 Jun, >200 mm over 6 days; hourly max 22 mm (10 Jun), 37 mm (11 Jun), ~10 mm (14–15 Jun) | ICIMOD 2021 |
| 15 Jun ~16:30 | Flooding begins on the Melamchi (Helambu → Melamchi Bazaar) | Kathmandu Post 17 Jun 2021 |
| 17:05 | Hourly rainfall max 29.9 mm recorded in the basin | Adhikari et al. preprint (rs-3764408) |
| 18:00–19:00 | Nakote gauge (DHM 627.5) stage **drops 4.7 → 3.0 m** (landslide damming ~45–60 min), then **rises to ~6 m within minutes**. The gauge was later destroyed | Adhikari et al.; ICIMOD 2021 ("decreased for 45 minutes") |
| evening | Helambu residents phone downstream; Chanaute and Melamchi Bazaar evacuated before the surge. ICIMOD says the flood came "in the evening when it was still light" (sunset ~19:05) | ICIMOD 2021 |
| "after 8 or 9 pm" | Flood hits Melamchi Bazaar (AFP via News24; cited by Wikipedia) | Wikipedia; News24 |
| 16–18 Jun | Floods persist 3–4 days. Follow-on floods on **31 Jul 2021** (Saturday night; ~55–60 houses in Kiul, Chanaute, Gyalthum; Bahunepati bridge at risk) and **11 Aug 2023** | Himalayan Times/Setopati; Chen et al. |

Modelled peak discharge at Nakote is **7,162 m³/s** (HEC-HMS, Adhikari et al. 2023, *Natural Hazards Research*). The preprint prints the time as "9:35 PM, June 16", which is probably a date error. The same study gives 2,893 m³/s "average" at Melamchi Bazaar. The reconstructed flood stage was 10–20 m.

**Flow path with coordinates** (km from the Pemdang lake along the OSM centreline)
| km | Place | lat, lon | Precision / notes |
|---|---|---|---|
| 0.0 | Pemdang Khola glacial lake (breached) | 28.1311, 85.5150 | approx ±0.5 km (reader coordinate on AGU Landslide Blog, consistent with ICIMOD description) |
| 5.3 | Pemdang–Melamchi Khola confluence | 28.0987, 85.5474 | OSM |
| ~7.1 | Bremthang old landslide dam (toe) | 28.0831, 85.5455 | approx (ICIMOD distance on OSM line); sediment plain upstream around 28.09–28.10 N |
| 14.8 | Melamchigaon new landslide | 28.0211, 85.5325 | ICIMOD DMS (28°01′15.948″N 85°31′57.040″E) |
| 15.5 | Melamchi Ghyang village | 28.0177, 85.5233 | OSM |
| 16.2 | Nakote DHM gauge 627.5 | 28.0108, 85.5353 | DHM |
| 22.7 | **Ambathan, Melamchi Water Supply Project headworks and adit** | 27.9639, 85.5338 | OSM "ambathan adit" |
| 24.4 | Timbu | 27.9537, 85.5479 | OSM |
| ~27.7 | Kiul (Kiwul) riverside | 27.9318, 85.5556 | approx (river snap) |
| ~30–32 | Chanaute Bazaar (Helambu-7) | not geocoded | between Kiul and Gyalthum; BIPAD ward-7 centroid 27.9175, 85.5117 is not the bazaar |
| 34.5 | Gyalthum | 27.8817, 85.5412 | OSM |
| 38.0 | Talamarang | 27.8518, 85.5399 | OSM |
| 42.3 | Melamchi–Indrawati confluence | 27.8333, 85.5772 | OSM |
| 43.0 | Melamchi Bazaar (town) | 27.8293, 85.5761 | OSM |
| 47.2 | Bahunepati | 27.7924, 85.5726 | DHM precip station |
| 73.6 | Dolalghat (Indrawati–Sun Koshi) | 27.6357, 85.7093 | OSM; distal deposition ("Ribarma to Haldebesi near Dolalghat") |

Weather stations: Sermathang AWS 27.9442, 85.5955 (approx, OSM hamlet); Ganja La AWS 28.1545, 85.5625 (4,962 m).

**Flow and geomorphic numbers** (Chen et al. 2024 unless noted)
* Total erosion was **75.8 Mm³**. Headwaters supplied 6.3 Mm³, three-quarters of it from the Pemdang, and 5.4 Mm³ of that was trapped at Bremathang. **22.7 Mm³** was deposited in the Melamchi basin and **53.1 Mm³ (70%) was exported** downstream.
* Lower-reach **aggradation was 4–23 m**, reaching **15–23 m near Kyul (Kiul)** with 1–6 m of re-incision by Dec 2023. The channel widened 2–6× (30–60 m → 100–300 m). Boulders reached 5–10 m (b-axis up to 10.3 m).
* ICIMOD estimates **1.3 × 10⁷ m³** deposited from Ribarma to Haldebesi over **6.5 km²** (width 20–385 m, mean 163 m).
* MWSP headworks at Ambathan were buried under **10–15 m** of debris (MWSDB, via Kathmandu Post and the Landslide Blog). NSEG/IAEG reports Melamchi Bazaar buried **up to ~10 m**.

**Impacts (conflicting figures)**
| Source (date) | Dead | Missing | Injured | Houses | Other |
|---|---|---|---|---|---|
| NDRRMA initial (via ICIMOD 2021) | 5 | 20 | 6 | 337 fully damaged; 525 families displaced | 13 suspension + 7 motorable bridges; 259 enterprises incl. 1 hydropower plant and 12 trout farms; 3,500 ropani of khet lost |
| **BIPAD official record** (Helambu-2 Chiurikharka, 15 Jun) | **5** | **20** | **6** | **349 destroyed, 38 affected** | — |
| NSEG/IAEG situation report (Timilsina & Dahal) | 10 | 21 | — | >500 households affected | 6 concrete + 10 suspension bridges destroyed |
| Kathmandu Post, 18 Jun | 3 foreigners (2 Chinese, 1 Indian) | 8 MWSP workers | — | — | Ambathan adit concrete bridge and 2 Bailey bridges lost; 26.3 km tunnel intact |
| Chen et al. 2024 | "claimed 25 lives" | — | — | "hundreds of buildings" | — |
| Wikipedia infobox | 21 | 3 | — | 260 households, 600 displaced | Its "18 Nepalese" is cited to a *national* toll article, so it is likely conflated |

MWSP losses were **> NPR 1 billion**, with NPR 300–350 M for clean-up. About 10 km of road from Melamchi Bazaar to the headworks and 2 major concrete bridges were destroyed.

**Sources:** [ICIMOD Melamchi report (PDF)](https://dpnet.org.np/public/uploads/files/HimalDoc2021_MelamchiFloods_Report%202022-03-07%2010-29-32.pdf) · [ICIMOD article](https://www.icimod.org/article/the-melamchi-flood-disaster/) · [Chen et al. 2024, Nat. Geosci.](https://www.nature.com/articles/s41561-024-01596-x) (accepted MS: [NSF PAR](https://par.nsf.gov/servlets/purl/10561389)) · [Kathmandu Post 17 Jun 2021](https://kathmandupost.com/climate-environment/2021/06/17/flood-devastation-in-melamchi-not-only-because-of-rains) · [Kathmandu Post 18 Jun 2021](https://kathmandupost.com/national/2021/06/18/melamchi-project-headworks-buried-in-mud-extent-of-damage-unknow) · [NSEG situation report](https://multibriefs.com/briefs/iaeg/melamchi.pdf) · [Adhikari et al. preprint](https://www.researchsquare.com/article/rs-3764408/v1) · [AGU Landslide Blog](https://blogs.agu.org/landslideblog/2021/08/02/melamchi-satellite/)

---

## 2. Thame GLOF — 16 August 2024 (Solukhumbu, Khumbu Pasanglhamu RM ward 5)

**Source (confirmed).** This was a **cascading GLOF**. The *upper Ngole lake* (4,890 m) sits at the snout of a debris-covered glacier (G086552E27827N). It formed in the late 2000s and grew to 0.11 km². It overtopped its thin moraine-on-bedrock dam; the trigger was probably melt and calving, and a rock-avalanche displacement wave cannot be excluded. Its water dropped 182 m over ~700 m into the *lower Ngole lake / "Ngole Pokhari"* (4,718 m, moraine-dammed), which breached.
* ICIMOD calls the source "**Thyanbo glacial lake**".
* DHM calls the burst lake "lake 2", ICIMOD inventory ID **GL086573E27827N**.
* DHM notes lakes 2, 3 (GL086569E27826N) and 4 (GL086570E27823N) were in ICIMOD's 2015 inventory. Lakes 1 (upper) and 5 were not.

**Coordinates**
| km | Feature | lat, lon | Notes |
|---|---|---|---|
| 0.0 | Upper Ngole lake (lake 1) | 27.8328, 86.5657 | OSM way 286581744 (pre-2024 outline 0.018 km²; 0.11 km² by 2024) |
| 0.9 | **Lower Ngole lake / Thyanbo lake (lake 2)** | **27.8277, 86.5729** | OSM way 286581746 = GL086573E27827N; breach on east (moraine) side ≈27.8285, 86.5751 (approx) |
| — | Lakes 3, 4, 5 (did not fail) | 27.8261, 86.5700 · 27.8235, 86.5711 · 27.8362, 86.5856 | OSM; 0.042, 0.042, 0.01 km² (Gaofen-7, 18 Aug 2024) |
| 4.1 | Thyangbo kharka | 27.8251, 86.6033 | OSM |
| 9.4 | **Thame village** (3,800–3,820 m; main deposition zone) | **27.8319, 86.6505** | OSM; monastery 27.8303, 86.6437 |
| 9.7 | Thame micro-hydro head pond | 27.8299, 86.6534 | OSM reservoir; NHESS gives the plant as 930 kW |
| 10.5 | Thame Khola–Bhote Koshi confluence | 27.8306, 86.6598 | OSM |
| 12.7 | Thamo | 27.8224, 86.6783 | OSM |
| 16.8 | Namche Bazaar (above river) | 27.8042, 86.7098 | OSM |
| 19.0 | Larja Dobhan (Bhote Koshi–Dudh Koshi) | 27.7895, 86.7191 | OSM |
| 20.4 / 21.2 / 26.0 | Jorsalle / Monjo / Phakding | 27.7786, 86.7221 · 27.7719, 86.7230 · 27.7401, 86.7127 | OSM |
| 35.1 / 44.5 | Surke / Jubing | 27.6717, 86.7150 · 27.5976, 86.6862 | OSM |
| ~56 | Motorable bridge damaged "47 km downstream of Thame" | ~27.52, 86.70 | very approx, only the distance is published |
| ~82 below Thame (DHM) | DHM gauge **Dudh Koshi at Rabuwa Bazar** (Khotang) | ~27.27, 86.67 | approx / unverified |

**Timeline, 16 Aug 2024**
| Time | Event | Source |
|---|---|---|
| 10:00 (Planet) / 10:46 | Lakes intact; ICIMOD measured lake ≈0.05 km² at 10:46 | NHESS 2026; ICIMOD press release |
| **~13:00** | GLOF initiation (inferred from modelled 20–25 min travel time) | NHESS 2026 |
| ~13:25 | Estimated breach time | ICIMOD |
| **~13:30** | Flood reaches Thame | DHM; NHESS (local authorities) |
| by 14:30 | DHM SMS alerts to ~142,000 people from Thame to Okhaldhunga | DHM State of Climate 2024 |
| 17:10 → 17:40 | **Rabuwa Bazar gauge**: 4.29 m (≈561 m³/s) at 17:10; 4.94 m (761) at 17:20; 5.40 m (919) at 17:30; **peak 5.53 m (≈966 m³/s) at 17:40**. Stayed below the 6 m warning level. Normal again by 20:20. Extra volume past Rabuwa ≈2.39 Mm³ (water and debris) | DHM report 2081-05-07 (23 Aug 2024) |

Average front speed from Thame (~13:30) to Rabuwa (~17:10), about 82–90 km, is **≈6–7 m/s**.

**Flow characteristics** (NHESS 26:4131, 2026, r.avaflow Scenario A)
* **Upper lake:** outflow peaked at 586 m³/s within 699 s, surge velocity 15 m/s. It drained ~4.1 × 10⁵ m³; lake level fell 4.6 m and the dam breached ~21 m.
* **Lower lake:** drained ~3.6 × 10⁵ m³; lake level fell 12 m and the moraine was incised ~30 m.
* **Combined volume ≈7.7 × 10⁵ m³.** DHM's estimate was lake 2 at 0.38 MCM with 88% (≈0.34 MCM) drained, and area 0.045 → 0.011 km².
* **Below the lower lake (O1):** discharge exceeded 800 m³/s for more than 2,000 s, with a liquid peak of 912 m³/s at 800 s.
* **At Thame (O2):** the wave arrived at **1,300 s (~22 min)**. Peak was 574 m³/s (≈548 m³/s after storage), flow depth up to 4 m, velocity ~10 m/s.
* Bank erosion extended up to 50 km downstream. Deep-seated landslides are still active in Thame.

**Impacts**
| Source | Dead | Injured | Displaced | Buildings | Other |
|---|---|---|---|---|---|
| ICIMOD press release | 0 | — | — | **14 destroyed: 7 homes, 5 hotels, 1 school, 1 health post** | — |
| Kathmandu Post 18 Aug | 0 | — | 135 | 20 houses, 1 school, 1 clinic | — |
| BIPAD | 0 | 0 | 14 + 3 families | 7 houses destroyed | — |
| NHESS 2026 (KPL RM loss report) | 0 | 1 | 135 (incl. ~40 children) | houses and lodges of 45 owners (NPR 560.9 M); 1 primary school (NPR 60.05 M) | 98,920 m² of land (NPR 204.8 M); 1.2 km of trails; micro-hydro intake–desander and pipes damaged; 1 motorable bridge 47 km downstream; **total USD 6.18 M** |

Republica initially reported one person missing; later sources show none.

**Sources:** [NHESS 26:4131 (2026)](https://nhess.copernicus.org/articles/26/4131/2026/) · [DHM Thame report (Nepali, PDF)](https://dhm.gov.np/uploads/dhm/downloads/Thame_Flood_Report_23_August_2024.pdf) · [DHM State of Climate 2024](https://dhm.gov.np/uploads/dhm/climateService/1766473731_86708e798463fe298b78.pdf) · [ICIMOD press release](https://www.icimod.org/press-release/glof-from-thyanbo-glacial-lake-sweeps-away-thame-village/) · [ICIMOD report (Maharjan et al. 2025)](https://lib.icimod.org/records/8g9ze-1r153) · [Kathmandu Post 18 Aug 2024](https://kathmandupost.com/climate-environment/2024/08/18/aerial-inspection-ties-thame-flood-to-glacial-lake-outburst)

---

## 3. Late-September 2024 floods and landslides (26–29 Sep; peak night of 27–28 Sep)

**Meteorology (DHM situational report, 8 Oct 2024).** A deep low / cyclonic circulation over central India, backed by a 500 hPa westerly trough, drew moisture from the Arabian Sea and the Bay of Bengal.
* Rain lasted **>60 h**, from 26 Sep 08:45 to 29 Sep 08:45.
* **Daman had 517.0 mm in 3 days** and 410.0 mm in 24 h (national maximum).
* 183 stations had more than 50 mm; 37 had more than 300 mm; 1 had more than 500 mm.
* **25 stations in 14 districts set new 24 h records on 28 Sep** (to 08:45). Eleven of them are in the Kathmandu Valley, and 16 of the 25 lie within ~1,000 km².

**Record 24 h rainfall to 08:45 on 28 Sep 2024** (DHM table; the later State of Climate 2024 revises a few values, shown in brackets)
| Station (district) | mm | Previous record (date) | Station lat, lon (DHM, 3 dp) |
|---|---|---|---|
| Daman (Makwanpur) | **410.0** | 373.2 (1993-07-20) | 27.604, 85.090 |
| Khopasi-Panauti (Kavre) | **331.6** | 276.9 (2015-09-03) | ~27.567, 85.534 (approx; Khopasi Bazar, OSM) |
| Chapagaun (Lalitpur) | 323.5 | 200.5 (2002-07-23) | ~27.596, 85.323 (approx) |
| Godavari (Lalitpur) | 311.6 [290.0] | 225.2 (2002) | 27.593, 85.380 |
| Khokana (Lalitpur) | 297.3 | 249.2 (2002) | 27.644, 85.300 |
| Khumaltar (Lalitpur) | 294.4 [324.5] | 136.0 (2022-08-10) | 27.652, 85.330 |
| Govindabasti (Chitwan) | 264.0 | 196.0 | — |
| Tikathali (Lalitpur) | 264.0 [248.5] | 207.0 (2002) | ~27.66, 85.36 (approx) |
| Gajuri (Dhading) | 261.2 | 131.3 (2021) | — |
| Chandragadhi Airport (Jhapa) | 256.0 | 188.2 (2022) | — |
| Khairini Tar (Tanahun) | 252.3 | 241.9 (1983) | 28.027, 84.090 |
| Baldyanggadi (Palpa) | 252.0 | 90.4 (2012) | — |
| **Kathmandu Airport** | **239.7** | 177.0 (2002-07-23) | 27.704, 85.360 |
| Panchkhal (Kavre) | 232.5 | 145.0 (1999) | 27.645, 85.620 |
| Dhulikhel (Kavre) | 224.6 | 220.0 (2002) | 27.616, 85.570 |
| Sakhar (Tanahun) | 214.0 | 173.2 (2020) | — |
| Panipokhari (KTM) | 206.6 | 198.0 (1971) | — |
| Nagarjun (KTM) | 205.4 | 147.5 (2014) | — |
| Sandhikharka (Arghakhanchi) | 196.6 | 166.0 (2021) | — |
| Nangkhel (Bhaktapur) | 194.5 | 191.5 (2002) | — |
| Baunepati (Sindhupalchok) | 190.6 | 137.5 (1978) | 27.792, 85.573 |
| Buddhanilkantha / Jitpurphedi (KTM) | 178.3 / 178.3 | 159.0 / 128.2 | — |
| Phidim (Panchthar) | 172.0 | 148.9 (2021) | 27.144, 87.770 |
| Kakani (Nuwakot) | 169.2 | 161.0 (1972) | 27.814, 85.270 |

**River gauges above their historic maximum on 27–28 Sep** (DHM Table 4)
| Gauge | Observed (m) | Previous record (m, date) |
|---|---|---|
| Bagmati at Khokana (550.05) | **6.16** | 6.0 (2002-07-22) |
| Trishuli at Kali Khola (449.91) | **14.97** | 13.1 (1999) |
| Narayani at Devghat (450) | **13.62** | 10.1 (1974) |
| Sunkoshi at Hampachuwar (681) | **14.5** | 14.3 (2019) |
| Saptakoshi at Chatara (695) | **11.83** | 11.5 (1980) |
| Kali Gandaki at Kota Gaon (420) | 10.27 (below record) | 10.4 |
| Bagmati at Karmaiya (589) | 10.86 (below record) | 20.0 |

Gauge locations: Khokana ≈27.64, 85.29–85.30; Kali Khola 27.833, 84.546; Devghat 27.71, 84.43 (DHM, 2 dp); Chatara ≈26.87, 87.16 (approx).

**Official totals (conflicting by date)**
| As of | Dead | Missing | Injured | Source |
|---|---|---|---|---|
| 30 Sep | 188 | 41 | 45 (1,327 houses damaged) | MoHA via Onlinekhabar |
| 1 Oct | 217 | 28 | — | Onlinekhabar / Guardian |
| 2 Oct | **228** | 25 | 158 (13,071 rescued) | MoHA spokesperson |
| 8 Oct | 246 | 18 | 186 | BIPAD (via Copernicus/ReliefWeb) |
| 16 Oct | **250** (76 F, 114 M, 60 children) | **18** | 178 | NDRRMA figures as relayed by Humanitarian Coalition / ReliefWeb summaries (not seen first-hand) |
| BIPAD query, incidents 26–30 Sep (my pull) | **245** | **18** | **179** | 1,943 houses destroyed, 6,139 affected; landslides 206 deaths, floods 33, heavy rain 6; deaths on 28 Sep = 223 |

Losses were an estimated **NPR 17 bn+** (Kathmandu Post). Also reported: ~1,100 MW of generation halted and 11 hydropower stations damaged.

**Per-district deaths** (BIPAD, incidents dated 26–30 Sep 2024)
| District | Dead | Missing | Injured | Houses destroyed |
|---|---|---|---|---|
| **Kavrepalanchok** | **79** | 6 | 77 | 1,667 |
| **Lalitpur** | **45** | 5 | 16 | 3 |
| **Dhading** | **39** | 0 | 10 | 1 |
| Kathmandu | 18 | 1 | 18 | 3 |
| Sindhupalchok | 10 | 2 | 17 | 4 |
| Panchthar | 8 | 3 | 6 | 65 |
| Makwanpur | 7 | 0 | 3 | 0 |
| Dolakha | 7 | 0 | 5 | 2 |
| Solukhumbu | 5 | 0 | 1 | 4 |
| Bhaktapur | 5 | 0 | 3 | 1 |
| Dhankuta, Sarlahi | 3 each | | | |
| Jhapa, Rupandehi, Sindhuli, Rautahat, Mahottari | 2 each | | | |
| Ilam, Okhaldhunga, Saptari, Udayapur, Siraha, Ramechhap | 1 each | | | |
| Morang | 0 | 1 | | |

Kathmandu Valley (Kathmandu + Lalitpur + Bhaktapur) totals 68 dead per BIPAD. Media figures were 37 (Kathmandu city) or 56.

**Key incidents and sites**
| Site | Coordinates | Deaths | Notes |
|---|---|---|---|
| **Jhyaple Khola landslide**, Prithvi Hwy approach "near Nagdhunga" (Nagdhunga–Naubise road, Dhunibesi Mun., Dhading) | **approx 27.712, 85.18 (±3 km)**; Nagdhunga pass 27.7066, 85.2057; Naubise 27.7171, 85.1517 | **35** (BIPAD: 26 M, 9 F) | ≥3 buses buried (one Gorkha → Kathmandu); 14 bodies from 2 buses on 28 Sep and 13 from a third on 29 Sep. Night of 27–28 Sep; exact time and site not verified |
| **Roshi Khola** flash flood and landslides (Kavre): Roshi Bazar / Kalati Bhumidanda (Panauti-12), Chalal Ganeshthan, Salandubagar, Partikharka (Bethanchowk-4), Chaukidanda (Namobuddha), Katunje (Roshi RM, BP Hwy) | Roshi Bazar 27.5711, 85.4888; Panauti 27.5852, 85.5193; Khopasi 27.5667, 85.5338; Katunje 27.5373, 85.6684; Roshi–Sunkoshi confluence 27.4517, 85.8199 | BIPAD Namobuddha-7: **49 dead, 2 missing, 67 injured, 1,495 houses destroyed**; Panauti-11/12: 10 | BIPAD lumps many villages under Namobuddha-7 (Dariyal Pakha, Bohore, Singhe 497 houses, Shyampati 489 houses, Darimbot, Chalal Ganesh…) |
| **Lalitpur rural landslides and floods** (Gotikhel, Thosne, Chhotedanda, Tikabhairab, Sisneri/Lubhu Khola, Dalchowki…) | Gotikhel 27.4930, 85.3907 (OSM) | BIPAD "Konjyosom-4": 37 dead, 3 missing | BIPAD appears to lump several rural municipalities under one ward |
| **Nakkhu Khola** flood (Bagdol, Nakkhu bridge, Chobhar gorge) | Nakhu lower reach 27.6478, 85.3130 → Bagmati at Chobhar 27.6592, 85.2938 | — | water rising Friday evening; peak Saturday morning 28 Sep |
| **Balkhu** (KMC-14), Bagmati | 27.6849, 85.2982 | 1 missing, 4 swept | **flood at ~03:00 on 28 Sep**; ~400 families |
| Kageshwori Manahora-9 landslides (Makkhu Besi, Masine, Talku, Ikshyangunarayan temple) | ward centroid 27.6991, 85.3786 | 14 | — |
| ANFA academy landslide, Tekar (Makwanpurgadhi-5) | ward centroid 27.4427, 85.0880 | 6 | young footballers |
| Upper Tamakoshi / Lamabagar (Bigu-1, Dolakha) | ward centroid 27.9857, 86.1824 | 4 + missing | — |
| Jugal-2 (Sindhupalchok) | ward centroid 27.9071, 85.7557 | 10, 2 missing | — |
| Phidim-11 (Panchthar) | ward centroid 27.1477, 87.7850 | 8, 3 missing | — |

**Sources:** [DHM situational report 27–29 Sep 2024 (PDF)](https://dhm.gov.np/uploads/dhm/downloads/Situational_Report_on_Extreme_Precipitation_and_Flooding_Event_of_27-29_September_2024.pdf) · [DHM State of Climate 2024](https://dhm.gov.np/uploads/dhm/climateService/1766473731_86708e798463fe298b78.pdf) · [BIPAD incident API](https://bipadportal.gov.np/api/v1/incident/) · [Wikipedia: 2024 Nepal floods](https://en.wikipedia.org/wiki/2024_Nepal_floods) · [Onlinekhabar: 188 dead](https://english.onlinekhabar.com/death-toll-reaches-188-in-floods-and-landslides-41-still-missing.html) · [Onlinekhabar: 228 dead](https://english.onlinekhabar.com/228-die-in-recent-natural-disaster-home-ministry.html) · [Onlinekhabar: Jhyaple Khola](https://english.onlinekhabar.com/jhyaple-khola-update-death-toll-reaches-13.html) · [Onlinekhabar: Balkhu](https://english.onlinekhabar.com/balkhu-community-reels-from-flood.html) · [Onlinekhabar: Roshi](https://english.onlinekhabar.com/home-minister-lekhak-visits-disaster-hit-bhumidanda-bethanchowk.html) · [Copernicus GloFAS note](https://global-flood.emergency.copernicus.eu/news/181-floods-and-landslides-in-nepal-late-september-2024/)

---

## 4. Rasuwa (Lende/Lhende) GLOF — 8 July 2025

**Source.** A **supraglacial lake** drained on the debris-covered tongue of the **Purepu Glacier** (普热普冰川), in the upper Purepu Tsangpo, Gyirong County, Tibet. It sits at ~5,100–5,150 m and ~31–36 km upstream of the Rasuwagadhi bridge.
* The lake began as ponds (Dec 2023; again from late Dec 2024 and Mar 2025) and grew fast in June 2025.
* Area estimates: 0.08 km² (9 May) → **0.69 km² (6 Jul)** (Zhang et al. 2026); 0.525 km² (28 Jun, ICIMOD) → **0.75 km² (7 Jul)** → 0.6 km² (8 Jul, DHM); 0.717 ± 0.164 km² (Xu et al. 2026).
* Volume loss estimates **conflict**: **3.55 × 10⁶ m³** (Xu et al., DEM-constrained, "incomplete drainage"); ≈7.2 × 10⁶ m³ released over ~35 h (another 2026 study); ~45% area loss (Zhang et al.).
* A smaller drainage of the same system on 12–15 July 2023 travelled only ~10 km.
* Floodwater drained partly through supraglacial and englacial channels. It **amplified ~6× by erosion and entrainment in V-shaped gorges, to ~8,400 m³/s**, and became a debris flow (Zhang et al. 2026, *Natural Hazards*).
* No significant rain was recorded before the event.

**Timeline, 8 Jul 2025**
| Time | Event | Source |
|---|---|---|
| ≈01:45–02:15 (inferred) | Lake breach. A Chinese paper gives "~04:00" (probably Beijing time = 01:45 NPT); the seismic signal was visible ~1 h before arrival at the border | ScienceDirect abstract; Landslide Blog (K. Cook seismic post) |
| **~03:00–03:10** | Flood at Rasuwagadhi–Timure (Timure station 03:10); river rose ~3.5 m near Timure | Nepali Times; Farsight Nepal |
| by ~05:00 | Reached Betrawati | Nepali Times |
| during 8 Jul | Debris and flood reached Mugling; bodies later recovered in Rasuwa, Nuwakot, Dhading and Chitwan (NDRRMA map shows them down the Narayani to the India border) | Nepali Times; NDRRMA sitrep #1 |

**Coordinates and chainage** (km from the lake, approx origin; OSM plus Paudel centreline)
| km | Feature | lat, lon | Precision |
|---|---|---|---|
| 0 | Purepu supraglacial lake | **28.375, 85.625** | **approx ±2 km** (glacier outline OSM rel. 5142288: 28.357–28.448 N, 85.609–85.673 E) |
| 1.5 | Purepu glacier terminus / Purepu Tsangpo head | 28.3658, 85.6135 | OSM |
| 10.8 | Purepu–Chusumdo Tsangpo confluence | 28.3125, 85.5541 | OSM |
| 18.5 | Chhochen Khola–Chusumdo confluence | 28.3321, 85.4856 | OSM (the 2026 barrier-lake site) |
| 23.3 | Chusumdo–Lende Khola (Donglin Tsangpo) confluence | 28.3358, 85.4401 | OSM |
| **33.3** | **Rasuwagadhi Nepal–China Friendship (Miteri/Resuo) Bridge — destroyed** | **28.2787, 85.3781** | OSM; Gyirong Port inspection building (China) 28.2795, 85.3777; Rasuwa Fort 28.2778, 85.3778 |
| 33.9 | Rasuwagadhi HEP (111 MW) headworks dam | 28.2736, 85.3771 | OSM |
| 34.2 | DHM gauge Bhotekoshi at Rasuwagadhi (4913) | 28.2713, 85.3776 | DHM |
| 36.7 | **Timure** (dry port / customs, EV park) | 28.2529, 85.3667 | OSM |
| 47.8 | Syaphrubesi (DHM gauge 191 at 28.1707, 85.3426) | 28.1628, 85.3378 | 4 dp |
| 48.7 | Chilime HEP powerhouse (22.1 MW) | 28.1574, 85.3319 | OSM (headworks on the Chilime Khola 28.1806, 85.3076) |
| 71.2 | Upper Trishuli-3A powerhouse (60 MW) | 28.0270, 85.1848 | OSM |
| 74.9 | Upper Trishuli-3B powerhouse (37 MW, under construction) | 27.9949, 85.1831 | OSM |
| 77.6 | Betrawati | 27.9731, 85.1860 | 4 dp |
| 85.7 | Trishuli HEP (24 MW) / Trishuli Bazar | 27.9215, 85.1460 | OSM |
| 90.6 | Devighat HEP (15 MW) | 27.8890, 85.1350 | OSM |
| 174 | Mugling | 27.8562, 84.5610 | 4 dp |

**Impacts**
* **NDRRMA Situation Report #1 (as of 10 Jul 2025):** 10 bodies recovered (Rasuwa, Nuwakot, Dhading, Chitwan), **19 missing**, 1 injured. 57 people rescued, 31 of them by helicopter; 1,873 security personnel deployed. Lost vehicles: 24 container trucks, 35 electric vehicles, 6 Sino trucks. Also damaged: **2 bridges (1 collapsed, the Miteri Pul; 1 partial)**, **16 km of road** (Syaphrubesi–Rasuwagadhi), **3 hydropower plants** and **1 dry port**.
* **Early counts (Kathmandu Post, 8 Jul):** 18 missing (3 police, 9 civilians, 6 Chinese nationals); 9 loaded containers swept from the customs yard. Nepali Times: 9 dead, 20 missing (12 Nepali, 6 Chinese); >100 cargo trucks and EVs swept away; ~150 rescued by helicopter.
* **Later counts:** Tibet, 11 missing (Landslide Blog). ICIMOD (2026): "thirty killed or missing". A ScienceDirect paper: "at least 18 fatalities", direct losses **> USD 53 M**.
* **Hydropower (NEA):** structures of **11 projects (405 MW) and a 25 MW solar plant** were affected and ~200–240 MW of generation halted.
  * Operating plants: Rasuwagadhi 111 MW (worst hit), Chilime 22 MW, Trishuli-3A 60 MW, Trishuli 25.25 MW, Devighat 14 MW.
  * Under construction: UT-3B 37 MW, UT-1 216 MW, Super Trishuli 100 MW.
  * Also affected: Sanjen, Upper Sanjen, Langtang, Mailung and Upper Mailung, plus the 220 kV substation.
* Goods and vehicles lost at Timure were worth more than NPR 1 bn.

**Sources:** [NDRRMA sitrep #1 via DPNet](https://www.dpnet.org.np/resource-detail/2197) · [Kathmandu Post, 8 Jul 2025](https://kathmandupost.com/national/2025/07/08/18-missing-after-flood-hits-rasuwagadhi-border-point) · [Nepali Times](https://nepalitimes.com/rasuwa-flood-likely-a-glof) · [Zhang et al. 2026, *Nat. Hazards*](https://link.springer.com/article/10.1007/s11069-026-08081-1) · [Xu et al., EGUsphere 2026-4065](https://egusphere.copernicus.org/preprints/2026/egusphere-2026-4065/egusphere-2026-4065.pdf) · [Landslide Blog](https://eos.org/thelandslideblog/rasuwagadhi-1) · [Khabarhub (hydropower)](https://english.khabarhub.com/2025/08/484493/) · [Farsight Nepal](https://farsightnepal.com/news/a-hidden-glacier-lake-caused-the-deadly-bhotekoshi-flood-scientists-say/)

---

## 5. Early-October 2025 Koshi Province disaster — Ilam (3–5 Oct 2025)

Late-season heavy rain fell on Friday–Saturday, 3–4 Oct 2025, after a DHM special alert on 2 Oct. On 5 Oct the rain risk shifted from the Kathmandu Valley to Koshi Province.
* **Nepal Police (5 Oct 2025):** **52 dead nationally**: **Ilam 37**, Panchthar 8, Rautahat 3, Udayapur 2, Khotang 2.
* **BIPAD (incidents dated 3–6 Oct, my pull):** 41 dead, 5 missing, 40 injured nationally. **Ilam: 28 dead, 1 missing, 19 injured, 332 houses destroyed, 828 affected.** Deaths were 29 on 4 Oct and 12 on 5 Oct; landslides caused 32 of them.
* Also on 4 Oct: a flood at Baring Kholsa, Gosaikunda-4 (Rasuwa) left 4 missing.

**Ilam sites** (village names from Onlinekhabar 5 Oct; coordinates are BIPAD ward centroids, so ward-level only)
| Site | Deaths | Coordinates |
|---|---|---|
| Ilam Municipality-6, Ghos (one family buried) | 6 | ward not in BIPAD pull; Ilam-5 centroid 26.9490, 87.9266 (BIPAD: 4 dead) |
| Sandakpur RM-1 | 6 (6 injured, 30 houses) | 27.0433, 87.9025 |
| Suryodaya-1, Manebhanjyang (house swept) | 5 (Onlinekhabar) / 3 (BIPAD) | 26.9874, 88.1201 (OSM town) |
| Maijogmai-3 | 4 | 26.9264, 88.0125 |
| Deumai-5, Ghuseni | 2 dead + 3 missing (Onlinekhabar) / 4 (BIPAD) | 26.9203, 87.7984 |
| Mangsebung-5 / -1 Patigau | 3 / 2 | 26.9027, 87.7420 |
| Phakphokthum-3, Ratomate | 1 | — |

**Sources:** [Onlinekhabar: death toll 52](https://english.onlinekhabar.com/death-toll-52-across-nepal.html) · [Onlinekhabar: 17 killed in Ilam](https://english.onlinekhabar.com/17-killed-in-landslides-in-ilam.html) · [Onlinekhabar: risk shifts to Koshi](https://english.onlinekhabar.com/heavy-rain-risk-eases-in-kathmandu-valley-shifts-to-koshi-province.html) · [BIPAD incident API](https://bipadportal.gov.np/api/v1/incident/)

---

## 6. Simaltal landslide — 12 July 2024 (Narayanghat–Mugling road, Chitwan)

*Compiled by a sub-agent; spot-checked against OSM and BIPAD.*

**Time:** about **03:30 NPT, Friday 12 Jul 2024** (21:45 UTC on 11 Jul).

**Place:** **Simaltal, Bharatpur Metropolitan City ward 29**, not Ichchhakamana, which begins about 3.5 km upstream at Jalbire. It is on NH44, about 22–23 km from Narayangadh. The opposite bank is Anbukhaireni-5, Tanahun.

**Cause:** the government task force (KP, 12 Aug 2024) blamed debris and gravel from building a rural road above the highway, together with blocked culverts. No volume was published.

**Buses:**
* **Ganapati Deluxe**, Kathmandu → Gaur, plate Ba.Pra.03-011 Kha 2495.
* **Angel Deluxe**, Birgunj → Kathmandu, plate 03-006 Kha 1516.
* Passengers: **65** by the District Administration Office's revised count, or **62** per the task force (36 + 26). **3 survivors**, all from the Ganapati.

**Toll (Republica, 13 Jan 2026):** **24 bodies recovered** (19 identified), **43 still missing**. Other counts:
* BIPAD: 24 dead, 35 missing, 3 injured.
* Wikipedia: 19 dead, 40 missing.

**Wreck:** Ganapati parts were found on **11 Jan 2026**, buried in sand at Dwandrang Besi, Anbukhaireni-5, about 200 m downstream on the Tanahun bank (≈27.8214, 84.4816). A skeleton was found inside on 26 Jan. No recovery of the Angel Deluxe has been reported.

**Where the bodies turned up** (river-km on the OSM Trishuli/Narayani line from Simaltal)
| When | Where | lat, lon | River-km |
|---|---|---|---|
| 12 Jul ~03:30 | Simaltal site (OSM node on NH44); bus entry point in the river 27.8213, 84.4833 | 27.8203, 84.4832 | 0 |
| same night | "17 kilo" boulder strike: driver of a Butwal → Kathmandu bus killed | ~27.8143, 84.4375 (approx) | — |
| 29 Jul onward | Second-phase search reach, Ghumaune → Bhorle | 27.8233, 84.4670 → 27.8126, 84.4364 | 2–6 |
| — | Devghat confluence | 27.7413, 84.4220 | 22.0 |
| 14 Jul | Gaindakot: 1 body | 27.7057, 84.3913 | ~29–33 |
| 13 Jul 08:30 | Golaghat, Bharatpur-28: first body (Rishi Pal Shah, Indian) | 27.5671, 84.1623 | ~63 |
| 14 Jul | Tribeni / Gandak canal: 2 bodies; Susta: 1 body | 27.4529, 83.9321 | ~112 |
| 15 Jul | Near the Gandak Barrage: Ganapati driver and helper | 27.4390, 83.9071 | ~115 |

**Pins to avoid:** the Eos Landslide Blog pin (27.7797, 84.4402) is marked approximate and sits ~6 km SW of the site. BIPAD's point is only the ward-29 centroid.

**Other incidents in the same storm:** Kaski, 11–12 Jul 2024, 11 dead (Talkot, Pokhara-19: 7; Chainpur, Pokhara-32: 3).

**Sources:** [KP 12 Jul 2024](https://kathmandupost.com/province-no-3/2024/07/12/landslide-sweeps-away-two-buses-kills-one-on-narayanghat-mugling-road-section) · [KP 12 Aug 2024 (task force)](https://kathmandupost.com/province-no-3/2024/08/12/simaltal-incident-search-for-missing-passengers-continues-a-month-on) · [KP 13 Jan 2026 (bus found)](https://kathmandupost.com/national/2026/01/13/passenger-bus-missing-in-chitwan-landslide-found-after-18-months) · [Republica (Ganapati confirmed)](https://myrepublica.nagariknetwork.com/news/bus-recovered-in-trishuli-confirmed-as-ganapati-deluxe-swept-away-in-simalt-31-87.html) · [Wikipedia: Madan Ashrit Highway disaster](https://en.wikipedia.org/wiki/Madan_Ashrit_Highway_disaster) · [Eos Landslide Blog](https://eos.org/thelandslideblog/simaltal-1)

---

## 7a. The 26 August 2026 Rasuwa–Gyirong catastrophe (Bhote Koshi–Trishuli–Narayani)

This is the dominant 2026 event, and **one of Nepal's deadliest disasters since 2015**.

**Mechanism.** At **08:37:10 NPT** (02:52:10 UTC), a slab of rock and glacier ice detached from the **north face of Langtang Lirung** (7,227 m) in Rasuwa district, Nepal.
* USGS catalogued the signal as us7000tbwb, **Ms 5.2, type "landslide"**. GFZ gave Mw 5.7 with a landslide signature. Nepal's DMG first logged it as an "M4.4 earthquake".
* The mass fell ~1,200 m. Reported detachment elevations are 4,880–5,400 m (image and seismic estimates 3,819–5,073 m). Shugar estimates a ~0.2 km² slab.
* It became a debris flow in the **Chhochen Khola → Chusumdo/Lende Khola** system, crossed into Tibet, and re-entered Nepal at Rasuwagadhi.
* **No significant rain**, so rainfall-based warnings did not trigger.
* A **second failure** followed at **11:45:35** (M4.2).
* Radar showed up to 30 cm of slope movement in the 3–4 weeks before failure.
* NDRRMA Sitrep #01 (1 Sep 2026) describes an "estimated 1 km² section of rock-glacier material" that detached "approximately 20 km upstream of Rasuwagadhi" and entrained proglacial sediment. It says the flood exceeded normal seasonal floods by "an order of magnitude or more", and that several temporary lakes formed along the path.
* Disputed alternative (IRDR Young Scientists): the failure happened on the afternoon of 25 Aug and the 08:37 signal was a dam burst after an 18–19 h impoundment. This is unresolved.

**Source estimates:** USGS 28.271, 85.515 · Planet imagery 28.2765, 85.5194 · glaciological 28.2853, 85.5252 · GFZ 28.30, 85.50. All lie in Nepal, 3.3–6.6 km south of the border. The channel from the scar to Rasuwagadhi is **20.1–24.0 km** (independent trace 22.3 km).

**Barrier lakes in Tibet**
* **Main lake** at the Chhochen Khola–Purepu/Chusumdo confluence, ≈**28.3321, 85.4856** (~2,930 m): about 2 Mm³, with 3 Mm³ of inflow forecast. It overflowed on 28 Aug (~15:35 NPT; 17:50 BJT), causing a ~3 h rescue pause and a ~0.6 m rise downstream. It drained on 29–30 Aug.
* **Second lake** candidate at ≈28.294, 85.511 (~1.4–20 ha), assessed as low risk.

**Arrival times** (DHM river-watch 10-min stage series, as corrected by Acharya & Paudel 2026; km = Paudel centreline from the scar)
| km | Place / gauge | lat, lon | Front arrival (NPT) | Notes |
|---|---|---|---|---|
| 0 | Source (USGS) | 28.271, 85.515 | 08:37:10 | — |
| 22.3 | **Rasuwagadhi / Gyirong Port** (gauge 4913 at 28.2713, 85.3776) | 28.2778, 85.3778 | **08:40–08:50**; CCTV at the port 08:44 (10:59 BJT) | ≈20 km in ~7 min (~180–190 km/h); gauge died at 1.62 m (27% of warning) |
| 25.6 | **Timure** (customs, dry port) | 28.2528, 85.3667 | ~08:45 | least lead time; 15 customs staff lost contact |
| 36.7 | **Syabrubesi** (gauge 191 at 28.1707, 85.3426) | 28.1628, 85.3378 | **08:50–09:00** | gauge destroyed |
| — | DHM Flood Forecasting Division informed | — | 09:00 (or 09:05) | — |
| — | Mass SMS: 679,295 messages (Rasuwa, Nuwakot, Dhading, Chitwan) | — | 09:15–09:16 | ~38.8 min after t₀ |
| 66.4 | **Betrawati** (gauge 52) | 27.9731, 85.1860 | **09:20–09:30** | Betrawati staff also alerted DHM at 09:00 |
| ~75 | Trishuli Bazar / Bidur (Trishuli HEP 27.9215, 85.1460) | 27.922, 85.150 | ~09:30–09:45 (interpolated) | Tribhuvan Trishuli school (~900 pupils) evacuated ~10 min before the flood arrived; the Trishuli bridge was swept away |
| 100.1 | **Galchhi** (gauge 5705 at 27.8023, 85.0031) | 27.7974, 85.0005 | **10:20–10:30**; warning 10:40; **peak 10:50** | rose **+8.8 m** (~9 m in 30 min) |
| 123.9 | **Malekhu / Phurke** (gauge 5611) | 27.8137, 84.8272 | warning 11:26; danger and gauge + bridge swept 11:43; bazaar hit **11:50** | — |
| 163.1 | **Mugling** | 27.8562, 84.5610 | passed by **13:00** | — |
| ~167–171 | Kali Khola gauge 4781 | 27.833, 84.546 | 13:10–13:20; danger 14:14–14:20; peak 12.35 m | — |
| 196.2 | **Devghat** (Narayani gauge 265) | 27.7429, 84.4231 | 14:30–14:40 (sitrep: 15:20); **peak 6.57 m, 5,850 m³/s at 16:00**; ~4 m by 18:30 | excess volume ≈20 Mm³ (2–3 yr return period at Devghat) |

Flood-front speed: 25–49 m/s in the upper gorge, 4–6 m/s in the Trishuli valley. Near the source the debris ran ~400 m up the valley walls, and up to ~800 m discolouration was seen ~7 km from the origin. More than 1.5 m of silt was left in the main disaster zone.

**Hydropower and infrastructure**
* NEA: up to 14 projects damaged, **~748 MW combined**, taking **430–431 MW (>12% of national capacity)** off the grid; 470 MW of projects under construction were damaged; five solar plants (24 MW).
* Named damaged plants: Rasuwagadhi, Chilime, Trishuli 3A, Trishuli 3B Hub 220 kV substation, Trishuli, Devighat.
* **Upper Trishuli-1 (216 MW)**: ≥576 workers missing, ~300 in a tunnel. **Upper Trishuli-3A**: tunnel rescue with a controlled blast on 31 Aug; survivors found 4–5 Sep. Nepal Army estimate (7 Sep): 121 people trapped in tunnels. 933 hydropower workers were added to the missing list on 28 Aug.
* Roads and bridges: the entire 42 km Betrawati–Rasuwagadhi road was cut at many points, plus 16 km toward the border. 68 suspension and 41 motorable bridges were damaged, along with 69 km of road. The Trishuli Bazar bridge and the Phurke bridge were swept away.
* Buildings and assets: **7,570 houses destroyed**, 18+ schools, 48 government buildings (including the Gosaikunda and Uttargaya RM offices), 9–17 bank branches. More than 300 queued vehicles and ~1,000 EVs, and over 400 containers, were swept from the customs area.
* Losses: preliminary **NPR 400 bn+**; the RDNA rebuild estimate is **NPR 723.3 bn**; the energy-sector rebuild is NPR 390.6 bn.

**Casualties** (still being revised)
| As of | Nepal dead | Nepal missing | Source |
|---|---|---|---|
| 27 Aug morning | 165 | 826 | Nepal Police bulletin |
| 28 Aug | 579 | 1,924 | NDRRMA via AP |
| 29 Aug | 616–626 | 1,924–2,426 | NDRRMA. Bodies by district: **Chitwan 233, Nawalparasi-E 158, Nuwakot 51, Gorkha 48, Nawalparasi-W 47, Dhading 45, Tanahu 31, Rasuwa 13** |
| 31 Aug | 903 | 4,247 | NDRRMA |
| 1 Sep | 987 | 3,916 | NDRRMA Sitrep #01 |
| 8 Sep | 1,357 | 5,326 | Acharya & Paudel data package |
| 12 Sep 18:00 | 1,386 | 5,130 | KP |
| 18 Sep | 1,410 | 6,145 | KP |
| 21 Sep | 1,451 (585 men, 336 women, 530 partial remains) | 5,745 (636 foreigners from 35 countries) | NDRRMA via Nepalnews / Wikipedia |
| **22 Sep 19:00 (latest NDRRMA)** | **1,451** | **5,705** (13,795 rescued) | NDRRMA via Pardafas (23 Sep). *Earlier versions of this dossier dated this 23 Sep.* |
| 23 Sep 05:00 | 1,452 (1,450 bodies + 2 died in treatment) | 4,718 (police register) | Nepal Police via Nepalnews — a separate register from NDRRMA's |

**Bodies by recovery district, 21 Sep (SitRep #20 p. 4):** Chitwan 367, **Rasuwa 236**, Nawalparasi-E 232, Nawalparasi-W 222, **Nuwakot 203**, Gorkha 79, Dhading 72, Tanahu 38, Kathmandu 2 (died in treatment). *Correction:* earlier versions swapped Rasuwa and Nuwakot, following SitRep #20's p. 3 chart; the p. 4 table, the day-by-day series (Rasuwa 199 → 236 after 31 bodies came out of the Upper Trishuli-1 tunnel) and the police figures agree on Rasuwa 236. These are where bodies were *recovered*, not where people died.

**Missing by registration district, 21 Sep:** Rasuwa 1,677 local + 1,836 non-local; Nuwakot 657 + 1,090.

**Buildings destroyed** (Copernicus EMSR927): Syabrubesi 323, Timure 372, Bidur 2,479, Phosretar 397.

**Bridges** (HOT survey, now 58 named bridges): 39 washed out, 4 damaged, 15 intact — 23 of 27 washed out in Rasuwa, 11 of 20 in Nuwakot, 5 of 8 in Dhading, none of 3 in Gorkha. The government RDNA counts 33 road bridges washed out and 4 damaged (3,032 m), 68 trail-bridge spans, and 69 km of road (55 km Betrawati–Rasuwagadhi destroyed).

**Reference points not in the table above:** Tiru (Uttargaya-1; >500 unaccounted for; first reached by helicopter on 9 Sep) approx 28.0907, 85.2096. Haku Besi 28.1165, 85.2791 (km 44.5). Bidur 27.8953, 85.1465 (km 77.7). Phosretar 27.8320, 85.0195 (km 95.6).

**Knock-on damage:** the Krishnabhir section of the Prithvi Highway (Benighat Rorang, Dhading, between Malekhu and Charaudi at 27.8029, 84.7499) lost 70 m of road to Trishuli erosion. It was closed from 30 Aug to 17 Sep.

NDRRMA Sitrep #01 (1 Sep) also reports:
* 5 districts affected: Rasuwa and Nuwakot severe; Dhading, Gorkha and Chitwan moderate.
* ~1.6 M people affected.
* 3,702 households (14,461 people) cut off in the Gosaikunda and Amachhodingmo RMs.
* 41 motorable bridges washed away and 4 damaged.
* Missing people registered from 62 districts.
* 11,814 rescued, 253 of them foreign nationals.

China reported 43 dead and 519 missing (16 Sep). Bodies reached Maharajganj and Kushinagar in Uttar Pradesh, India. The Wikipedia infobox figure of "9,287 injured" duplicates the Army deployment number in the same article and is **unreliable**.

**Sources:** [ICIMOD Kyirong–Rasuwa 2026 page with Q&A](https://www.icimod.org/kyirong-rasuwa-flood-2026-nepal-china-border/) · [Wikipedia: 2026 Nepal–Tibet floods](https://en.wikipedia.org/wiki/2026_Nepal%E2%80%93Tibet_floods) and [Timeline](https://en.wikipedia.org/wiki/Timeline_of_the_2026_Nepal%E2%80%93Tibet_floods) · [Acharya & Paudel, EarthArXiv 10.31223/X5HN5H](https://doi.org/10.31223/X5HN5H) and data [Zenodo 10.5281/zenodo.22679444](https://doi.org/10.5281/zenodo.22679444) · [USGS us7000tbwb](https://earthquake.usgs.gov/earthquakes/eventpage/us7000tbwb) · [NDRRMA SitRep #01 (PDF)](https://ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf) · [Kathmandu Post, 26 Aug 2026](https://kathmandupost.com/national/2026/08/26/major-flood-damages-syabrubesi-hydropower-projects-in-rasuwa) · [Kathmandu Post, 28 Aug 2026 (cause)](https://kathmandupost.com/national/2026/08/28/what-triggered-the-rasuwa-flood-scientists-piece-together-a-complex-chain-of-events) · [Nepalnews, 23 Sep 2026](https://english.nepalnews.com/s/feature/buried-under-debris-erased-from-the-record/)


### 7a-bis. Update of 25 September 2026 (new sources)

Tags as elsewhere: figures were opened in the primary source unless marked *(secondary)*.

* **Timing of the collapse.** USGS's origin for us7000tbwb (08:37:10 NPT) was placed by hand (0 phases used). EMSC and phase picks give **08:37:44 NPT** (02:52:44.6 UTC), 34 s later (Huang, Wang & Chen, [Zenodo 22884627](https://zenodo.org/records/22884627)). Chinese Academy of Sciences seismologists report precursory signals at 06:04, 06:50 and 08:15–08:19, and 8.8 mm of rain in the 72 h before *(secondary)*.
* **Second failure.** USGS relocated us7000tc90 (11:45:35, M4.2) on 21 Sep to 28.3281, 85.4798, beside the lower barrier lake; still hand-placed, meaning uncertain.
* **Source and volume.** UNOSAT mapped a **1.96 km² detachment zone** on Landsat 9 on 26 Aug; its "possible triggering location" is 28.28958, 85.52168. Huang et al.: scar 1.95 km², drop 1,119 m (3,913–5,181 m). Volume estimates range from ~10⁷ m³ (Xu, EarthArXiv) to 2–5 × 10⁸ m³ (seismic inversions, CLaSH StoryMap *(secondary)*); no DEM-difference volume published.
* **Barrier lakes** (UNOSAT, Cartosat-3, 28 Aug): **11.9 ha** at 28.3329, 85.4824 (Chhochen–Purepu confluence, Tibet; the ~2–2.5 Mm³ lake that overflowed on 28 Aug and drained 30 Aug) and **19.5 ha** at 28.2930, 85.5109 just below the source. This settles the lake location disputed in the data package.
* **Flow extent.** UNOSAT mudflow/rockflow extent 26–27 Aug: ~65 km², from the source to below Devghat; 5,048 potentially affected buildings; 10 cultural heritage sites damaged or destroyed (Rasuwa Fort, Duksangag Choeling Monastery, Uttargaya Dham, Shree Ram Mandir, Sugatpur Buddhist Vihara, Jalpa Devi, Gaureshwor Dham, and others). CC BY-SA 4.0.
* **Government RDNA** (NDRRMA/NPC, cut-off 3 Sep, published 17 Sep): damage and losses **NPR 408.3 bn (US$2.70 bn)**, recovery needs **US$4.77 bn**; 7,570 affected buildings (Bidur 3,026; Gosaikunda 1,043; Benighat Rorang 1,037), 8,317 households, 32,963 people; 13 hydropower projects (759 MW: 7 operating 250.4 MW, 6 under construction 508.6 MW) and 5 solar plants (24.4 MW); 47 heritage assets incl. Betrawati's treaty stone; modelled deposition 30.5 Mm³ over 94 km (16.1 Mm³ Haku–Devighat). Tables in `pipeline/inputs/official-2026/`.
* **Hydropower workers** (Energy Minister to Parliament, Kathmandu Post 23 Sep): **804 missing** — Upper Trishuli-1 439 (of 1,433 on site; >90% of the upper dam destroyed; 31 bodies recovered from the Audit-3 tunnel at Hakubesi, SitRep #20), UT-3B 178, Rasuwagadhi 93, Langtang Khola 39, UT-3A 39, Mailung 7, Rasuwa Bhotekoshi 3, Trishuli 3, Middle Trishuli Ganga 2, Chilime 1. 11 plants shut and 410 MW off the grid. Chilime: 5 NEA staff found dead at the powerhouse after a 250 m tunnel breakthrough.
* **Other tolls and figures.** DNA taken from 1,286 bodies and 1,997 relatives (21 Sep); holding centres peaked at 4,521 people (3 Sep). The foreign minister told the UN (24 Sep) that losses exceed US$5 bn. China: 43 dead, 519 missing (5 Sep); 0.7 km² and 27 buildings flattened at Gyirong port, hit at 10:59 BJT (08:44 NPT).
* **Open imagery added.** NEA Engineering drone orthophotos on OpenAerialMap (CC BY 4.0): Rasuwagadhi crossing to Timure, 3.5 cm, 1 Sep 2025; Simle / Upper Trishuli-3B, 6 cm, 3 Sep 2025. HOT's post-event mosaic of 26 Vantor scenes (27 Aug–8 Sep, ~0.4 m).
* **Still open.** The missing count differs by register (NDRRMA 5,705 vs police 4,718); t0 (08:37:10 vs 08:37:44); hydropower totals (666 / 748 / 759 MW hit; 410 / 430 MW offline); the volume.

---

## 7b. Other notable events, 2023–2025

*Compiled by a sub-agent. Flow lines and points are in `agent-2023/coords_agent2023.geojson`: 41 points plus 4 river lines — Hewa/Sabha to the Arun; Panchthar Hewa to the Tamor; Kabeli to the Tamor; Trishuli/Narayani from Mugling to the Gandak Barrage.*

### 17–18 June 2023, eastern Nepal (Koshi Province)

Two different rivers called "Hewa Khola" flooded, and many reports mix them up.

**Rainfall:** monsoon onset was around 14 June. Num (Sankhuwasabha) had only 9 mm on 17 Jun, but 111–387 mm/day on 18–19 Jun. Falelung (Panchthar) had 230 mm on 18 Jun.

**(a) Sankhuwasabha Hewa Khola** (Arun basin; OSM calls it "Hinwan Khola")
* **Cause:** a landslide-dammed reach at the Chainpur-4 / Panchkhapan-9 boundary, representative point ≈27.3646, 87.3871 (approx). It burst around **21:30 NPT, Saturday 17 Jun**.
* **Super Hewa camp:** the 5(+1) MW project was ~90% complete. Its camp was hit at ≈27.355, 87.378 (low-confidence approx). **18 workers** were swept from tents: **4 dead, 14 missing**, 2 injured survivors.
* **Other victims:** 1 dead in Panchkhapan; 2 elderly missing at Sabhapokhari-3; 2 missing at Nundhaki, Chainpur-1 (27.3005, 87.4425).
* **Totals:** KP (5 Jul) gives 3 dead + 18 missing; BIPAD gives 3 dead, 16 missing, 3 injured.
* **Flow path:** Hewa → Sabha Khola (confluence 27.2941, 87.2104) → Arun (27.2709, 87.2064), 36.8 km in total.
* **Hydropower hit:**
  * Super Hewa (destroyed; Rs 800 M)
  * Upper Hewa 8.5 MW (box 27.326–27.349 N, 87.346–87.375 E; shut until 4 Jan 2024)
  * Hewa Khola 4.455 MW (≈27.325, 87.340)
  * Upper Piluwa-2 (Rs 900 M), Lower Piluwa, Piluwa Khola, Maya Khola 14.9 MW, Sabha Khola 3.3 MW, Isuwa 97.2 MW (Rs 500 M)

**(b) Panchthar Hewa Khola** (Tamor basin)
* **Source:** landslides around Falelung-3 (ward centroid 27.2094, 87.9438).
* **Timing:** Hewa Khola-A (14.9 MW; box centre 27.1858, 87.8688) was hit at about **01:00 on 18 Jun**. The Mechi Highway Hewa bridge (27.1653, 87.7621) was overtopped and collapsed at about **02:00**. Implied front speed is ~2–4 m/s.
* **Further damage:** **Lower Hewa, 22.1 MW (Rs 1 bn, the largest single loss)**; Phidim (27.1441, 87.7661); Hewa–Tamor confluence 27.1560, 87.7102 (41.3 km).
* **Toll:** KP gives 3 dead + 3 missing; Rising Nepal gives 2 + 3. BIPAD records 12 houses destroyed at Lumbidang.

**(c) Taplejung and the Kabeli corridor**
* Mehele, Sidingba-6 (ward centroid 27.3487, 87.8805): 3 dead + 3 missing.
* Kabeli B-1, 25 MW (27.2731, 87.8361): Rs 500 M.
* Iwa Khola 9.9 MW, Upper Ingwa 9.7 MW, Super Kabeli A 13.5 MW, Super Kabeli Cascade 12 MW also damaged.

**How the totals changed**
* 19 Jun (police): 3 dead, 28–29 missing.
* 20 Jun (KP): 8 dead, 27 missing.
* **BIPAD now (16–20 Jun):** 9 dead, 25 missing, 7 injured, 32 houses destroyed.
* **IPPAN final:** **30 projects, 463 MW, NPR 8.4–8.5 bn.** A recount in Jan 2024 gives 11 operating plants (107.5 MW) plus 20 under construction (369.3 MW).

### Melamchi repeat flood, 11 Aug 2023
Confirmed by Chen et al. 2024. Most of the renewed erosion of the Bremathang deposits happened then. The lower-reach bed dropped 1–6 m between Oct 2021 and Dec 2023, and a large slope failure near Talamarang kept growing. No casualty figures were found. BIPAD lists only minor floods at Dhungre Bazar and Gyalthum on 23 and 25 Aug 2023.

### Darchula / Mahakali, August 2023
**Not verified.** BIPAD has no Darchula flood with casualties in June–September 2023.

### Other 2024–2025 items (BIPAD points are ward centroids)
| Date | Place | Toll | lat, lon |
|---|---|---|---|
| 13 Jun 2024 | Phaktanglung-6, Taplejung, landslide | 4 dead | 27.6099, 87.8261 |
| 29 Jun 2024 | Resunga-14, Gulmi, landslide | 5 dead | 28.0985, 83.3106 |
| 16 Jul 2024 | Aathbiskot-10, Rukum West, flood | 3 dead, 1 missing | 28.7590, 82.4062 |
| 28 Jul 2024 | Dharche-5, Gorkha, landslide | 5 dead | 28.2735, 84.8101 |
| 6 Aug 2024 | Badigad-10, Baglung, landslide | 9 dead, 1 missing, 12 injured | 28.2692, 83.1223 |
| 25 Aug 2024 | Gokulganga-4, Ramechhap, landslide | 8 dead, 2 missing | 27.5369, 86.1881 |
| 14 May 2025 (night) | Tilgau, Namkha-6, Humla: two small glacial lakes burst (ice/debris avalanche), no rain | 0 dead; 5 wooden bridges lost; ~32 displaced | — |
| 13 Aug 2025 | Gaumul-1, Bajura, flood | 24 houses destroyed | 29.5579, 81.4904 |
| 20 Sep 2025 | Tuin Khola bridge works (Ichchhakamana-5), landslide | Narayanghat–Mugling road closed ~48 h | — |

---

## 7c. The rest of the 2026 monsoon (to 24 Sep 2026)

*Compiled by a sub-agent. ✔ = article checked directly. 34 geocoded points are in `agent-2026/sub2026other/events_2026_other.json`.*

**Season**
* **Onset:** 19 Jun 2026 in eastern Koshi, **6 days late** (normal is 13 Jun).
* **Rainfall:** 1–25 Jun had 69.6% of normal. No DHM season-to-date figure was found after June.
* **Outlook:** the DHM seasonal outlook (8 May) called for below-normal rainfall.
* **Withdrawal:** not yet announced as of 24 Sep. KP (20 Sep) forecast heavy rain for 24–28 Sep.
* **Koshi Barrage:** peaked at 209,840 cusecs at 16:00 on 19 Jul, above the 150,000 red-alert level, with no deaths reported.

**National totals** (none official that include 26 Aug)
| Figure | Window | Dead | Missing | Injured | Source |
|---|---|---|---|---|---|
| Nepal Police, monsoon-type hazards | 14 Apr–14 Aug 2026 | **85** (landslide 35, lightning 26, flood 19, heavy rain 4, avalanche 1) | 9 | 196 | ✔ [KP 15 Aug 2026](https://kathmandupost.com/national/2026/08/15/monsoon-disasters-leave-85-dead-as-rains-continue) |
| NDRRMA, all hazards | 14 Apr–8 Aug | 205 | 5 | 1,324 | Pardafas |
| BIPAD, my/sub-agent sums (flood + landslide + heavy rain + lightning + avalanche) | 1 Jun–23 Sep | **87** (landslide 33, flood 28, lightning 20, heavy rain 4, avalanche 2) | 8 | 157 | BIPAD API (26 Aug not linked in BIPAD) |
| 26 Aug event (NDRRMA) | 26 Aug–23 Sep | **1,451** | **5,705** | — (6,827 treated by 8 Sep) | NDRRMA via Pardafas |
| Indicative 2026 total (adds different definitions) | to 23 Sep | **≈1,540** | **≈5,700** | — | derived |

**Fatal events other than 26 Aug** (coordinates approx unless marked; BIPAD often misplaces them)
| Date, time (NPT) | Place | What happened | Toll | lat, lon |
|---|---|---|---|---|
| **12 Aug ~19:30** | **Kotalbara, Thabang RM-5, Rolpa**. Bodies found in the Lungri and Madi rivers | Landslide after ~1.5 h of rain; road cutting blamed | **13 dead**, 2 injured, 11 houses destroyed, 76 displaced | ≈28.4327, 82.8053 (BIPAD point 28.3243, 82.6552 is wrong) |
| 15 Aug evening | Bheri-2 (Risang), Jajarkot | Landslides | 4 dead, 6–7 injured | 28.8698, 82.1994 (ward centroid) |
| 13 Aug night | Phalbang, Sunchhahari-2, Rolpa | Landslide on 2 houses | 2–4 dead | ≈28.3928, 82.9016 |
| 18 Aug | Basudev stream, Hetauda-19 | Flash flood swept 4 schoolgirls | 3 dead | ≈27.4879, 84.9487 |
| 28 Aug evening | Harkachowk, Pokhara-17 | Urban flash flood | 2 dead | 28.1922, 83.9715 |
| 31 Aug | Kanchan River, Rainadevi Chhahara-7, Palpa | Flash flood | 2 dead | ≈27.8217, 83.6342 |
| 5 Sep ~11:00 | Super Seti hydropower road cut, Machhapuchchhre-1, Kaski | Landslide | 2 dead | ≈28.3463, 83.9901 |
| 28 Jul ~02:30 | Bhatbeshi, Lamjung | Canal breach and landslide | 2 dead | ≈28.2836, 84.4361 |
| 25 Jul | Dhawang Lek, Sunchhahari-1, Rolpa | Landslide | 2 dead | ≈28.3879, 82.8196 |
| 13 Jul | Kaprikhola, Kalikot | Landslide | 2 dead | 29.2156, 81.7451 |
| 3 Jun ~17:45 | Ratamata, Gangadev-6, Rolpa | Flash flood | 2 children | ≈28.4991, 82.4547 |
| 17 Jun | Naubahini-5, Pyuthan | Flash flood | 2 dead | ≈28.2371, 82.8806 |
| 5 Jul ~03:00 | Gairigaun, Jagadulla-5, Dolpa | Debris flood | 1 dead, 4–6 injured | ≈29.1209, 82.5645 |

**Landslide dams, outbursts and infrastructure**
| Date | Place | What happened | lat, lon |
|---|---|---|---|
| **12 Jul** | **Kimrong Khola** (Annapurna-11, Kaski) → Modi | **Landslide dam burst.** Kimrong bridge lost; Syauli Bazar buildings swept; Nayapul–Ghandruk road eroded; **4 hydropower plants (~74 MW) shut**; no deaths | 28.4057, 83.7947 (OSM); Syauli Bazar 28.3399, 83.8020; Birethanti 28.3095, 83.7748; Nayapul 28.2981, 83.7679 |
| **8 Sep** | Kimrong Khola again | Temporary landslide dam for ~3–4 h (flow dropped ~18:00, cleared from ~midnight). Warning notice at 20:00; the 99 MW Landruk project site evacuated | same |
| 13–14 Aug | Modi River, Kaski/Parbat | 2 bridges lost; half the Mata Annapurna temple swept away | — |
| 4 Sep 10:00–17:00 | Bhattar, Apihimal-4, Darchula | Landslide partly blocked the Chameliya River, then cleared | 29.8071, 80.8607 |
| **2 Jul ~21:00** | **Melamchi headworks, Ambathan** | Temporary intake dam destroyed; Kathmandu's 170 MLD supply halted | 27.9639, 85.5339 |
| 11 Jul ~01:00 | Sundarighat, Kirtipur-10 (Bagmati) | Squatter holding centre flooded; 54 rescued | ≈27.6790, 85.2897 |
| 12–31 Jul | Araniko Highway, Sindhupalchok | Road collapsed; **Tatopani border shut from 13 Jul** | Kodari 27.9646, 85.9569 |
| 22 May (pre-monsoon) | Kabeli/Tamor/Mewa/Iwa, Panchthar–Taplejung | 55 MW offline; >6 bridges lost | — |
| 6 Sep ~03:30 | Namrung / Therang Khola, Chumnubri-4, Gorkha | 4 houses and a footbridge destroyed | 28.5451, 84.7679 |
| 13 Sep | Tribeni Nalagad, Jajarkot | Houses and shops swept; Bheri Corridor blocked | — |
| 15 and 20 Sep | Sarkegad, Humla | Debris floods buried ~100 m of the Hilsa–Simkot road | — |

**Searched, nothing found:** a separate 2026 GLOF in Nepal or Tibet; a bus swept away; a major Kathmandu or Terai flood disaster; Solukhumbu/Thame, Manang, Taplejung/Ilam, Bajhang.

---

## 7d. 2025 monsoon season (for reference)

**Season (DHM seasonal summary, 11 Nov 2025):**
* Onset **29 May** (15 days early); withdrawal **10 Oct** (8 days late); 135 days.
* **Jun–Sep rainfall 90.0% of normal.**
* Bhairahawa Airport set a station record of 267.6 mm on 15 Sep.
* Oct–Nov rainfall was 297.3% of normal (the 3–5 Oct event).

**Totals** (no official end-of-season monsoon total found)
| Source | Window | Dead | Missing | Injured |
|---|---|---|---|---|
| NDRRMA via Xinhua | onset–31 Jul 2025 | 43 | 16 | 116 |
| NDRRMA via Republica | to ~31 Aug 2025 | 82 | 22 | 167 |
| Nepal Police (retrospective, KP 15 Aug 2026) | Apr–Aug 2025 | 90 | — | — |
| **NDRRMA via Rising Nepal** | **14 Apr–1 Nov 2025, all hazards** (includes Rasuwa and October) | **335** | **41** | 264 (as printed) |
| NDRRMA via Khabar Center | Nepali year 2082, all hazards | 464 | 38 | 1,814 |
| BIPAD, sub-agent sums (flood + landslide + heavy rain + lightning) | 29 May–10 Oct 2025 | 123 (82 without 3–5 Oct) | 30 | 266 |

**Largest 2025 events** other than the Rasuwa GLOF (§4) and October (§5):
* **14 May (night), Tilgau, Namkha-6, Humla:** two small glacial lakes burst with no rain. No deaths, 5 bridges lost, ~32 displaced.
* **8 Jul ~17:00, Chhoser, Lomanthang-4, Upper Mustang (29.2310, 83.9771):** a flash flood lasting ~3 h took out 4–6 bridges. No deaths.
* **9 Jul, Myagdi:** a landslide blocked the Myagdi River at Basbot (≈28.3814, 83.3341); 1 dead, 1 missing.
* **14 Jul, Bhumikasthan-10, Arghakhanchi:** couple buried by a landslide, 2 dead.
* **13 Aug, Bichhya River, Himali-1, Bajura (29.6536, 81.6825):** 11–24 houses swept away.
* **18 Aug, Rahughat hydropower dam site, Myagdi:** landslide, 2 dead, 5 injured.
* **19 Jun, Binayi Khola, East–West Highway:** a bus was swept away, but all 38 people aboard were rescued.

No 2025 incident outside §4 and §5 killed more than 2 people.

---

## 8. Machine-readable key points

These are the same points as in `events_points.geojson`. `km` is chainage along the event flow path; `t_npt` is the arrival or observation time.

#### melamchi_2021-06-15
```json
[
 {"seq": 1, "name": "Pemdang Khola moraine-dammed glacial lake (breached)", "lat": 28.1311, "lon": 85.515, "role": "origin", "prec": "approx (±0.5 km)", "km": 0.0, "t_npt": "2021-06-15 (time unknown)"},
 {"seq": 2, "name": "Pemdang Khola–Melamchi Khola confluence", "lat": 28.0987, "lon": 85.54735, "role": "path", "prec": "OSM node", "km": 5.3},
 {"seq": 3, "name": "Bremthang (Bremathang) old landslide dam, toe (approx 1.8 km below confluence)", "lat": 28.0831, "lon": 85.5455, "role": "origin (secondary sediment source)", "prec": "approx", "km": 7.1},
 {"seq": 4, "name": "New landslide at Melamchigaon (left bank; dammed river ~45–60 min)", "lat": 28.0211, "lon": 85.53251, "role": "origin (landslide dam)", "prec": "survey DMS→DD", "km": 14.8, "t_npt": "~18:00–19:00"},
 {"seq": 5, "name": "Melamchi Ghyang (Melamchigaon) village", "lat": 28.01766, "lon": 85.52326, "role": "village", "prec": "OSM node", "km": 15.5},
 {"seq": 6, "name": "DHM gauge Melamchi at Nakote (627.5) – destroyed 15 Jun", "lat": 28.0108, "lon": 85.5353, "role": "gauge", "prec": "DHM (4 dp)", "km": 16.2, "t_npt": "18:00–19:00 stage fell 4.7→3.0 m, then rose to ~6 m within minutes"},
 {"seq": 7, "name": "Ambathan – Melamchi Water Supply Project headworks/intake & adit", "lat": 27.96392, "lon": 85.53384, "role": "infrastructure (headworks)", "prec": "OSM way centroid (adit)", "km": 22.7},
 {"seq": 8, "name": "Timbu", "lat": 27.95366, "lon": 85.54789, "role": "village", "prec": "OSM node", "km": 24.4},
 {"seq": 9, "name": "Kiul (Kiwul) riverside bazaar", "lat": 27.9318, "lon": 85.5556, "role": "village", "prec": "approx (river snap)", "km": 27.7},
 {"seq": 10, "name": "Gyalthum", "lat": 27.8817, "lon": 85.54118, "role": "village", "prec": "OSM node", "km": 34.5},
 {"seq": 11, "name": "Talamarang", "lat": 27.85178, "lon": 85.53986, "role": "village", "prec": "OSM node", "km": 38.0},
 {"seq": 12, "name": "Melamchi–Indrawati confluence", "lat": 27.83334, "lon": 85.57723, "role": "confluence", "prec": "OSM node", "km": 42.3},
 {"seq": 13, "name": "Melamchi Bazaar (town centre)", "lat": 27.8293, "lon": 85.57613, "role": "town", "prec": "OSM node", "km": 43.0, "t_npt": "\"after 8 or 9 pm\" (AFP) / \"evening, still light\" (ICIMOD)"},
 {"seq": 14, "name": "Bahunepati", "lat": 27.7924, "lon": 85.5726, "role": "town", "prec": "DHM precip stn", "km": 47.2},
 {"seq": 15, "name": "Dolalghat (Indrawati–Sun Koshi confluence) – distal deposition", "lat": 27.63566, "lon": 85.70929, "role": "end/deposition", "prec": "OSM node", "km": 73.6},
 {"seq": 16, "name": "DHM AWS Sermathang (2,625 m)", "lat": 27.94415, "lon": 85.59546, "role": "weather station", "prec": "OSM hamlet (approx)"},
 {"seq": 17, "name": "ICIMOD AWS Ganja La (4,962 m)", "lat": 28.1545, "lon": 85.5625, "role": "weather station", "prec": "4 dp"}
]
```

#### thame_2024-08-16
```json
[
 {"seq": 1, "name": "Upper Ngole glacial lake (lake 1) – initial outburst", "lat": 27.8328, "lon": 86.56567, "role": "origin", "prec": "OSM polygon centroid (pre-2024 outline)", "km": 0.0, "t_npt": "~13:00"},
 {"seq": 2, "name": "Lower Ngole lake / Ngole Pokhari (\"Thyanbo\" lake; DHM lake 2, GL086573E27827N) – cascading breach", "lat": 27.82773, "lon": 86.57292, "role": "origin", "prec": "OSM polygon centroid", "km": 0.9, "t_npt": "~13:00–13:10"},
 {"seq": 3, "name": "Thyangbo (Thyanbo) kharka", "lat": 27.82506, "lon": 86.6033, "role": "path", "prec": "OSM node", "km": 4.1},
 {"seq": 4, "name": "Thame village (ward 5, Khumbu Pasanglhamu RM) – primary deposition zone", "lat": 27.83189, "lon": 86.65048, "role": "village", "prec": "OSM node", "km": 9.4, "t_npt": "~13:30 (≈22 min after breach, modelled)"},
 {"seq": 5, "name": "Thame micro-hydro head pond (930 kW plant per NHESS)", "lat": 27.82987, "lon": 86.65343, "role": "infrastructure (hydro)", "prec": "OSM polygon", "km": 9.7},
 {"seq": 6, "name": "Thame Khola – Bhote Koshi confluence", "lat": 27.83064, "lon": 86.65978, "role": "confluence", "prec": "OSM node", "km": 10.5},
 {"seq": 7, "name": "Thamo", "lat": 27.82239, "lon": 86.67832, "role": "village", "prec": "OSM node", "km": 12.7},
 {"seq": 8, "name": "Namche Bazaar (above river)", "lat": 27.80417, "lon": 86.7098, "role": "town", "prec": "OSM node", "km": 16.8},
 {"seq": 9, "name": "Larja Dobhan (Bhote Koshi – Dudh Koshi confluence)", "lat": 27.78953, "lon": 86.71914, "role": "confluence", "prec": "OSM node", "km": 19.0},
 {"seq": 10, "name": "Jorsalle", "lat": 27.77855, "lon": 86.72209, "role": "village", "prec": "OSM node", "km": 20.4},
 {"seq": 11, "name": "Monjo", "lat": 27.77192, "lon": 86.723, "role": "village", "prec": "OSM node", "km": 21.2},
 {"seq": 12, "name": "Phakding", "lat": 27.74013, "lon": 86.71269, "role": "village", "prec": "OSM node", "km": 26.0},
 {"seq": 13, "name": "Surke", "lat": 27.67168, "lon": 86.71502, "role": "village", "prec": "OSM node", "km": 35.1},
 {"seq": 14, "name": "Jubing", "lat": 27.59759, "lon": 86.68618, "role": "village", "prec": "OSM node", "km": 44.5},
 {"seq": 15, "name": "Motorable bridge damaged ~47 km below Thame (location not published)", "lat": 27.522, "lon": 86.705, "role": "infrastructure (bridge)", "prec": "very approx (chainage-derived)", "km": 56.0},
 {"seq": 16, "name": "DHM gauge Dudh Koshi at Rabuwa Bazar (Khotang) – ~82 km below Thame", "lat": 27.27, "lon": 86.67, "role": "gauge", "prec": "approx (unverified)", "t_npt": "rise from 17:10; peak 5.53 m / ~966 m³/s at 17:40; normal by 20:20"}
]
```

#### rasuwa_glof_2025-07-08
```json
[
 {"seq": 1, "name": "Purepu Glacier supraglacial lake (Gyirong County, Tibet) – drained", "lat": 28.375, "lon": 85.625, "role": "origin", "prec": "approx (±2 km; on debris-covered tongue)", "km": 0.0, "t_npt": "early 8 Jul (≈02:00 NPT, inferred)"},
 {"seq": 2, "name": "Purepu glacier terminus / Purepu Tsangpo head", "lat": 28.36579, "lon": 85.61346, "role": "path", "prec": "OSM node", "km": 1.5},
 {"seq": 3, "name": "Purepu Tsangpo – Chusumdo Tsangpo confluence", "lat": 28.31249, "lon": 85.55406, "role": "confluence", "prec": "OSM node", "km": 10.8},
 {"seq": 4, "name": "Chhochen Khola – Chusumdo confluence", "lat": 28.33209, "lon": 85.48564, "role": "confluence", "prec": "OSM node", "km": 18.5},
 {"seq": 5, "name": "Chusumdo – Lende Khola (Donglin Tsangpo) confluence", "lat": 28.33579, "lon": 85.44014, "role": "confluence", "prec": "OSM node", "km": 23.3},
 {"seq": 6, "name": "Rasuwagadhi – Nepal–China Friendship (Miteri/Resuo) Bridge – destroyed", "lat": 28.27867, "lon": 85.37807, "role": "infrastructure (bridge)", "prec": "OSM way centroid", "km": 33.3, "t_npt": "~03:00–03:10"},
 {"seq": 7, "name": "Rasuwagadhi HEP (111 MW) headworks dam", "lat": 28.27364, "lon": 85.37712, "role": "infrastructure (hydro)", "prec": "OSM way centroid", "km": 33.9},
 {"seq": 8, "name": "Timure (dry port / customs yard)", "lat": 28.25285, "lon": 85.36667, "role": "town/infrastructure", "prec": "OSM node", "km": 36.7, "t_npt": "03:10 (Nepali Times, Timure station)"},
 {"seq": 9, "name": "Syaphrubesi (Syabrubesi)", "lat": 28.1628, "lon": 85.3378, "role": "town", "prec": "4 dp", "km": 47.8},
 {"seq": 10, "name": "Chilime HEP powerhouse (22.1 MW)", "lat": 28.15735, "lon": 85.33192, "role": "infrastructure (hydro)", "prec": "OSM node", "km": 48.7},
 {"seq": 11, "name": "Upper Trishuli-3A powerhouse (60 MW)", "lat": 28.02698, "lon": 85.18477, "role": "infrastructure (hydro)", "prec": "OSM polygon", "km": 71.2},
 {"seq": 12, "name": "Betrawati", "lat": 27.9731, "lon": 85.186, "role": "town", "prec": "4 dp", "km": 77.6, "t_npt": "by ~05:00 (Nepali Times)"},
 {"seq": 13, "name": "Trishuli HEP (24 MW), Trishuli Bazar/Bidur", "lat": 27.92148, "lon": 85.14599, "role": "infrastructure (hydro)", "prec": "OSM relation", "km": 85.7},
 {"seq": 14, "name": "Devighat HEP (15 MW)", "lat": 27.88901, "lon": 85.135, "role": "infrastructure (hydro)", "prec": "OSM polygon", "km": 90.6},
 {"seq": 15, "name": "Mugling (debris/flood reached during 8 Jul)", "lat": 27.8562, "lon": 84.561, "role": "town", "prec": "4 dp", "km": 174.2}
]
```

#### rasuwa_gyirong_2026-08-26
```json
[
 {"seq": 1, "name": "Langtang Lirung N-face ice–rock detachment (USGS seismic)", "lat": 28.271, "lon": 85.515, "role": "origin", "prec": "seismic epicentre (±km)", "km": 0.0, "t_npt": "08:37:10"},
 {"seq": 2, "name": "Detachment point (Planet imagery)", "lat": 28.2765, "lon": 85.5194, "role": "origin", "prec": "imagery"},
 {"seq": 3, "name": "Detachment point (glaciological assessment)", "lat": 28.2853, "lon": 85.5252, "role": "origin", "prec": "imagery"},
 {"seq": 4, "name": "Main barrier lake (Chhochen Khola – Purepu/Chusumdo confluence, Tibet)", "lat": 28.3321, "lon": 85.4856, "role": "landslide dam", "prec": "OSM node", "t_npt": "formed 26 Aug; overflow 28 Aug ~15:35 NPT (17:50 BJT); drained 29–30 Aug"},
 {"seq": 5, "name": "Second (upper) barrier-lake candidate", "lat": 28.294, "lon": 85.511, "role": "landslide dam", "prec": "imagery"},
 {"seq": 6, "name": "Rasuwagadhi / Gyirong Port (DHM gauge 4913 at 28.271297,85.377649)", "lat": 28.2778, "lon": 85.3778, "role": "town/border", "prec": "4 dp", "km": 22.3, "t_npt": "08:40–08:50 (gauge silent after 08:40); CCTV impact 08:44"},
 {"seq": 7, "name": "Timure (customs/dry port)", "lat": 28.2528, "lon": 85.3667, "role": "town", "prec": "4 dp", "km": 25.6, "t_npt": "~08:45 (interpolated)"},
 {"seq": 8, "name": "Syabrubesi (DHM gauge 191 at 28.17065,85.342554)", "lat": 28.1628, "lon": 85.3378, "role": "town", "prec": "4 dp", "km": 36.7, "t_npt": "08:50–09:00"},
 {"seq": 9, "name": "Betrawati (DHM gauge 52)", "lat": 27.9731, "lon": 85.186, "role": "town", "prec": "4 dp", "km": 66.4, "t_npt": "09:20–09:30"},
 {"seq": 10, "name": "Galchhi (DHM gauge 5705 at 27.802328,85.00305)", "lat": 27.7974, "lon": 85.0005, "role": "town", "prec": "4 dp", "km": 100.1, "t_npt": "10:20–10:30; warning 10:40; peak 10:50 (+8.8 m)"},
 {"seq": 11, "name": "Malekhu / Phurke gauge 5611", "lat": 27.8137, "lon": 84.8272, "role": "town", "prec": "4 dp (settlement centroid)", "km": 123.9, "t_npt": "warning 11:26; danger & gauge+bridge swept 11:43; bazaar hit 11:50"},
 {"seq": 12, "name": "Mugling", "lat": 27.8562, "lon": 84.561, "role": "town", "prec": "4 dp", "km": 163.1, "t_npt": "passed by 13:00"},
 {"seq": 13, "name": "Kali Khola gauge 4781", "lat": 27.833, "lon": 84.546, "role": "gauge", "prec": "3 dp", "t_npt": "13:10–13:20; danger 14:20; peak 12.35 m"},
 {"seq": 14, "name": "Devghat (Narayani gauge 265)", "lat": 27.7429, "lon": 84.4231, "role": "end", "prec": "4 dp", "km": 196.2, "t_npt": "14:30–14:40; peak 6.57 m / 5,850 m³/s at 16:00"}
]
```

#### sep2024_floods
```json
[
 {"seq": 1, "name": "Jhyaple Khola landslide (3 buses buried, 35 dead) – Nagdhunga–Naubise road, Dhunibesi Mun.", "lat": 27.712, "lon": 85.18, "role": "landslide", "prec": "approx (±3 km; site not geocoded)", "t_npt": "night 27–28 Sep (exact time unverified)"},
 {"seq": 2, "name": "Roshi Bazar, Kalati Bhumidanda (Panauti-12)", "lat": 27.57108, "lon": 85.48884, "role": "village", "prec": "OSM node", "km": 4.7},
 {"seq": 3, "name": "Panauti (Roshi–Punyamata confluence)", "lat": 27.58519, "lon": 85.51934, "role": "town", "prec": "OSM node", "km": 8.5},
 {"seq": 4, "name": "Khopasi Bazar (DHM Khopasi-Panauti stn: 331.6 mm/24 h record)", "lat": 27.56666, "lon": 85.53377, "role": "town", "prec": "OSM node", "km": 11.8},
 {"seq": 5, "name": "Namobuddha-7 (49 dead, 1,495 houses destroyed per BIPAD) – ward centroid", "lat": 27.5449, "lon": 85.6365, "role": "ward", "prec": "ward centroid"},
 {"seq": 6, "name": "Katunje (Roshi RM, BP Highway)", "lat": 27.53731, "lon": 85.66836, "role": "village", "prec": "OSM node", "km": 38.2},
 {"seq": 7, "name": "Roshi Khola – Sun Koshi confluence", "lat": 27.45166, "lon": 85.81993, "role": "confluence", "prec": "OSM node", "km": 60.8},
 {"seq": 8, "name": "Balkhu (KMC-14) – Bagmati flood 03:00 on 28 Sep", "lat": 27.6849, "lon": 85.29823, "role": "settlement", "prec": "OSM node", "t_npt": "~03:00 28 Sep"},
 {"seq": 9, "name": "Chobhar gorge (Nakkhu–Bagmati confluence)", "lat": 27.65921, "lon": 85.29383, "role": "confluence", "prec": "OSM node"},
 {"seq": 10, "name": "Nakkhu River lower reach (Nakkhu bridge area, Lalitpur)", "lat": 27.6478, "lon": 85.313, "role": "river", "prec": "OSM way start"},
 {"seq": 11, "name": "Bagmati at Khokana gauge (550.05): 6.16 m > 6.0 m record (2002)", "lat": 27.644, "lon": 85.3, "role": "gauge", "prec": "approx (DHM met stn 3 dp)"},
 {"seq": 12, "name": "Kathmandu Airport met stn: 239.7 mm/24 h (to 08:45 28 Sep)", "lat": 27.704, "lon": 85.36, "role": "weather station", "prec": "DHM 3 dp"},
 {"seq": 13, "name": "Kageshwori Manahora-9 landslides (14 dead) – ward centroid", "lat": 27.6991, "lon": 85.3786, "role": "ward", "prec": "ward centroid"},
 {"seq": 14, "name": "ANFA academy landslide, Tekar, Makwanpurgadhi-5 (6 dead) – ward centroid", "lat": 27.4427, "lon": 85.088, "role": "landslide", "prec": "ward centroid"},
 {"seq": 15, "name": "Daman met stn: 410.0 mm/24 h, 517 mm/3 days (national max)", "lat": 27.604, "lon": 85.09, "role": "weather station", "prec": "DHM 3 dp"},
 {"seq": 16, "name": "Saptakoshi at Chatara: 11.83 m (> 11.5 m, 1980)", "lat": 26.866, "lon": 87.16, "role": "gauge", "prec": "approx"}
]
```

#### ilam_koshi_2025-10-04
```json
[
 {"seq": 1, "name": "Sandakpur RM-1 landslides (6 dead) – ward centroid", "lat": 27.04333, "lon": 87.90249, "role": "ward", "prec": "ward centroid", "t_npt": "4 Oct 2025"},
 {"seq": 2, "name": "Deumai-5 Ghuseni landslide – ward centroid", "lat": 26.92025, "lon": 87.79841, "role": "ward", "prec": "ward centroid", "t_npt": "4 Oct 2025"},
 {"seq": 3, "name": "Ilam Municipality-5 (4 dead) – ward centroid", "lat": 26.94898, "lon": 87.92656, "role": "ward", "prec": "ward centroid", "t_npt": "4 Oct 2025"},
 {"seq": 4, "name": "Maijogmai-3 (4 dead) – ward centroid", "lat": 26.92637, "lon": 88.01247, "role": "ward", "prec": "ward centroid", "t_npt": "4 Oct 2025"},
 {"seq": 5, "name": "Suryodaya-1 Manebhanjyang (3–5 dead)", "lat": 26.98743, "lon": 88.12013, "role": "town", "prec": "OSM node", "t_npt": "4 Oct 2025"},
 {"seq": 6, "name": "Mangsebung-1 Patigau / Mangsebung-5 – ward centroid", "lat": 26.90269, "lon": 87.74196, "role": "ward", "prec": "ward centroid", "t_npt": "4 Oct 2025"}
]
```

Other point sets:
* `agent-2023/coords_agent2023.geojson`: June 2023 Hewa/Kabeli, Simaltal and Narayani body-recovery points, plus 4 river lines.
* `agent-2026/sub2026other/events_2026_other.json`: 34 points for the smaller 2026 events.
* `agent-2026/zen_acharya/bhotekoshi-trishuli-2026/data/gauges.json`: 2026 DHM gauge positions, thresholds and arrival windows.

---

## 9. Uncertainties and open questions

1. **Melamchi source lake.** The coordinate is a reader-supplied point consistent with ICIMOD's description, not surveyed. An OSM lake at 28.1515, 85.4952 (79,000 m²) is much larger than ICIMOD's 2,761 m² lake and is probably a different lake.
2. **Melamchi arrival time at the bazaar.** Sources say "after 8–9 pm" (AFP) and "evening, still light" (ICIMOD). The Nakote damming window of 18:00–19:00 is the most reliable anchor.
3. **Purepu lake (2025)** is placed to ±2 km on the glacier tongue. No published coordinate was found; ScienceDirect and Stimson were blocked by bot checks. Drained-volume estimates differ by about 2× (3.55 vs ~7.2 Mm³).
4. **Jhyaple Khola (Sept 2024).** Only "near Nagdhunga" is confirmed; the exact ward or chainage is not. BIPAD's point for it is wrong.
5. **BIPAD ward lumping.** For Sept 2024, Namobuddha-7 and Konjyosom-4 absorb many village-level incidents, so treat per-ward numbers as district-level evidence.
6. **2026 Rasuwa–Gyirong figures are still being revised.**
   * Volume estimates range from ~1 km² detached (NDRRMA) to ">100 Mm³ mobilised" (USGS scientist in media). Wikipedia's 197–492 Mm³ is unverified.
   * Casualty counts include 530 partial remains, so the number of distinct people is uncertain.
   * Wikipedia's "9,287 injured" is unreliable.
   * The timing is disputed: most analyses have an instant collapse at 08:37; one analysis argues for a 25 Aug failure with an 18–19 h impoundment.
7. **Thame Rabuwa Bazar gauge** coordinate (~27.27, 86.67) is unverified.
8. **Darchula / Mahakali flood of Aug 2023** could not be verified (BIPAD has none); do not map it.

## 10. Key sources (by event)
* **Melamchi 2021:**
  * [ICIMOD report](https://dpnet.org.np/public/uploads/files/HimalDoc2021_MelamchiFloods_Report%202022-03-07%2010-29-32.pdf)
  * [Chen et al. 2024, Nat. Geosci.](https://www.nature.com/articles/s41561-024-01596-x)
  * [KP](https://kathmandupost.com/climate-environment/2021/06/17/flood-devastation-in-melamchi-not-only-because-of-rains)
  * [NSEG sitrep](https://multibriefs.com/briefs/iaeg/melamchi.pdf)
* **Thame 2024:**
  * [NHESS 26:4131](https://nhess.copernicus.org/articles/26/4131/2026/)
  * [DHM report](https://dhm.gov.np/uploads/dhm/downloads/Thame_Flood_Report_23_August_2024.pdf)
  * [ICIMOD](https://www.icimod.org/press-release/glof-from-thyanbo-glacial-lake-sweeps-away-thame-village/)
  * [KP](https://kathmandupost.com/climate-environment/2024/08/18/aerial-inspection-ties-thame-flood-to-glacial-lake-outburst)
* **Sept 2024:**
  * [DHM sitrep](https://dhm.gov.np/uploads/dhm/downloads/Situational_Report_on_Extreme_Precipitation_and_Flooding_Event_of_27-29_September_2024.pdf)
  * [BIPAD API](https://bipadportal.gov.np/api/v1/incident/)
  * [Wikipedia](https://en.wikipedia.org/wiki/2024_Nepal_floods)
  * [Onlinekhabar](https://english.onlinekhabar.com/228-die-in-recent-natural-disaster-home-ministry.html)
* **Rasuwa 2025:**
  * [NDRRMA sitrep #1](https://www.dpnet.org.np/resource-detail/2197)
  * [KP](https://kathmandupost.com/national/2025/07/08/18-missing-after-flood-hits-rasuwagadhi-border-point)
  * [Zhang et al. 2026](https://link.springer.com/article/10.1007/s11069-026-08081-1)
  * [Xu et al. EGUsphere](https://egusphere.copernicus.org/preprints/2026/egusphere-2026-4065/egusphere-2026-4065.pdf)
  * [Nepali Times](https://nepalitimes.com/rasuwa-flood-likely-a-glof)
* **Oct 2025 Ilam:**
  * [Onlinekhabar: 52 dead](https://english.onlinekhabar.com/death-toll-52-across-nepal.html)
  * [Onlinekhabar: Ilam](https://english.onlinekhabar.com/17-killed-in-landslides-in-ilam.html)
  * BIPAD
* **Simaltal 2024:**
  * [KP](https://kathmandupost.com/province-no-3/2024/07/12/landslide-sweeps-away-two-buses-kills-one-on-narayanghat-mugling-road-section)
  * [KP 2026-01-13](https://kathmandupost.com/national/2026/01/13/passenger-bus-missing-in-chitwan-landslide-found-after-18-months)
  * [Republica](https://myrepublica.nagariknetwork.com/news/bus-recovered-in-trishuli-confirmed-as-ganapati-deluxe-swept-away-in-simalt-31-87.html)
* **June 2023 east:**
  * [KP](https://kathmandupost.com/province-no-1/2023/06/20/continued-rain-hampers-rescue-efforts-in-east-nepal)
  * [Himalayan Times (IPPAN losses)](https://thehimalayantimes.com/business/hydropower-sector-incurred-losses-of-rs-84-billion-to-recent-disaster-ippan)
  * [Rising Nepal](https://risingnepaldaily.com/news/29007)
* **2026 Rasuwa–Gyirong:**
  * [ICIMOD](https://www.icimod.org/kyirong-rasuwa-flood-2026-nepal-china-border/)
  * [Acharya & Paudel preprint](https://doi.org/10.31223/X5HN5H) and [data](https://doi.org/10.5281/zenodo.22679444)
  * [NDRRMA SitRep #01](https://ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf)
  * [KP, how the flood unfolded](https://kathmandupost.com/national/2026/08/27/how-the-bhotekoshi-flood-unfolded-over-10-hours)
  * [Wikipedia](https://en.wikipedia.org/wiki/2026_Nepal%E2%80%93Tibet_floods)
  * [USGS](https://earthquake.usgs.gov/earthquakes/eventpage/us7000tbwb)
  * [Copernicus EMSR927](https://mapping.emergency.copernicus.eu/activations/EMSR927/)
* **2026 other events:**
  * [KP 15 Aug 2026](https://kathmandupost.com/national/2026/08/15/monsoon-disasters-leave-85-dead-as-rains-continue)
  * [KP, Rolpa](https://kathmandupost.com/province-no-5/2026/08/14/10-dead-3-missing-as-landslide-sweeps-settlement-in-rolpa)
  * [KP, Kimrong](https://kathmandupost.com/gandaki-province/2026/09/09/water-flow-returns-to-normal-in-kaski-river-after-temporary-blockage)
  * [KP, Melamchi intake](https://kathmandupost.com/valley/2026/07/03/melamchi-water-supply-halted-after-flood-damages-temporary-intake-dam)
* **2025 season:**
  * [DHM seasonal summary](https://dhm.gov.np/uploads/dhm/climateService/Monsoon_seasonal_2025.pdf)
  * [Rising Nepal (NDRRMA totals)](https://risingnepaldaily.com/news/70840)
