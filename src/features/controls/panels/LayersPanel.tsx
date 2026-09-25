import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import {
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  ImagePlus,
  Import,
  Info,
  Layers2,
  MapPin,
  Shapes,
  Trash2,
  Waypoints,
} from 'lucide-react';
import { length } from '@turf/length';
import { area } from '@turf/area';
import { DataLayer, GeometryCategory, IdentifiedFeature, categorizeGeometry } from '@/types';
import { useLayersStore } from '@/state/layers-store';
import { useUiStore } from '@/state/ui-store';
import { useTimeStore } from '@/state/time-store';
import { useImageryStore } from '@/state/imagery-store';
import { useEmbed } from '@/integrations/embed/embed-context';
import Legend from '@/features/legend/Legend';
import { IconButton } from '@/components/ui/icon-button';
import { Segmented } from '@/components/ui/segmented';
import { cn } from '@/lib/utils';
import Panel from '../Panel';
import { setPanelWithPolicy } from '../panel-policy';

const ImageryList = lazy(() => import('@/features/imagery/ImageryList'));
const AddImageryMenu = lazy(() => import('@/features/imagery/AddImageryMenu'));

/** Rows rendered per section before "Show more" (big layers stay responsive). */
const PAGE = 150;

function formatNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  if (value >= 10) return value.toFixed(0);
  if (value >= 0.01) return value.toFixed(2);
  return value.toFixed(4);
}

const CATEGORIES: { type: GeometryCategory; label: string; icon: typeof MapPin }[] = [
  { type: 'point', label: 'Points', icon: MapPin },
  { type: 'line', label: 'Lines', icon: Waypoints },
  { type: 'polygon', label: 'Polygons', icon: Shapes },
];

type SortOrder = 'original' | 'alpha' | 'size';

/** Area (km²) or length (km) per feature — computed once per (immutable) feature. */
const sizeCache = new WeakMap<IdentifiedFeature, number>();
function featureSize(f: IdentifiedFeature, cat: GeometryCategory): number {
  let v = sizeCache.get(f);
  if (v === undefined) {
    v = cat === 'polygon' ? area(f) / 1e6 : cat === 'line' ? length(f) : 0;
    sizeCache.set(f, v);
  }
  return v;
}

const featureName = (f: IdentifiedFeature) =>
  (f.properties?.name ?? f.properties?.title ?? f.properties?.label ?? '') as string;

/**
 * Panel-local UI state that survives close/reopen (registry panels take no
 * props). Section keys are "<layerId>:<category>".
 */
const usePanelUi = create<{
  sortOrder: SortOrder;
  /** Sections the user opened or closed; others use their default. */
  open: Record<string, boolean>;
  shown: Record<string, number>;
  setSortOrder(order: SortOrder): void;
  setOpen(key: string, open: boolean): void;
  showMore(key: string): void;
}>((set) => ({
  sortOrder: 'original',
  open: {},
  shown: {},
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setOpen: (key, open) => set((s) => (s.open[key] === open ? s : { open: { ...s.open, [key]: open } })),
  showMore: (key) => set((s) => ({ shown: { ...s.shown, [key]: (s.shown[key] ?? PAGE) + PAGE } })),
}));

function sortFeatures(features: IdentifiedFeature[], cat: GeometryCategory, order: SortOrder): IdentifiedFeature[] {
  if (order === 'original') return features;
  if (order === 'alpha' || cat === 'point') {
    return [...features].sort((a, b) => featureName(a).localeCompare(featureName(b)));
  }
  return [...features].sort((a, b) => featureSize(b, cat) - featureSize(a, cat));
}

