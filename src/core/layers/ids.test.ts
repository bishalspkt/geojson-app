import { describe, expect, it } from 'vitest';
import { DataLayer } from '@/types';
import {
  allDataLayerIds,
  dataLayerIds,
  dataSourceId,
  imageryLayerId,
  imagerySourceId,
  interactiveLayerIds,
  isAppLayerId,
  pulseIds,
  sanitizeExternalLayerId,
  sysId,
  trackIds,
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
      label: 'gj:L1:polygon:label',
      heat: 'gj:L1:polygon:heat',
    });
    expect(sysId('highlight')).toBe('sys:highlight');
  });

  it('mints timeline pulse/track ids inside the layer namespace', () => {
    expect(pulseIds('L3').source).toBe('gj:L3:pulse');
    expect(trackIds('L3')).toMatchObject({ source: 'gj:L3:track', head: 'gj:L3:track:head' });
  });

  it('mints img: ids for imagery and recognizes app-owned ids', () => {
    expect(imagerySourceId('R1')).toBe('img:R1');
    expect(imageryLayerId('R1')).toBe('img:R1:raster');
    expect(isAppLayerId('img:R1:raster')).toBe(true);
    expect(isAppLayerId('sys:hillshade')).toBe(true);
    expect(isAppLayerId('roads_highway')).toBe(false);
  });

  it('allDataLayerIds lists fills < lines < markers < labels (restack order)', () => {
    const ids = allDataLayerIds('L2');
    const at = (id: string) => ids.indexOf(id);
    expect(at('gj:L2:line:casing')).toBeLessThan(at('gj:L2:line:main'));
    expect(at('gj:L2:point:glow')).toBeLessThan(at('gj:L2:point:main'));
    expect(at('gj:L2:polygon:main')).toBeLessThan(at('gj:L2:line:main'));
    expect(at('gj:L2:track:trail')).toBeLessThan(at('gj:L2:point:main'));
    expect(at('gj:L2:point:main')).toBeLessThan(at('gj:L2:point:label'));
  });

  it('allDataLayerIds covers every bucket/role for cleanup', () => {
    const ids = allDataLayerIds('L2');
    expect(ids).toHaveLength(3 * 7 + 2 + 4);
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
