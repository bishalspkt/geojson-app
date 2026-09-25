import { useCallback, useMemo, useState } from 'react';
import { Check, Copy, MapPin, Minus, Pentagon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { findFeature, useLayersStore } from '@/state/layers-store';
import { useUiStore } from '@/state/ui-store';
import { withoutInternalProperties } from '@/lib/external-feature';
import { getFeatureDetails } from './feature-details';

const GEOMETRY_LABELS: Record<string, string> = {
  Point: 'Point', MultiPoint: 'MultiPoint',
  LineString: 'Line', MultiLineString: 'MultiLine',
  Polygon: 'Polygon', MultiPolygon: 'MultiPolygon',
};

const GEOMETRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Point: MapPin, MultiPoint: MapPin,
  LineString: Minus, MultiLineString: Minus,
  Polygon: Pentagon, MultiPolygon: Pentagon,
};

function stringifyValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function PropertiesDialog() {
  const featureId = useUiStore((s) => s.propertiesFeatureId);
  const layers = useLayersStore((s) => s.layers);
  const [copied, setCopied] = useState(false);

  const feature = useMemo(
    () => (featureId ? (findFeature(layers, featureId)?.feature ?? null) : null),
    [featureId, layers],
  );

  // Clean properties (hide internal bookkeeping keys) used for both the
  // rendered list and the copy-to-clipboard payload.
  const cleanProperties = useMemo(() => withoutInternalProperties(feature?.properties), [feature]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(cleanProperties, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [cleanProperties]);

  if (!feature) return null;

  const { name, geomType, detail } = getFeatureDetails(feature);
  const GeomIcon = GEOMETRY_ICONS[geomType] || MapPin;
  const geomLabel = GEOMETRY_LABELS[geomType] || geomType;
  const propertyEntries = Object.entries(cleanProperties);
  const close = () => useUiStore.getState().showProperties(null);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0 rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-heading text-base font-extrabold truncate pr-8">
            {name ?? 'Feature properties'}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-1.5 text-[11px] text-subtle-foreground mt-1">
              <GeomIcon className="h-3 w-3 shrink-0" />
              <span>{geomLabel}</span>
              {detail && <span className="ml-auto">{detail}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {propertyEntries.length === 0 ? (
            <p className="text-sm text-subtle-foreground py-6 text-center">No properties</p>
          ) : (
            <dl className="flex flex-col gap-2">
              {propertyEntries.map(([key, value]) => (
                <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-1.5 border-b border-border/60 last:border-0">
                  <dt className="text-[11px] font-bold text-subtle-foreground uppercase tracking-wider truncate pt-0.5" title={key}>
                    {key}
                  </dt>
                  <dd className="text-xs break-words whitespace-pre-wrap font-mono">
                    {stringifyValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {propertyEntries.length > 0 && (
          <div className="px-5 py-3 border-t border-border flex justify-end">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-hover transition-colors duration-150"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