function FeatureRow({
  feature,
  cat,
  index,
  active,
  hidden,
  rowRef,
}: {
  feature: IdentifiedFeature;
  cat: GeometryCategory;
  index: number;
  active: boolean;
  hidden: boolean;
  rowRef: (el: HTMLElement | null) => void;
}) {
  const Icon = CATEGORIES.find((c) => c.type === cat)!.icon;
  const name = featureName(feature) || `${cat === 'polygon' ? 'Polygon' : cat === 'line' ? 'Line' : 'Point'} ${index + 1}`;
  const size = cat === 'point' ? null : featureSize(feature, cat);
  const select = () => {
    const store = useLayersStore.getState();
    if (active) {
      store.selectFeature(null);
      return;
    }
    store.selectFeature(feature.id);
    if (!hidden) useUiStore.getState().requestFocus({ kind: 'feature', featureId: feature.id });
  };
  return (
    <li
      ref={rowRef}
      className={cn(
        'group flex scroll-mt-10 items-center gap-2 rounded-xl py-1.5 pl-7 pr-1 transition-colors',
        active ? 'bg-selected text-selected-foreground ring-1 ring-accent/40' : 'hover:bg-hover',
        hidden && 'opacity-45',
      )}
    >
      <button type="button" onClick={select} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-pressed={active}>
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', active ? 'bg-accent/20 text-accent' : 'bg-primary/8 text-primary/80')}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-bold">{name}</span>
          {size !== null && (
            <span className="block text-[11px] text-subtle-foreground">
              {formatNumber(size)} {cat === 'polygon' ? 'km²' : 'km'}
            </span>
          )}
        </span>
      </button>
      {/* Phones only: desktop has the right-click menu and hover card. */}
      <IconButton label="View properties" className="sm:hidden" onClick={() => useUiStore.getState().showProperties(feature.id)}>
        <Info />
      </IconButton>
      <IconButton label={hidden ? 'Show feature' : 'Hide feature'} onClick={() => useLayersStore.getState().toggleFeatureVisibility(feature.id)}>
        {hidden ? <EyeOff /> : <Eye />}
      </IconButton>
    </li>
  );
}

