import { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { layers as protomapsLayers, namedFlavor } from '@protomaps/basemaps';
import { MapTheme } from '@/types';

/** Default tile endpoint — a PMTiles archive behind a Cloudflare Worker. */
export const DEFAULT_TILES_URL = 'https://tiles.geojson.app/20260308.json';

export const ATTRIBUTION =
  '<a href="https://protomaps.com" target="_blank">Protomaps</a> © <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>';

export interface BasemapOptions {
  /** TileJSON url for the vector source. Swap to bring your own tiles. */
  tilesUrl?: string;
  lang?: string;
}

/**
 * Readability tweaks over the stock Protomaps flavor: stronger admin
 * boundaries and population-aware city label sizing.
 */
function customizeBaseLayers(baseLayers: LayerSpecification[], theme: MapTheme): LayerSpecification[] {
  const isDark = theme === 'dark' || theme === 'black';
  const boundaryColor = isDark ? '#9ca3af' : '#6b7280';
  const subBoundaryColor = isDark ? '#6b7280' : '#9ca3af';
  const cityColor = isDark ? '#d1d5db' : '#374151';
  const haloColor = isDark ? '#1f2937' : '#ffffff';
  const countryColor = isDark ? '#9ca3af' : '#4b5563';
  const regionColor = '#6b7280';

  return baseLayers.map((layer) => {
    if (layer.id === 'boundaries_country' && layer.type === 'line') {
      return {
        ...layer,
        paint: {
          ...layer.paint,
          'line-color': boundaryColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.8, 4, 1.5, 8, 2],
          'line-opacity': 0.8,
        },
      };
    }

    if (layer.id === 'boundaries' && layer.type === 'line') {
      return {
        ...layer,
        paint: {
          ...layer.paint,
          'line-color': subBoundaryColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.4, 6, 0.8, 10, 1.2],
          'line-opacity': 0.6,
        },
      };
    }

    if (layer.id === 'places_locality' && layer.type === 'symbol') {
      return {
        ...layer,
        layout: {
          ...layer.layout,
          'text-size': ['interpolate', ['linear'], ['zoom'],
            2, ['step', ['get', 'population_rank'], 9, 12, 13],
            4, ['step', ['get', 'population_rank'], 10, 10, 15],
            6, ['step', ['get', 'population_rank'], 11, 8, 17],
            8, ['step', ['get', 'population_rank'], 12, 6, 19],
            12, ['step', ['get', 'population_rank'], 13, 4, 22],
          ],
        },
        paint: { ...layer.paint, 'text-color': cityColor, 'text-halo-color': haloColor, 'text-halo-width': 1.5 },
      };
    }

    if (layer.id === 'places_country' && layer.type === 'symbol') {
      return {
        ...layer,
        paint: { ...layer.paint, 'text-color': countryColor, 'text-halo-color': haloColor, 'text-halo-width': 2 },
      };
    }

    if (layer.id === 'places_region' && layer.type === 'symbol') {
      return {
        ...layer,
        paint: { ...layer.paint, 'text-color': regionColor, 'text-halo-color': haloColor, 'text-halo-width': 1.5 },
      };
    }

    return layer;
  });
}

/** Pure function: (theme, options) → complete MapLibre style. */
export function buildBasemapStyle(theme: MapTheme, options: BasemapOptions = {}): StyleSpecification {
  const flavor = namedFlavor(theme);
  const baseLayers = customizeBaseLayers(
    protomapsLayers('protomaps', flavor, { lang: options.lang ?? 'en' }) as LayerSpecification[],
    theme,
  );

  return {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${theme}`,
    sources: {
      protomaps: {
        type: 'vector',
        url: options.tilesUrl ?? DEFAULT_TILES_URL,
        attribution: ATTRIBUTION,
      },
    },
    layers: baseLayers,
  };
}
