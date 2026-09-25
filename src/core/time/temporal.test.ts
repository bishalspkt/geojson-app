import { describe, expect, it } from 'vitest';
import type { Feature } from 'geojson';
import {
  detectTemporalConfig,
  featureInterval,
  imageryTimeParam,
  isActiveAt,
  layerTimeExtent,
  parseTime,
  partialTrack,
  resolveTimeTemplate,
  trackParts,
  unionExtents,
} from './temporal';
import { formatDuration, formatInstant, granularityFor } from './format';

const pt = (props: Record<string, unknown>): Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [85.3, 27.7] },
  properties: props,
});

const line = (coords: number[][], props: Record<string, unknown>): Feature => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: coords },
  properties: props,
});

describe('parseTime', () => {
  it('parses ISO dates, date-times, and space-separated date-times', () => {
    expect(parseTime('2024-09-28')).toBe(Date.UTC(2024, 8, 28));
    expect(parseTime('2024-09-28T06:15:00Z')).toBe(Date.UTC(2024, 8, 28, 6, 15));
    expect(parseTime('2024-09-28T12:00:00+05:45')).toBe(Date.UTC(2024, 8, 28, 6, 15));
    expect(parseTime('2024-09-28 06:15:00Z')).toBe(Date.UTC(2024, 8, 28, 6, 15));
  });

  it('parses years, year-months, epoch ms and epoch seconds', () => {
    expect(parseTime('2021')).toBe(Date.UTC(2021, 0, 1));
    expect(parseTime(2021)).toBe(Date.UTC(2021, 0, 1));
    expect(parseTime('2021-06')).toBe(Date.UTC(2021, 5, 1));
    expect(parseTime(1_727_500_000_000)).toBe(1_727_500_000_000);
    expect(parseTime(1_727_500_000)).toBe(1_727_500_000_000);
  });

  it('rejects implausible values', () => {
    expect(parseTime('12')).toBeNull();
    expect(parseTime('hello')).toBeNull();
    expect(parseTime('2021-13')).toBeNull();
    expect(parseTime(42)).toBeNull();
    expect(parseTime(NaN)).toBeNull();
    expect(parseTime(null)).toBeNull();
    expect(parseTime({})).toBeNull();
  });
});

describe('feature intervals and extents', () => {
  it('uses start/end fields, falling back to an instant', () => {
    const cfg = { startField: 'start', endField: 'end' };
    expect(featureInterval(pt({ start: '2024-01-01', end: '2024-01-03' }), cfg)).toEqual([
      Date.UTC(2024, 0, 1),
      Date.UTC(2024, 0, 3),
    ]);
    expect(featureInterval(pt({ start: '2024-01-01' }), cfg)).toEqual([
      Date.UTC(2024, 0, 1),
      Date.UTC(2024, 0, 1),
    ]);
    expect(featureInterval(pt({}), cfg)).toBeNull();
  });

  it('derives track intervals from coordTimes', () => {
    const f = line([[0, 0], [1, 0], [2, 0]], {
      coordTimes: ['2024-08-16T14:00:00Z', '2024-08-16T14:10:00Z', '2024-08-16T14:40:00Z'],
    });
    expect(featureInterval(f, { coordTimesField: 'coordTimes' })).toEqual([
      Date.UTC(2024, 7, 16, 14, 0),
      Date.UTC(2024, 7, 16, 14, 40),
    ]);
  });

  it('computes layer extents and unions', () => {
    const features = [pt({ t: '2020-01-01' }), pt({ t: '2022-06-01' }), pt({})];
    const extent = layerTimeExtent({ features, temporal: { startField: 't' } });
    expect(extent).toEqual([Date.UTC(2020, 0, 1), Date.UTC(2022, 5, 1)]);
    expect(layerTimeExtent({ features, temporal: undefined })).toBeNull();
    expect(unionExtents([null, [5, 10], [1, 7]])).toEqual([1, 10]);
    expect(unionExtents([null])).toBeNull();
  });

  it('isActiveAt handles cumulative and sliding windows', () => {
    expect(isActiveAt([10, 10], 5, null)).toBe(false);
    expect(isActiveAt([10, 10], 50, null)).toBe(true);
    expect(isActiveAt([10, 10], 50, 20)).toBe(false);
    expect(isActiveAt([10, 40], 50, 20)).toBe(true);
  });
});

