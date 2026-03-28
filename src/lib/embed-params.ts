import { MapTheme, MapProjection } from '@/types';

export interface EmbedConfig {
  enabled: boolean;
  center: [number, number]; // [lng, lat]
  zoom: number;
  theme: MapTheme;
  projection: MapProjection;
  geojsonUrl: string | null;
  interactive: boolean;
  controls: boolean;
}

const VALID_THEMES: MapTheme[] = ['light', 'dark', 'white', 'grayscale', 'black'];
const VALID_PROJECTIONS: MapProjection[] = ['mercator', 'globe'];

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

  // Parse controls (default false in embed mode)
  const controlsParam = params.get('controls');
  const controls = controlsParam === 'true' || controlsParam === '1';

  return {
    enabled,
    center,
    zoom,
    theme,
    projection,
    geojsonUrl,
    interactive,
    controls,
  };
}
