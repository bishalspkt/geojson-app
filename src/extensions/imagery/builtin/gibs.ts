import type { ImageryInput } from '@/state/imagery-store';
import { registerImageryPreset } from '../registry';

/**
 * NASA GIBS (Global Imagery Browse Services): keyless, CORS-enabled WMTS for
 * hundreds of daily Earth-observation products — imagery comes straight from
 * NASA, so geojson.app pays nothing to serve it.
 */
export const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
export const GIBS_ATTRIBUTION =
  '<a href="https://earthdata.nasa.gov/gibs" target="_blank">NASA EOSDIS GIBS</a>';

export interface GibsLayerSpec {
  layer: string;
  matrixSet: string;
  ext: 'jpg' | 'png';
  maxzoom: number;
}

/** WMTS REST template for a GIBS layer on a given date (or `{time}`). */
export function gibsTiles(spec: GibsLayerSpec, time: string): string[] {
  return [`${GIBS_BASE}/${spec.layer}/default/${time}/${spec.matrixSet}/{z}/{y}/{x}.${spec.ext}`];
}

/** Today minus n days, as YYYY-MM-DD (GIBS daily products lag by ~1 day). */
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function dailyPreset(
  id: string,
  name: string,
  description: string,
  spec: GibsLayerSpec,
  extra: Partial<ImageryInput> = {},
) {
  registerImageryPreset({
    id,
    name,
    description,
    group: 'NASA satellites (daily)',
    dated: { default: daysAgo(2), min: '2000-02-24' },
    create: (date) => {
      const day = date ?? daysAgo(2);
      return {
        name: `${name} · ${day}`,
        source: { type: 'xyz', tiles: gibsTiles(spec, day), maxzoom: spec.maxzoom, tileSize: 256 },
        attribution: GIBS_ATTRIBUTION,
        origin: 'upload',
        description,
        ...extra,
      };
    },
  });
}

const IMERG_LEGEND = {
  kind: 'gradient' as const,
  title: 'Rain rate (mm/h)',
  stops: [
    { color: '#00764e', label: '0.1' },
    { color: '#4ec300' },
    { color: '#c3e400', label: '1' },
    { color: '#ffb006' },
    { color: '#ff4233', label: '5' },
    { color: '#e70000' },
    { color: '#9c0000', label: '20+' },
  ],
};

export function registerGibsPresets(): void {
  dailyPreset(
    'gibs-modis-terra',
    'MODIS Terra true colour',
    '250 m, daily since 2000 — regional floods, sediment plumes, smoke',
    { layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', matrixSet: 'GoogleMapsCompatible_Level9', ext: 'jpg', maxzoom: 9 },
  );
  dailyPreset(
    'gibs-viirs-snpp',
    'VIIRS SNPP true colour',
    '375 m, daily since 2015',
    { layer: 'VIIRS_SNPP_CorrectedReflectance_TrueColor', matrixSet: 'GoogleMapsCompatible_Level9', ext: 'jpg', maxzoom: 9 },
  );
  // Harmonized Landsat–Sentinel-2: 30 m, but only on overpass days (blank otherwise).
  dailyPreset(
    'gibs-hls-s30',
    'HLS Sentinel-2 (30 m)',
    '30 m true colour on Sentinel-2 overpass days (every ~5 days; blank in between)',
    { layer: 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance', matrixSet: 'GoogleMapsCompatible_Level12', ext: 'png', maxzoom: 12 },
  );
  dailyPreset(
    'gibs-opera-dswx-s1',
    'OPERA surface water (Sentinel-1 radar)',
    '30 m water / flooded vegetation from radar — sees through cloud (since Aug 2024)',
    { layer: 'OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1', matrixSet: 'GoogleMapsCompatible_Level12', ext: 'png', maxzoom: 12 },
    { opacity: 0.85, placement: 'top' },
  );
  // Rain that follows the timeline: {time} resolves to the half-hour slot.
  registerImageryPreset({
    id: 'gibs-imerg-30min',
    name: 'GPM IMERG rain rate (animated)',
    description: 'Half-hourly satellite rainfall estimate — follows the timeline (10 km)',
    group: 'NASA rainfall',
    dated: { default: daysAgo(3), min: '2000-06-01' },
    create: (date) => ({
      name: 'GPM IMERG rain rate (half-hourly)',
      source: {
        type: 'xyz',
        tiles: gibsTiles({ layer: 'IMERG_Precipitation_Rate_30min', matrixSet: 'GoogleMapsCompatible_Level6', ext: 'png', maxzoom: 6 }, '{time}'),
        maxzoom: 6,
      },
      time: { format: 'datetime', stepMinutes: 30, default: `${date ?? daysAgo(3)}T12:00:00Z` },
      attribution: GIBS_ATTRIBUTION,
      opacity: 0.8,
      placement: 'top',
      legend: IMERG_LEGEND,
      description: 'NASA GPM IMERG precipitation rate, 30-minute steps; enable the timeline to animate',
    }),
  });
}
