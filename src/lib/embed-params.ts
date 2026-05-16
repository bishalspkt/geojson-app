import { MapTheme, MapProjection } from '@/types';

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
  controls: boolean;
  chrome: EmbedChrome;
  attribution: EmbedAttribution;
}

const VALID_THEMES: MapTheme[] = ['light', 'dark', 'white', 'grayscale', 'black'];
const VALID_PROJECTIONS: MapProjection[] = ['mercator', 'globe'];
const VALID_CHROME: EmbedChrome[] = ['full', 'minimal', 'none'];
const VALID_ATTRIBUTION: EmbedAttribution[] = ['visible', 'compact'];

const DEFAULT_CENTER: [number, number] = [105, -5];
const DEFAULT_ZOOM = 2.8;

export function parseEmbedParams(): EmbedConfig {
  const params = new URLSearchParams(window.location.search);
  const enabled = params.has('embed');

  if (!enabled) {
    return {
      enabled: false,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      theme: 'light',
      projection: 'mercator',
      geojsonUrl: null,
      interactive: true,
      controls: true,
      chrome: 'full',
      attribution: 'visible',
    };
  }

  // Parse center: "lng,lat"
  let center = DEFAULT_CENTER;
  const centerParam = params.get('center');
  if (centerParam) {
    const parts = centerParam.split(',').map(Number);
    if (parts.length === 2 && parts.every(isFinite)) {
      center = [parts[0], parts[1]];
    }
  }

  // Parse zoom
  let zoom = DEFAULT_ZOOM;
  const zoomParam = params.get('zoom');
  if (zoomParam) {
    const z = Number(zoomParam);
    if (isFinite(z) && z >= 0 && z <= 22) {
      zoom = z;
    }
  }

  // Parse theme
  let theme: MapTheme = 'light';
  const themeParam = params.get('theme');
  if (themeParam && VALID_THEMES.includes(themeParam as MapTheme)) {
    theme = themeParam as MapTheme;
  }

  // Parse projection
  let projection: MapProjection = 'mercator';
  const projParam = params.get('projection');
  if (projParam && VALID_PROJECTIONS.includes(projParam as MapProjection)) {
    projection = projParam as MapProjection;
  }

  // Parse geojson URL
  const geojsonUrl = params.get('geojson') || null;

  // Parse interactive (default true)
  const interactiveParam = params.get('interactive');
  const interactive = interactiveParam !== 'false' && interactiveParam !== '0';

  // Parse legacy `controls` flag (default false in embed mode)
  const controlsParam = params.get('controls');
  const legacyControls = controlsParam === 'true' || controlsParam === '1';

  // Parse `chrome` — preferred over `controls`. Falls back to legacy mapping.
  const chromeParam = params.get('chrome');
  let chrome: EmbedChrome;
  if (chromeParam && VALID_CHROME.includes(chromeParam as EmbedChrome)) {
    chrome = chromeParam as EmbedChrome;
  } else {
    chrome = legacyControls ? 'full' : 'minimal';
  }
  // Keep `controls` synced with chrome so legacy consumers stay correct.
  const controls = chrome === 'full';

  // Parse attribution
  let attribution: EmbedAttribution = 'visible';
  const attrParam = params.get('attribution');
  if (attrParam && VALID_ATTRIBUTION.includes(attrParam as EmbedAttribution)) {
    attribution = attrParam as EmbedAttribution;
  } else if (chrome === 'none') {
    // Sensible default for headless: compact pill.
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
