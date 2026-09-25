import type { StoryBarChart, StoryChart, StoryLineChart } from '@/types';

const nf = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : `${Math.round(v * 10) / 10}`);

const SERIES_COLORS = ['#d97706', '#0284c7', '#16a34a', '#7c3aed', '#e11d48', '#0d9488', '#ca8a04', '#64748b'];

/** SVG text/grid colours come from CSS so charts follow the light/dark theme. */
const AXIS = 'fill-subtle-foreground';
const GRID = 'stroke-foreground/10';

function LineChart({ chart }: { chart: StoryLineChart }) {
  const W = 340;
  const H = 160;
  const pad = { l: 38, r: 8, t: 8, b: 26 };
  const series = chart.series?.length
    ? chart.series.map((s, i) => ({ ...s, color: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length] }))
    : [{ label: chart.title, points: chart.points ?? [], color: chart.color ?? 'hsl(var(--primary))', dashed: false }];
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;
  const xs = all.map((p) => p[0]);
  const ys = [...all.map((p) => p[1]), ...(chart.thresholds ?? []).map((t) => t.y)];
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const yMinRaw = Math.min(...ys);
  const yMaxRaw = Math.max(...ys);
  const yPad = (yMaxRaw - yMinRaw) * 0.08 || 1;
  const y0 = chart.area && yMinRaw >= 0 ? 0 : yMinRaw - yPad;
  const y1 = yMaxRaw + yPad;
  const sx = (x: number) => pad.l + ((x - x0) / Math.max(1e-9, x1 - x0)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - y0) / Math.max(1e-9, y1 - y0)) * (H - pad.t - pad.b);
  const pathOf = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join('');
  const yTicks = [y0, (y0 + y1) / 2, y1];
  const xTicks = chart.xTicks ?? [x0, (x0 + x1) / 2, x1].map((x) => ({ x, label: nf(x) }));
  const single = series.length === 1;
  return (
    <figure className="rounded-xl bg-card/60 p-2.5 ring-1 ring-foreground/5">
      <figcaption className="mb-1 text-[11.5px] font-bold">{chart.title}</figcaption>
      {!single && (
        <ul className="mb-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground">
              <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={chart.title}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} className={GRID} />
            <text x={pad.l - 4} y={sy(t) + 3} textAnchor="end" fontSize="9" className={AXIS}>
              {nf(t)}
            </text>
          </g>
        ))}
        {(chart.thresholds ?? []).map((t) => (
          <g key={`${t.label}-${t.y}`}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(t.y)} y2={sy(t.y)} stroke={t.color ?? '#dc2626'} strokeDasharray="4 3" strokeWidth={1} />
            <text x={W - pad.r - 2} y={sy(t.y) - 3} textAnchor="end" fontSize="8.5" fontWeight={700} fill={t.color ?? '#dc2626'}>
              {t.label}
            </text>
          </g>
        ))}
        {single && chart.area && (
          <path
            d={`${pathOf(series[0].points)}L${sx(x1).toFixed(1)},${sy(y0).toFixed(1)}L${sx(x0).toFixed(1)},${sy(y0).toFixed(1)}Z`}
            fill={series[0].color}
            opacity={0.18}
          />
        )}
        {series.map((s) => (
          <path key={s.label} d={pathOf(s.points)} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinejoin="round" strokeDasharray={s.dashed ? '4 3' : undefined} />
        ))}
        {(chart.markers ?? []).map((m, i) => (
          <g key={`${m.label}-${i}`}>
            <line x1={sx(m.x)} x2={sx(m.x)} y1={pad.t} y2={H - pad.b} stroke="#dc2626" strokeDasharray="2 2" strokeWidth={1} />
            <text x={sx(m.x) + 2} y={pad.t + 8 + (i % 3) * 10} fontSize="8.5" fontWeight={700} fill="#dc2626">
              {m.label}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.label + t.x} x={sx(t.x)} y={H - pad.b + 11} textAnchor="middle" fontSize="9" className={AXIS}>
            {t.label}
          </text>
        ))}
        {chart.xLabel && (
          <text x={(pad.l + W - pad.r) / 2} y={H - 3} textAnchor="middle" fontSize="9" fontWeight={600} className={AXIS}>
            {chart.xLabel}
          </text>
        )}
        {chart.yLabel && (
          <text
            x={10}
            y={(pad.t + H - pad.b) / 2}
            textAnchor="middle"
            fontSize="9"
            fontWeight={600}
            className={AXIS}
            transform={`rotate(-90 10 ${(pad.t + H - pad.b) / 2})`}
          >
            {chart.yLabel}
          </text>
        )}
      </svg>
      {chart.note && <p className="mt-1 text-[10.5px] text-subtle-foreground">{chart.note}</p>}
    </figure>
  );
}

function BarChart({ chart }: { chart: StoryBarChart }) {
  const max = Math.max(1, ...chart.data.map((d) => d.value));
  return (
    <figure className="rounded-xl bg-card/60 p-2.5 ring-1 ring-foreground/5">
      <figcaption className="mb-1.5 text-[11.5px] font-bold">
        {chart.title}
        {chart.unit && <span className="font-semibold text-subtle-foreground"> · {chart.unit}</span>}
      </figcaption>
      <ul className="flex flex-col gap-1">
        {chart.data.map((d) => (
          <li key={d.label} className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-[11px]">
            <span className="truncate font-semibold text-muted-foreground" title={d.label}>
              {d.label}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-tint">
              <span className="block h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? 'hsl(var(--primary))' }} />
            </span>
            <span className="font-bold tabular-nums">{d.value.toLocaleString('en-US')}</span>
          </li>
        ))}
      </ul>
      {chart.note && <p className="mt-1.5 text-[10.5px] text-subtle-foreground">{chart.note}</p>}
    </figure>
  );
}

export function Chart({ chart }: { chart: StoryChart }) {
  return chart.kind === 'line' ? <LineChart chart={chart} /> : <BarChart chart={chart} />;
}
