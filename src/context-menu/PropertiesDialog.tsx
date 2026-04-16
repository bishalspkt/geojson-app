import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Feature } from 'geojson';
import { Check, Copy, MapPin, Minus, Pentagon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  getFeatureDetails,
  INTERNAL_PROPERTY_KEYS,
  VIEW_PROPERTIES_EVENT,
  type ViewPropertiesDetail,
} from './feature-details';

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
  const [feature, setFeature] = useState<Feature | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ViewPropertiesDetail>).detail;
      if (detail?.feature) {
        setFeature(detail.feature);
        setCopied(false);
      }
    };
    window.addEventListener(VIEW_PROPERTIES_EVENT, handler);
    return () => window.removeEventListener(VIEW_PROPERTIES_EVENT, handler);
  }, []);

  // Clean properties (hide internal bookkeeping keys) used for both the
  // rendered list and the copy-to-clipboard payload.
  const cleanProperties = useMemo(() => {
    if (!feature?.properties) return {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(feature.properties)) {
      if (INTERNAL_PROPERTY_KEYS.includes(key)) continue;
      out[key] = value;
    }
    return out;
  }, [feature]);

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

  return (
    <Dialog open onOpenChange={(open) => { if (!open) setFeature(null); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0 rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-200/60">
          <DialogTitle className="text-base font-extrabold text-gray-900 truncate pr-8">
            {name ?? 'Feature properties'}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
              <GeomIcon className="h-3 w-3 shrink-0" />
              <span>{geomLabel}</span>
              {detail && <span className="ml-auto">{detail}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {propertyEntries.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No properties</p>
          ) : (
            <dl className="flex flex-col gap-2">
              {propertyEntries.map(([key, value]) => (
                <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-1.5 border-b border-gray-100 last:border-0">
                  <dt className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate pt-0.5">
                    {key}
                  </dt>
                  <dd className="text-xs text-gray-800 break-words whitespace-pre-wrap font-mono">
                    {stringifyValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200/60 bg-gray-50/50">
          <button
            onClick={handleCopy}
            disabled={propertyEntries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy Properties'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
