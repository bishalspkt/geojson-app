import { MAP_THEMES, MapProjection, MapTheme } from '@/types';

export type EmbedChrome = 'full' | 'minimal' | 'none';
export type EmbedAttribution = 'visible' | 'compact';

export interface EmbedConfig {
  enabled: boolean;
  center: [number, number]; // [lng, lat]
  zoom: number;
  theme: MapTheme;
  projection: MapProjection;
  geojsonUrl: string | null;
  interactive: boolean;
  /** Legacy alias: true ≡ chrome === 'full'. */
  controls: boolean;
  chrome: EmbedChrome;
  attribution: EmbedAttribution;
}

const VALID_PROJECTIONS: MapProjection[] = ['mercator', 'globe'];
const VALID_CHROME: EmbedChrome[] = ['full', 'minimal', 'none'];
const VALID_ATTRIBUTION: EmbedAttribution[] = ['visible', 'compact'];

export const DEFAULT_CENTER: [number, number] = [105, -5];
export const DEFAULT_ZOOM = 2.8;

/**
 * Parse the URL parameters accepted on `https://geojson.app/?embed=1&…`.
 * Parameter names are a frozen public contract (docs/developers-api.md).
 * `geojson` is also honored outside embed mode for shareable links.
 */
export function parseEmbedParams(search: string = window.location.search): EmbedConfig {
  const params = new URLSearchParams(search);
  const enabled = params.has('embed');

  const geojsonUrl = params.get('geojson') || null;

  if (!enabled) {
    return {
      enabled: false,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      theme: 'light',
      projection: 'mercator',
      geojsonUrl,
      interactive: true,
      controls: true,
      chrome: 'full',
      attribution: 'visible',
    };
  }

  let center = DEFAULT_CENTER;
  const centerParam = params.get('center');
  if (centerParam) {
    const parts = centerParam.split(',').map(Number);
    if (parts.length === 2 && parts.every(isFinite)) {
      center = [parts[0], parts[1]];
    }
  }

  let zoom = DEFAULT_ZOOM;
  const zoomParam = params.get('zoom');
  if (zoomParam) {
    const z = Number(zoomParam);
    if (isFinite(z) && z >= 0 && z <= 22) zoom = z;
  }

  let theme: MapTheme = 'light';
  const themeParam = params.get('theme');
  if (themeParam && MAP_THEMES.includes(themeParam as MapTheme)) {
    theme = themeParam as MapTheme;
  }

  let projection: MapProjection = 'mercator';
  const projParam = params.get('projection');
  if (projParam && VALID_PROJECTIONS.includes(projParam as MapProjection)) {
    projection = projParam as MapProjection;
  }

  const interactiveParam = params.get('interactive');
  const interactive = interactiveParam !== 'false' && interactiveParam !== '0';

  const controlsParam = params.get('controls');
  const legacyControls = controlsParam === 'true' || controlsParam === '1';

  const chromeParam = params.get('chrome');
  let chrome: EmbedChrome;
  if (chromeParam && VALID_CHROME.includes(chromeParam as EmbedChrome)) {
    chrome = chromeParam as EmbedChrome;
  } else {
    chrome = legacyControls ? 'full' : 'minimal';
  }
  const controls = chrome === 'full';

  let attribution: EmbedAttribution = 'visible';
  const attrParam = params.get('attribution');
  if (attrParam && VALID_ATTRIBUTION.includes(attrParam as EmbedAttribution)) {
    attribution = attrParam as EmbedAttribution;
  } else if (chrome === 'none') {
    attribution = 'compact';
  }

  return {
    enabled,
    center,
    zoom,
    theme,
    projection,
    geojsonUrl,
    interactive,
    controls,
    chrome,
    attribution,
  };
}
