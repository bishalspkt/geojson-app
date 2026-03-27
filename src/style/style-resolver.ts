import { Feature } from 'geojson';
import { DEFAULTS } from './style-defaults';
import { getMarkerImageId } from './marker-icons';

/**
 * Resolves MapLibre paint/layout properties for point features.
 * Uses data-driven expressions when any feature has simplestyle properties;
 * falls back to static defaults otherwise.
 */
export function resolvePointPaint(features: Feature[]) {
  const hasCustomColors = features.some(f => f.properties?.['marker-color']);
  const hasCustomSizes = features.some(f => f.properties?.['marker-size']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colorExpr: any = hasCustomColors
    ? ['coalesce', ['get', 'marker-color'], DEFAULTS.point.color]
    : DEFAULTS.point.color;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const radiusExpr: any = hasCustomSizes
    ? ['match', ['get', 'marker-size'],
        'small', 4,
        'large', 12,
        /* default */ 8]
    : ['interpolate', ['linear'], ['zoom'],
        DEFAULTS.point.radius.baseZoom, DEFAULTS.point.radius.baseSize,
        DEFAULTS.point.radius.maxZoom, DEFAULTS.point.radius.maxSize];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glowRadiusExpr: any = hasCustomSizes
    ? ['match', ['get', 'marker-size'], 'small', 8, 'large', 20, 16]
    : ['interpolate', ['linear'], ['zoom'],
        DEFAULTS.point.glowRadius.baseZoom, DEFAULTS.point.glowRadius.baseSize,
        DEFAULTS.point.glowRadius.maxZoom, DEFAULTS.point.glowRadius.maxSize];

  const hasSymbols = features.some(f => f.properties?.['marker-symbol']);

  // Build a match expression that maps each marker-symbol value to its Maki image ID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let symbolLayout: Record<string, any> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let symbolPaint: Record<string, any> | null = null;

  if (hasSymbols) {
    const symbolNames = new Set<string>();
    for (const f of features) {
      const sym = f.properties?.['marker-symbol'];
      if (typeof sym === 'string' && sym.length > 0) symbolNames.add(sym);
    }

    // Build ['match', ['get', 'marker-symbol'], 'mountain', 'maki-mountain', ..., '']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iconImageExpr: any[] = ['match', ['get', 'marker-symbol']];
    for (const name of symbolNames) {
      iconImageExpr.push(name, getMarkerImageId(name));
    }
    iconImageExpr.push(''); // fallback — no icon

    symbolLayout = {
      'icon-image': iconImageExpr,
      'icon-size': hasCustomSizes
        ? ['match', ['get', 'marker-size'], 'small', 0.8, 'large', 1.6, 1.2]
        : 1.2,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    };

    symbolPaint = {
      'icon-color': colorExpr,
      'icon-halo-color': '#ffffff',
      'icon-halo-width': 1,
    };
  }

  return {
    mainPaint: {
      'circle-radius': radiusExpr,
      'circle-color': colorExpr,
      'circle-stroke-color': DEFAULTS.point.strokeColor,
      'circle-stroke-width': 2,
    },
    glowPaint: {
      'circle-radius': glowRadiusExpr,
      'circle-color': colorExpr,
      'circle-opacity': 0.1,
    },
    symbolLayout,
    symbolPaint,
    hasSymbols,
  };
}

/**
 * Resolves MapLibre paint/layout properties for line features.
 */
export function resolveLinePaint(features: Feature[]) {
  const hasStroke = features.some(f => f.properties?.['stroke']);
  const hasWidth = features.some(f => f.properties?.['stroke-width']);
  const hasOpacity = features.some(f => f.properties?.['stroke-opacity']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colorExpr: any = hasStroke
    ? ['coalesce', ['get', 'stroke'], DEFAULTS.line.color]
    : DEFAULTS.line.color;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widthExpr: any = hasWidth
    ? ['coalesce', ['get', 'stroke-width'], 2.5]
    : ['interpolate', ['linear'], ['zoom'],
        DEFAULTS.line.width.baseZoom, DEFAULTS.line.width.baseSize,
        DEFAULTS.line.width.maxZoom, DEFAULTS.line.width.maxSize];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opacityExpr: any = hasOpacity
    ? ['coalesce', ['get', 'stroke-opacity'], DEFAULTS.line.opacity]
    : DEFAULTS.line.opacity;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const casingWidthExpr: any = hasWidth
    ? ['+', ['coalesce', ['get', 'stroke-width'], 2.5], 2]
    : ['interpolate', ['linear'], ['zoom'],
        DEFAULTS.line.casingWidth.baseZoom, DEFAULTS.line.casingWidth.baseSize,
        DEFAULTS.line.casingWidth.maxZoom, DEFAULTS.line.casingWidth.maxSize];

  const layout = { 'line-cap': 'round' as const, 'line-join': 'round' as const };

  return {
    mainPaint: { 'line-color': colorExpr, 'line-width': widthExpr, 'line-opacity': opacityExpr },
    mainLayout: layout,
    casingPaint: {
      'line-color': DEFAULTS.line.casingColor,
      'line-width': casingWidthExpr,
      'line-opacity': DEFAULTS.line.casingOpacity,
    },
    casingLayout: layout,
  };
}

/**
 * Resolves MapLibre paint/layout properties for polygon features.
 */
export function resolvePolygonPaint(features: Feature[]) {
  const hasFill = features.some(f => f.properties?.['fill']);
  const hasFillOpacity = features.some(f => f.properties?.['fill-opacity']);
  const hasStroke = features.some(f => f.properties?.['stroke']);
  const hasStrokeWidth = features.some(f => f.properties?.['stroke-width']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fillColorExpr: any = hasFill
    ? ['coalesce', ['get', 'fill'], DEFAULTS.polygon.fillColor]
    : DEFAULTS.polygon.fillColor;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fillOpacityExpr: any = hasFillOpacity
    ? ['case',
        ['boolean', ['feature-state', 'hover'], false],
        ['min', ['+', ['coalesce', ['get', 'fill-opacity'], DEFAULTS.polygon.fillOpacity], 0.15], 1],
        ['coalesce', ['get', 'fill-opacity'], DEFAULTS.polygon.fillOpacity],
      ]
    : ['case',
        ['boolean', ['feature-state', 'hover'], false],
        DEFAULTS.polygon.hoverFillOpacity,
        DEFAULTS.polygon.fillOpacity,
      ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outlineColorExpr: any = hasStroke
    ? ['coalesce', ['get', 'stroke'], DEFAULTS.polygon.outlineColor]
    : DEFAULTS.polygon.outlineColor;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outlineWidthExpr: any = hasStrokeWidth
    ? ['coalesce', ['get', 'stroke-width'], 2]
    : ['interpolate', ['linear'], ['zoom'],
        DEFAULTS.polygon.outlineWidth.baseZoom, DEFAULTS.polygon.outlineWidth.baseSize,
        DEFAULTS.polygon.outlineWidth.maxZoom, DEFAULTS.polygon.outlineWidth.maxSize];

  return {
    fillPaint: { 'fill-color': fillColorExpr, 'fill-opacity': fillOpacityExpr },
    outlinePaint: {
      'line-color': outlineColorExpr,
      'line-width': outlineWidthExpr,
      'line-opacity': ['case',
        ['boolean', ['feature-state', 'hover'], false], 1.0,
        DEFAULTS.polygon.outlineOpacity,
      ],
    },
    outlineLayout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
  };
}