describe('detectTemporalConfig', () => {
  it('finds common time properties case-insensitively', () => {
    const cfg = detectTemporalConfig([pt({ Date: '2024-09-27' }), pt({ Date: '2024-09-28' })]);
    expect(cfg).toEqual({ startField: 'Date' });
  });

  it('pairs start and end fields', () => {
    const cfg = detectTemporalConfig([
      pt({ start: '2024-01-01', end: '2024-02-01' }),
      pt({ start: '2024-03-01', end: '2024-04-01' }),
    ]);
    expect(cfg).toEqual({ startField: 'start', endField: 'end' });
  });

  it('detects coordTimes tracks', () => {
    const cfg = detectTemporalConfig([
      line([[0, 0], [1, 1]], { coordTimes: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'] }),
    ]);
    expect(cfg).toEqual({ coordTimesField: 'coordTimes' });
  });

  it('ignores data without usable or varying time', () => {
    expect(detectTemporalConfig([pt({ name: 'a' }), pt({ name: 'b' })])).toBeUndefined();
    expect(detectTemporalConfig([pt({ date: '2024-01-01' }), pt({ date: '2024-01-01' })])).toBeUndefined();
    expect(detectTemporalConfig([pt({ time: 'n/a' }), pt({ time: 'soon' })])).toBeUndefined();
    expect(detectTemporalConfig([])).toBeUndefined();
  });
});

describe('tracks', () => {
  const f = line([[0, 0], [10, 0], [10, 10]], { coordTimes: [0, 1e12, 3e12].map((ms) => new Date(ms).toISOString()) });

  it('trackParts validates alignment', () => {
    expect(trackParts(f, 'coordTimes')?.[0].times).toEqual([0, 1e12, 3e12]);
    expect(trackParts(line([[0, 0], [1, 1]], { coordTimes: ['2024-01-01'] }), 'coordTimes')).toBeNull();
    expect(trackParts(pt({ coordTimes: [] }), 'coordTimes')).toBeNull();
  });

  it('trackParts supports MultiLineString and enforces monotonic times', () => {
    const multi: Feature = {
      type: 'Feature',
      geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [1, 0]], [[1, 0], [2, 0]]] },
      properties: { times: [['2024-01-02', '2024-01-01'], ['2024-01-03', '2024-01-04']] },
    };
    const parts = trackParts(multi, 'times')!;
    expect(parts).toHaveLength(2);
    expect(parts[0].times[1]).toBe(parts[0].times[0]); // clamped non-decreasing
  });

  it('partialTrack interpolates the head', () => {
    const part = trackParts(f, 'coordTimes')![0];
    expect(partialTrack(part, -1)).toBeNull();
    const mid = partialTrack(part, 0.5e12)!;
    expect(mid.head).toEqual([5, 0]);
    expect(mid.coords).toEqual([[0, 0], [5, 0]]);
    expect(mid.done).toBe(false);
    const later = partialTrack(part, 2e12)!;
    expect(later.coords).toEqual([[0, 0], [10, 0], [10, 5]]);
    const end = partialTrack(part, 5e12)!;
    expect(end.done).toBe(true);
    expect(end.coords).toHaveLength(3);
  });
});

describe('imagery time templates', () => {
  it('quantizes date-times to the step and formats per config', () => {
    const t = Date.UTC(2024, 8, 27, 13, 47);
    expect(imageryTimeParam({ format: 'datetime', default: '2024-09-27' }, t)).toBe('2024-09-27T13:30:00Z');
    expect(imageryTimeParam({ format: 'date', default: '2024-09-27' }, t)).toBe('2024-09-27');
    expect(imageryTimeParam({ format: 'month', default: '2024-09-27' }, t)).toBe('2024-09');
    expect(imageryTimeParam({ format: 'datetime', stepMinutes: 180, default: '2024-09-27' }, t)).toBe(
      '2024-09-27T12:00:00Z',
    );
  });

  it('falls back to the default and clamps to the range', () => {
    expect(imageryTimeParam({ format: 'date', default: '2024-10-05' }, null)).toBe('2024-10-05');
    expect(
      imageryTimeParam(
        { format: 'date', default: '2024-10-05', range: ['2024-09-01', '2024-09-30'] },
        Date.UTC(2025, 0, 1),
      ),
    ).toBe('2024-09-30');
  });

  it('substitutes {time} in every template', () => {
    expect(resolveTimeTemplate(['a/{time}/{z}', 'b/{time}'], '2024-01-01')).toEqual([
      'a/2024-01-01/{z}',
      'b/2024-01-01',
    ]);
    expect(resolveTimeTemplate(['a/{z}'], null)).toEqual(['a/{z}']);
  });
});

describe('format', () => {
  it('picks granularity from the span', () => {
    expect(granularityFor(10 * 365 * 86_400_000)).toBe('month');
    expect(granularityFor(30 * 86_400_000)).toBe('day');
    expect(granularityFor(3 * 3_600_000)).toBe('minute');
  });

  it('formats instants in a given zone', () => {
    const t = Date.UTC(2024, 8, 28, 0, 0);
    expect(formatInstant(t, 'day', 'UTC')).toBe('28 Sept 2024');
    expect(formatInstant(t, 'minute', 'Asia/Kathmandu')).toContain('05:45');
    // Unknown zones fall back instead of throwing.
    expect(() => formatInstant(t, 'day', 'Mars/Olympus')).not.toThrow();
  });

  it('formats durations compactly', () => {
    expect(formatDuration(30_000)).toBe('30 s');
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration(135 * 60_000)).toBe('2 h 15 min');
    expect(formatDuration(3 * 86_400_000)).toBe('3 days');
    expect(formatDuration(3 * 365.25 * 86_400_000)).toBe('3.0 yr');
  });
});
