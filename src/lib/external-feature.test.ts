import { describe, expect, it } from 'vitest';
import { externalFeature, withoutInternalProperties } from './external-feature';

describe('externalFeature', () => {
  it('drops every _-prefixed property and keeps the rest', () => {
    const f = externalFeature({
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { name: 'A', _fid: 'L1/0', _t0: 5, _search_result: true, count: 3 },
    });
    expect(f).toEqual({ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: { name: 'A', count: 3 } });
  });

  it('tolerates missing properties', () => {
    expect(withoutInternalProperties(null)).toEqual({});
    expect(withoutInternalProperties(undefined)).toEqual({});
  });
});