function CategorySection({
  layer,
  cat,
  features,
  selectedId,
  hiddenIds,
  rowRefs,
  defaultOpen,
}: {
  layer: DataLayer;
  cat: (typeof CATEGORIES)[number];
  features: IdentifiedFeature[];
  selectedId: string | null;
  hiddenIds: Set<string>;
  rowRefs: React.RefObject<Map<string, HTMLElement>>;
  /** Open unless the user closed it (a layer's only, reasonably small section). */
  defaultOpen: boolean;
}) {
  const key = `${layer.id}:${cat.type}`;
  const expanded = usePanelUi((s) => s.open[key] ?? defaultOpen);
  const shown = usePanelUi((s) => s.shown[key] ?? PAGE);
  const ids = useMemo(() => features.map((f) => f.id), [features]);
  const allHidden = ids.every((id) => hiddenIds.has(id));
  // Keep the selected feature renderable even past the current page.
  const selectedIndex = selectedId ? features.findIndex((f) => f.id === selectedId) : -1;
  const limit = Math.max(shown, selectedIndex + 1);

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-glass-strong px-2 py-1">
        <button
          type="button"
          onClick={() => usePanelUi.getState().setOpen(key, !expanded)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1 py-1 text-left hover:bg-hover"
        >
          <ChevronRight className={cn('h-3.5 w-3.5 text-subtle-foreground transition-transform', expanded && 'rotate-90')} aria-hidden />
          <cat.icon className="h-3.5 w-3.5 text-primary/70" aria-hidden />
          <span className="font-heading text-xs font-extrabold">{cat.label}</span>
          <span className="text-[11px] font-semibold text-subtle-foreground tabular-nums">{features.length.toLocaleString()}</span>
        </button>
        <IconButton
          label={allHidden ? `Show all ${cat.label.toLowerCase()}` : `Hide all ${cat.label.toLowerCase()}`}
          size="xs"
          onClick={() => useLayersStore.getState().setFeaturesVisibility(ids, allHidden)}
        >
          {allHidden ? <EyeOff /> : <Eye />}
        </IconButton>
      </div>
      {expanded && (
        <ul className="flex flex-col gap-0.5 px-1.5 pb-1.5">
          {features.slice(0, limit).map((f, i) => (
            <FeatureRow
              key={f.id}
              feature={f}
              cat={cat.type}
              index={i}
              active={selectedId === f.id}
              hidden={hiddenIds.has(f.id)}
              rowRef={(el) => {
                if (el) rowRefs.current.set(f.id, el);
                else rowRefs.current.delete(f.id);
              }}
            />
          ))}
          {features.length > limit && (
            <li>
              <button
                type="button"
                onClick={() => usePanelUi.getState().showMore(key)}
                className="ml-7 rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-hover"
              >
                Show {Math.min(PAGE, features.length - limit).toLocaleString()} more of {(features.length - limit).toLocaleString()}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function LayerGroup({
  layer,
  selectedId,
  hiddenIds,
  sortOrder,
  editable,
  rowRefs,
}: {
  layer: DataLayer;
  selectedId: string | null;
  hiddenIds: Set<string>;
  sortOrder: SortOrder;
  editable: boolean;
  rowRefs: React.RefObject<Map<string, HTMLElement>>;
}) {
  const buckets = useMemo(() => {
    const out: Record<GeometryCategory, IdentifiedFeature[]> = { point: [], line: [], polygon: [] };
    for (const f of layer.features) if (f.geometry) out[categorizeGeometry(f.geometry.type)].push(f);
    return {
      point: sortFeatures(out.point, 'point', sortOrder),
      line: sortFeatures(out.line, 'line', sortOrder),
      polygon: sortFeatures(out.polygon, 'polygon', sortOrder),
    };
  }, [layer.features, sortOrder]);
  const store = useLayersStore.getState();
  const sections = CATEGORIES.filter((c) => buckets[c.type].length > 0);
  const openByDefault = sections.length === 1 && layer.features.length <= 300;

  return (
    <div className="border-b border-glass-border last:border-b-0">
      <div className="flex items-center gap-2 px-3.5 py-2">
        <Layers2 className={cn('h-4 w-4 shrink-0', layer.visible ? 'text-primary' : 'text-subtle-foreground')} aria-hidden />
        <span className={cn('font-heading min-w-0 truncate text-[13px] font-extrabold', !layer.visible && 'text-subtle-foreground')} title={layer.name}>
          {layer.name}
        </span>
        <span className="text-[11px] font-semibold text-subtle-foreground tabular-nums">{layer.features.length.toLocaleString()}</span>
        {layer.temporal && <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-label="Has timestamps" />}
        <span className="flex-1" />
        <IconButton label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`} onClick={() => store.setLayerVisible(layer.id, !layer.visible)}>
          {layer.visible ? <Eye /> : <EyeOff />}
        </IconButton>
        {editable && layer.origin !== 'story' && (
          <IconButton label={`Remove ${layer.name}`} tone="danger" onClick={() => store.removeLayer(layer.id)}>
            <Trash2 />
          </IconButton>
        )}
      </div>
      {(layer.legend || layer.attribution) && layer.visible && (
        <div className="flex flex-col gap-1 px-3.5 pb-2">
          {layer.legend && <Legend spec={layer.legend} />}
          {layer.attribution && (
            <p className="truncate text-[10.5px] text-subtle-foreground" title={layer.attribution}>
              Source: {layer.attribution}
            </p>
          )}
        </div>
      )}
      {sections.map((cat) => (
        <CategorySection
          key={cat.type}
          layer={layer}
          cat={cat}
          features={buckets[cat.type]}
          selectedId={selectedId}
          hiddenIds={hiddenIds}
          rowRefs={rowRefs}
          defaultOpen={openByDefault}
        />
      ))}
    </div>
  );
}

/** Keep the selected feature in view: expand its section and scroll to it. */
function useRevealSelection(selectedId: string | null, rowRefs: React.RefObject<Map<string, HTMLElement>>) {
  useEffect(() => {
    if (!selectedId) return;
    for (const layer of useLayersStore.getState().layers) {
      const f = layer.features.find((x) => x.id === selectedId);
      if (f?.geometry) {
        usePanelUi.getState().setOpen(`${layer.id}:${categorizeGeometry(f.geometry.type)}`, true);
        break;
      }
    }
    const timer = setTimeout(() => rowRefs.current.get(selectedId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
    return () => clearTimeout(timer);
  }, [selectedId, rowRefs]);
}

export default function LayersPanel() {
  const embed = useEmbed();
  const layers = useLayersStore((s) => s.layers);
  const selectedId = useLayersStore((s) => s.selection?.featureId ?? null);
  const hiddenIds = useLayersStore((s) => s.hiddenFeatureIds);
  const sortOrder = usePanelUi((s) => s.sortOrder);
  const hasImagery = useImageryStore((s) => s.layers.length > 0);
  const timelineOn = useTimeStore((s) => s.enabled);
  const [addingImagery, setAddingImagery] = useState(false);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  useRevealSelection(selectedId, rowRefs);

  const dataLayers = layers.filter((l) => l.features.length > 0);
  const hasTemporal = dataLayers.some((l) => l.temporal && l.visible);
  const editable = !embed.enabled;

  const footer = editable && (
    <div className="relative flex shrink-0 items-center gap-1 border-t border-glass-border px-2 py-1.5">
      <button
        type="button"
        onClick={() => setAddingImagery((o) => !o)}
        aria-expanded={addingImagery}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-hover"
      >
        <ImagePlus className="h-4 w-4" aria-hidden /> Add imagery
      </button>
      <span className="flex-1" />
      {dataLayers.length > 0 && (
        <button
          type="button"
          onClick={() => useLayersStore.getState().clearLayers()}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear all
        </button>
      )}
      {addingImagery && (
        <Suspense fallback={null}>
          <AddImageryMenu onClose={() => setAddingImagery(false)} />
        </Suspense>
      )}
    </div>
  );

  return (
    <Panel panelId="layers" footer={footer || undefined}>
      {(hasTemporal || dataLayers.length > 0) && (
        <div className="flex items-center gap-2 border-b border-glass-border px-3 py-2">
          {hasTemporal && (
            <button
              type="button"
              onClick={() => (timelineOn ? useTimeStore.getState().disable() : useTimeStore.getState().enable())}
              aria-pressed={timelineOn}
              title="Your data has timestamps — play it on a timeline"
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors',
                timelineOn ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/15',
              )}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden /> Timeline
            </button>
          )}
          <span className="flex-1" />
          <Segmented
            label="Sort features"
            size="xs"
            value={sortOrder}
            onChange={(v) => usePanelUi.getState().setSortOrder(v)}
            options={[
              { value: 'original', label: 'Original' },
              { value: 'alpha', label: 'A–Z' },
              { value: 'size', label: 'Size' },
            ]}
          />
        </div>
      )}

      {hasImagery && (
        <Suspense fallback={null}>
          <ImageryList removable={editable} />
        </Suspense>
      )}

      {dataLayers.map((layer) => (
        <LayerGroup
          key={layer.id}
          layer={layer}
          selectedId={selectedId}
          hiddenIds={hiddenIds}
          sortOrder={sortOrder}
          editable={editable}
          rowRefs={rowRefs}
        />
      ))}

      {dataLayers.length === 0 && !hasImagery && (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Layers2 className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-heading text-sm font-extrabold">Nothing on the map yet</p>
          <p className="text-xs text-muted-foreground">
            {editable ? 'Import a GeoJSON file, paste a link, or open a demo.' : 'Data added to this map appears here.'}
          </p>
          {editable && (
            <button
              type="button"
              onClick={() => setPanelWithPolicy('upload')}
              className="mt-1 flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-md active:scale-95"
            >
              <Import className="h-4 w-4" aria-hidden /> Import data
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}
