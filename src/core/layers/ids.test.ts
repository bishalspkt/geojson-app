import { describe, expect, it } from 'vitest';
import { DataLayer } from '@/types';
import {
  allDataLayerIds,
  dataLayerIds,
  dataSourceId,
  interactiveLayerIds,
  sanitizeExternalLayerId,
  sysId,
} from './ids';

const layer = (id: string): DataLayer => ({
  id,
  name: id,
  origin: 'upload',
  features: [],
  visible: true,
  featureSeq: 0,
});

describe('id namespaces', () => {
  it('mints gj: source and layer ids per bucket', () => {
    expect(dataSourceId('L1', 'point')).toBe('gj:L1:point');
    expect(dataLayerIds('L1', 'polygon')).toEqual({
      main: 'gj:L1:polygon:main',
      glow: 'gj:L1:polygon:glow',
      casing: 'gj:L1:polygon:casing',
      outline: 'gj:L1:polygon:outline',
      symbol: 'gj:L1:polygon:symbol',
    });
    expect(sysId('highlight')).toBe('sys:highlight');
  });

  it('allDataLayerIds covers every bucket/role for cleanup', () => {
    const ids = allDataLayerIds('L2');
    expect(ids).toHaveLength(3 * 5);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('gj:L2:'))).toBe(true);
  });

  it('interactiveLayerIds lists hit-testable layers for all data layers', () => {
    const ids = interactiveLayerIds([layer('L1'), layer('L2')]);
    expect(ids).toContain('gj:L1:polygon:main');
    expect(ids).toContain('gj:L2:point:symbol');
    expect(ids).toHaveLength(8);
  });
});

describe('sanitizeExternalLayerId', () => {
  it('prefixes and strips unsafe characters', () => {
    expect(sanitizeExternalLayerId('route')).toBe('sdk-route');
    expect(sanitizeExternalLayerId('my route/1')).toBe('sdk-my_route_1');
  });

  it('can never produce the reserved primary layer id', () => {
    // PRIMARY_LAYER_ID is 'sdk:primary'; ':' is not in the sanitizer's output alphabet.
    expect(sanitizeExternalLayerId('primary')).toBe('sdk-primary');
    expect(sanitizeExternalLayerId(':primary')).toBe('sdk-_primary');
    expect(sanitizeExternalLayerId('primary').includes(':')).toBe(false);
  });
});
