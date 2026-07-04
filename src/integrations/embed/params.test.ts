import { describe, expect, it } from 'vitest';
import { DEFAULT_CENTER, DEFAULT_ZOOM, parseEmbedParams } from './params';

describe('parseEmbedParams', () => {
  it('returns app-mode defaults without ?embed', () => {
    const config = parseEmbedParams('');
    expect(config.enabled).toBe(false);
    expect(config.center).toEqual(DEFAULT_CENTER);
    expect(config.zoom).toBe(DEFAULT_ZOOM);
    expect(config.chrome).toBe('full');
    expect(config.interactive).toBe(true);
  });

  it('honors ?geojson on the main app (shareable links)', () => {
    const config = parseEmbedParams('?geojson=https://example.com/data.geojson');
    expect(config.enabled).toBe(false);
    expect(config.geojsonUrl).toBe('https://example.com/data.geojson');
  });

  it('parses a full embed parameter set', () => {
    const config = parseEmbedParams(
      '?embed=1&center=85.3,27.7&zoom=11&theme=dark&projection=globe&interactive=false&chrome=none&geojson=https://x.test/d.geojson',
    );
    expect(config).toMatchObject({
      enabled: true,
      center: [85.3, 27.7],
      zoom: 11,
      theme: 'dark',
      projection: 'globe',
      interactive: false,
      chrome: 'none',
      geojsonUrl: 'https://x.test/d.geojson',
    });
  });

  it('falls back to defaults for invalid values', () => {
    const config = parseEmbedParams('?embed=1&center=not,numbers&zoom=99&theme=neon&projection=cube');
    expect(config.center).toEqual(DEFAULT_CENTER);
    expect(config.zoom).toBe(DEFAULT_ZOOM);
    expect(config.theme).toBe('light');
    expect(config.projection).toBe('mercator');
  });

  it('maps legacy controls=true to chrome=full and keeps the alias in sync', () => {
    const config = parseEmbedParams('?embed=1&controls=true');
    expect(config.chrome).toBe('full');
    expect(config.controls).toBe(true);

    const explicit = parseEmbedParams('?embed=1&controls=true&chrome=minimal');
    expect(explicit.chrome).toBe('minimal'); // chrome wins over legacy flag
    expect(explicit.controls).toBe(false);
  });

  it('defaults attribution to compact only for chrome=none', () => {
    expect(parseEmbedParams('?embed=1').attribution).toBe('visible');
    expect(parseEmbedParams('?embed=1&chrome=none').attribution).toBe('compact');
    expect(parseEmbedParams('?embed=1&chrome=none&attribution=visible').attribution).toBe('visible');
  });
});
