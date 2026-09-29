import { useMemo } from 'react';
import { findFeature, useLayersStore } from '@/state/layers-store';
import { useUiStore } from '@/state/ui-store';
import { useToolsStore } from '@/state/tools-store';
import { SIMPLESTYLE_KEYS } from '@/style';
import { parseTime } from '@/core/time/temporal';
import { formatDateTime } from '@/core/time/format';
import { useTimeStore } from '@/state/time-store';
import { NAME_KEYS } from '@/features/context-menu/feature-details';
import { featureMedia, MEDIA_KEYS } from '@/features/media/media';

const MAX_FIELDS = 4;
const HIDDEN = new Set<string>([...SIMPLESTYLE_KEYS, ...MEDIA_KEYS, 'coordTimes', 'coordinateProperties', 'id', 'osm_id']);

function formatValue(value: unknown, timeZone: string | null): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string') {
    // ISO timestamps read better as dates.
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const t = parseTime(value);
      if (t !== null) return formatDateTime(t, timeZone);
    }
    return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  }
  if (Array.isArray(value)) return value.length <= 4 ? value.join(', ') : `${value.length} items`;
  return null;
}

const humanize = (key: string) => key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');

/**
 * Hover card for data features: name, layer, and a few properties
 * (`display.tooltipFields` when the layer defines them). Desktop pointers only.
 */
export default function HoverTooltip() {
  const hover = useUiStore((s) => s.hover);
  const layers = useLayersStore((s) => s.layers);
  const toolActive = useToolsStore((s) => s.activeTool !== null);
  // The open story's (or timeline's) zone, else the viewer's.
  const timeZone = useTimeStore((s) => s.timeZone);

  const content = useMemo(() => {
    if (!hover) return null;
    const hit = findFeature(layers, hover.featureId);
    if (!hit) return null;
    const props = (hit.feature.properties ?? {}) as Record<string, unknown>;
    const nameKey = NAME_KEYS.find((k) => typeof props[k] === 'string' && props[k]);
    const fields = hit.layer.display?.tooltipFields
      ?? Object.keys(props).filter((k) => !k.startsWith('_') && !HIDDEN.has(k) && k !== nameKey);
    const rows: [string, string][] = [];
    for (const key of fields) {
      const v = formatValue(props[key], timeZone);
      if (v !== null) rows.push([humanize(key), v]);
      if (rows.length >= MAX_FIELDS) break;
    }
    return { name: nameKey ? String(props[nameKey]) : null, layer: hit.layer.name, rows, media: featureMedia(props) };
  }, [hover, layers, timeZone]);

  if (!hover || !content || toolActive) return null;
  if (typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches) return null;

  // Keep the card on screen: flip left/up near the right/bottom edges.
  const flipX = hover.x > window.innerWidth - 280;
  const flipY = hover.y > window.innerHeight - 160;
  const style: React.CSSProperties = {
    left: flipX ? undefined : hover.x + 14,
    right: flipX ? window.innerWidth - hover.x + 14 : undefined,
    top: flipY ? undefined : hover.y + 14,
    bottom: flipY ? window.innerHeight - hover.y + 14 : undefined,
  };

  return (
    <div
      className="glass-strong fixed z-40 pointer-events-none max-w-[260px] rounded-xl px-3 py-2"
      style={style}
      role="tooltip"
    >
      {content.media?.image && (
        <img
          src={content.media.image}
          alt=""
          className="-mx-1 -mt-0.5 mb-1.5 block w-[calc(100%+8px)] max-h-[140px] rounded-lg object-cover bg-tint"
          referrerPolicy="no-referrer"
        />
      )}
      {content.name && <p className="text-xs font-extrabold leading-snug">{content.name}</p>}
      <p className="text-[10px] font-semibold text-subtle-foreground truncate">{content.layer}</p>
      {content.rows.length > 0 && (
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
          {content.rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold text-muted-foreground capitalize">{k}</dt>
              <dd className="font-bold truncate">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
