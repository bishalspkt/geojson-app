import type { LegendSpec, LegendSwatch } from '@/types';

function Swatch({ item }: { item: LegendSwatch }) {
  const shape = item.shape ?? 'circle';
  if (shape === 'line') {
    return <span className="inline-block h-[3px] w-4 rounded-full shrink-0" style={{ background: item.color }} />;
  }
  if (shape === 'fill' || shape === 'square') {
    return (
      <span
        className="inline-block h-3 w-3 rounded-[3px] shrink-0 ring-1 ring-foreground/10"
        style={{ background: item.color }}
      />
    );
  }
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-card" style={{ background: item.color }} />
  );
}

/** Compact legend for a layer (swatches or a colour ramp). */
export default function Legend({ spec, fallbackTitle }: { spec: LegendSpec; fallbackTitle?: string }) {
  const title = spec.title ?? fallbackTitle;
  return (
    <div className="flex flex-col gap-1">
      {title && <p className="eyebrow">{title}</p>}
      {spec.kind === 'swatches' ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {spec.items.map((item) => (
            <li key={`${item.label}-${item.color}`} className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
              <Swatch item={item} />
              {item.label}
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <div
            className="h-2 rounded-full"
            style={{ background: `linear-gradient(to right, ${spec.stops.map((s) => s.color).join(', ')})` }}
          />
          <div className="mt-0.5 flex justify-between text-[10px] font-semibold text-muted-foreground">
            {spec.stops
              .filter((s, i) => s.label || i === 0 || i === spec.stops.length - 1)
              .map((s, i) => (
                <span key={i}>{s.label ?? ''}</span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
