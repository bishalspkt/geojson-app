import { Columns2, Eye, EyeOff, Satellite, Trash2 } from 'lucide-react';
import type { ImageryLayer } from '@/types';
import { useImageryStore } from '@/state/imagery-store';
import { useCompareStore } from '@/state/compare-store';
import Legend from '@/features/legend/Legend';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';

function ImageryRow({ layer, removable }: { layer: ImageryLayer; removable: boolean }) {
  const store = useImageryStore.getState();
  const onLeft = useCompareStore((s) => s.active && s.left.includes(layer.id));
  const shown = layer.visible || onLeft;

  const toggleCompare = () => {
    const compare = useCompareStore.getState();
    if (onLeft) {
      compare.stop();
      return;
    }
    // This layer goes left of the divider; whatever else is visible stays on the right.
    const right = useImageryStore.getState().layers.filter((l) => l.visible && l.id !== layer.id);
    compare.start({
      left: [layer.id],
      leftLabel: layer.name,
      rightLabel: right.length > 0 ? right[right.length - 1].name : 'Basemap',
    });
    if (layer.visible) store.setImageryVisible(layer.id, false);
  };

  return (
    <li className="flex flex-col gap-1.5 px-3.5 py-2">
      <div className="flex items-center gap-2">
        <Satellite className={cn('h-4 w-4 shrink-0', shown ? 'text-sky-500' : 'text-subtle-foreground')} aria-hidden />
        <p className={cn('min-w-0 flex-1 truncate text-[13px] font-bold', !shown && 'text-subtle-foreground')} title={layer.description ?? layer.name}>
          {layer.name}
        </p>
        <IconButton
          label={onLeft ? 'End swipe comparison' : `Swipe-compare ${layer.name}`}
          tone={onLeft ? 'active' : 'default'}
          onClick={toggleCompare}
        >
          <Columns2 />
        </IconButton>
        <IconButton label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`} onClick={() => store.setImageryVisible(layer.id, !layer.visible)}>
          {layer.visible ? <Eye /> : <EyeOff />}
        </IconButton>
        {removable && layer.origin !== 'story' && (
          <IconButton
            label={`Remove ${layer.name}`}
            tone="danger"
            onClick={() => {
              if (onLeft) useCompareStore.getState().stop();
              store.removeImagery(layer.id);
            }}
          >
            <Trash2 />
          </IconButton>
        )}
      </div>
      {shown && (
        <label className="flex items-center gap-2 pl-6 text-[10.5px] font-semibold text-subtle-foreground">
          Opacity
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(layer.opacity * 100)}
            onChange={(e) => store.setImageryOpacity(layer.id, Number(e.target.value) / 100)}
            className="flex-1 accent-[hsl(var(--primary))]"
            aria-label={`${layer.name} opacity`}
          />
          <span className="w-8 text-right tabular-nums">{Math.round(layer.opacity * 100)}%</span>
        </label>
      )}
      {layer.legend && shown && (
        <div className="pl-6">
          <Legend spec={layer.legend} />
        </div>
      )}
    </li>
  );
}

/** Imagery (raster) layers: visibility, opacity, swipe comparison. Top of the list draws on top. */
export default function ImageryList({ removable }: { removable: boolean }) {
  const layers = useImageryStore((s) => s.layers);
  if (layers.length === 0) return null;
  return (
    <section aria-label="Imagery" className="border-b border-glass-border">
      <p className="eyebrow px-3.5 pt-2.5">Imagery · {layers.length}</p>
      <ul>
        {[...layers].reverse().map((l) => (
          <ImageryRow key={l.id} layer={l} removable={removable} />
        ))}
      </ul>
    </section>
  );
}
