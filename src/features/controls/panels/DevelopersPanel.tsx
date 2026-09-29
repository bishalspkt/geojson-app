import { useEffect, useState } from 'react';
import { BookOpen, Check, Copy, ExternalLink } from 'lucide-react';
import { useMapStore } from '@/state/map-store';
import { useSettingsStore } from '@/state/settings-store';
import { storyRefFor } from '@/stories/ref';
import { useStoryStore } from '@/state/story-store';
import { Segmented } from '@/components/ui/segmented';
import { IconButton } from '@/components/ui/icon-button';
import Panel from '../Panel';

const ORIGIN = 'https://geojson.app';
const DOCS = 'https://github.com/bishalspkt/geojson-app/blob/main/docs/developers-api.md';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked (insecure context) — the code is still selectable */
    }
  };
  return (
    <IconButton label={copied ? 'Copied' : 'Copy to clipboard'} onClick={copy} tone="plain" className="text-gray-400 hover:bg-white/10 hover:text-white">
      {copied ? <Check className="text-emerald-400" /> : <Copy />}
    </IconButton>
  );
}

/** The current camera, rounded for readable snippets. */
function useView() {
  const map = useMapStore((s) => s.map);
  const [view, setView] = useState({ center: [105, -5] as [number, number], zoom: 2.8 });
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const c = map.getCenter();
      setView({ center: [Number(c.lng.toFixed(4)), Number(c.lat.toFixed(4))], zoom: Number(map.getZoom().toFixed(2)) });
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [map]);
  return view;
}

const OPTIONS = [
  ['geojson', 'URL of your GeoJSON'],
  ['story', 'URL of a story document'],
  ['center', '[lng, lat]'],
  ['zoom', '0–22'],
  ['theme', 'light, dark, white, grayscale, black'],
  ['projection', 'mercator or globe'],
  ['interactive', 'pan/zoom (default true)'],
  ['chrome', 'full, minimal (default), none'],
] as const;

/** Embed code for the current view (script SDK or a plain iframe). */
export default function DevelopersPanel() {
  const { center, zoom } = useView();
  const theme = useSettingsStore((s) => s.theme);
  const projection = useSettingsStore((s) => s.projection);
  const storyUrl = useStoryStore((s) => (s.status === 'ready' ? s.url : null));
  const [kind, setKind] = useState<'script' | 'iframe'>('script');

  // Built-in stories by slug, other same-origin ones as a site path (both work on geojson.app); others keep their full URL.
  const storyPath = storyUrl ? storyRefFor(storyUrl, window.location.origin) : null;
  const script = `<div id="map" style="width:100%;height:480px"></div>
<script src="${ORIGIN}/embed.js"></script>
<script>
  GeoJSONApp("create", {
    element: "#map",
    ${storyPath ? `story: "${storyPath}"` : 'geojson: "https://example.com/data.geojson"'},
    center: [${center.join(', ')}],
    zoom: ${zoom},
    theme: "${theme}",
    projection: "${projection}",
    chrome: "minimal",
  });
</script>`;
  const params = new URLSearchParams({ embed: '1', center: center.join(','), zoom: String(zoom), theme, projection });
  if (storyPath) params.set('story', storyPath);
  const iframe = `<iframe src="${ORIGIN}/?${params.toString()}"
  width="100%" height="480" style="border:0;border-radius:12px"
  loading="lazy" allow="fullscreen" title="Map"></iframe>`;
  const code = kind === 'script' ? script : iframe;

  return (
    <Panel panelId="developers" className="gap-4 p-3.5">
      <div>
        <p className="font-heading text-sm font-extrabold">Put this map on your site</p>
        <p className="mt-0.5 text-xs text-muted-foreground">The code below embeds the current view. Drive it live with the JavaScript SDK.</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Segmented
            label="Embed type"
            size="xs"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'script', label: 'JavaScript SDK' },
              { value: 'iframe', label: 'iframe' },
            ]}
          />
        </div>
        <div className="relative rounded-xl bg-gray-950 ring-1 ring-white/10">
          <div className="absolute right-1.5 top-1.5">
            <CopyButton text={code} />
          </div>
          <pre className="overflow-x-auto whitespace-pre p-3 pr-10 font-mono text-[11px] leading-relaxed text-gray-300">{code}</pre>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-2">Options</p>
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-2.5 gap-y-1.5">
          {OPTIONS.map(([param, desc]) => (
            <div key={param} className="contents">
              <dt>
                <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">{param}</code>
              </dt>
              <dd className="text-[11px] text-muted-foreground">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>

      <a
        href={DOCS}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/8"
      >
        <BookOpen className="h-4 w-4" aria-hidden /> Developer API reference <ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    </Panel>
  );
}
