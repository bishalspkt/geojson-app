import { describe, expect, it } from 'vitest';
import type { Feature } from 'geojson';
import { resolveLinePaint, resolvePolygonPaint } from './style-resolver';

const feature = (properties: Record<string, unknown>): Feature => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
});

describe('stroke-width: 0', () => {
  it('hides polygon outlines instead of falling back to the default width', () => {
    const { outlinePaint } = resolvePolygonPaint([feature({ fill: '#f00', 'stroke-width': 0 })]);
    expect(outlinePaint['line-width']).toEqual(['coalesce', ['get', 'stroke-width'], 2]);
  });

  it('is honoured for lines too', () => {
    const { mainPaint } = resolveLinePaint([feature({ 'stroke-width': 0 })]);
    expect(mainPaint['line-width']).toEqual(['coalesce', ['get', 'stroke-width'], 2.5]);
  });
});
