/** Timeline label formatting. Pure; granularity adapts to the extent length. */

export type TimeGranularity = 'month' | 'day' | 'minute';

const DAY = 86_400_000;

export function granularityFor(spanMs: number): TimeGranularity {
  if (spanMs >= 2 * 365 * DAY) return 'month';
  if (spanMs >= 3 * DAY) return 'day';
  return 'minute';
}

const OPTIONS: Record<TimeGranularity, Intl.DateTimeFormatOptions> = {
  month: { year: 'numeric', month: 'short' },
  day: { year: 'numeric', month: 'short', day: 'numeric' },
  minute: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(granularity: TimeGranularity, timeZone: string | null, withZone: boolean): Intl.DateTimeFormat {
  const key = `${granularity}|${timeZone ?? ''}|${withZone}`;
  let f = formatters.get(key);
  if (!f) {
    const opts: Intl.DateTimeFormatOptions = { ...OPTIONS[granularity] };
    if (withZone) opts.timeZoneName = 'short';
    try {
      f = new Intl.DateTimeFormat('en-GB', timeZone ? { ...opts, timeZone } : opts);
    } catch {
      // Unknown IANA zone — fall back to the viewer's zone rather than throwing.
      f = new Intl.DateTimeFormat('en-GB', opts);
    }
    formatters.set(key, f);
  }
  return f;
}

/** Human label for an instant, e.g. "27 Sept 2024" or "16 Aug, 14:30 GMT+5:45". */
export function formatInstant(
  t: number,
  granularity: TimeGranularity,
  timeZone: string | null,
  opts: { withZone?: boolean } = {},
): string {
  return formatter(granularity, timeZone, opts.withZone ?? granularity === 'minute').format(new Date(t));
}

/** Compact duration, e.g. "2 h 15 min", "3 days", "1.5 yr". */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const min = abs / 60_000;
  if (min < 1) return `${Math.round(abs / 1000)} s`;
  if (min < 60) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 24) {
    const whole = Math.floor(h);
    const rest = Math.round(min - whole * 60);
    return rest > 0 ? `${whole} h ${rest} min` : `${whole} h`;
  }
  const d = h / 24;
  if (d < 60) return `${Math.round(d)} days`;
  if (d < 730) return `${Math.round(d / 30.44)} mo`;
  return `${(d / 365.25).toFixed(1)} yr`;
}
