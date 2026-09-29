import { useRef, useState } from 'react';
import { ArrowRight, BookOpen, FileUp, Link2, Loader2 } from 'lucide-react';
import type { SourceInput } from '@/extensions/sources/registry';
import { loadStory, preloadStoryRuntime } from '@/stories';
import { FEATURED_STORIES } from '@/features/story/featured';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import Panel from '../Panel';
import { CycloneIcon, FirePerimeterIcon, PlatesIcon, SeismogramIcon } from './sample-icons';
import { fileProps, importData, importErrorMessage, type ImportSource } from '../import-data';

/** Real open datasets, rebuilt by scripts/build-samples.mjs. */
const SAMPLES = [
  { name: 'Earthquakes', file: 'earthquakes-2025', detail: 'Every M5.5+ in 2025', icon: SeismogramIcon },
  { name: 'Storms', file: 'storms-2025', detail: '2025 cyclone tracks', icon: CycloneIcon },
  { name: 'Tectonic plates', file: 'tectonic-plates', detail: '52 plates & boundaries', icon: PlatesIcon },
  { name: 'LA wildfires', file: 'la-fires-2025', detail: 'Burn scars, Jan 2025', icon: FirePerimeterIcon },
];

/** What is loading: 'file', 'url', or a demo's name. */
type Busy = string | null;

export default function UploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const load = async (
    input: SourceInput,
    opts: { source: ImportSource; name?: string; props?: Record<string, unknown> },
    what: string,
    busyKey: string,
  ) => {
    setError(null);
    setBusy(busyKey);
    try {
      await importData(input, opts);
    } catch (err) {
      setError(importErrorMessage(err, what));
    } finally {
      setBusy(null);
    }
  };

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    void load({ kind: 'file', file }, { source: 'file_upload', props: fileProps(file) }, `"${file.name}"`, 'file');
  };

  const submitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!/^https?:\/\//i.test(value)) {
      setError('Enter a link that starts with http:// or https://');
      return;
    }
    void load({ kind: 'url', url: value }, { source: 'url' }, 'the link', 'url');
  };

  return (
    <Panel panelId="upload" className="gap-4 p-3.5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          // preventDefault marks the drop handled; the window-level drop handler
          // (features/map/Map.tsx) then only clears its overlay.
          e.preventDefault();
          setDragOver(false);
          loadFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/8' : 'border-foreground/15 hover:border-primary/60 hover:bg-hover',
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary transition-transform group-hover:scale-105">
          {busy === 'file' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
        </span>
        <p className="font-heading text-sm font-extrabold">
          <span className="hidden sm:inline">Drop a GeoJSON file or </span>
          <span className="text-primary sm:underline sm:underline-offset-2">browse<span className="sm:hidden"> for a GeoJSON file</span></span>
        </p>
        <p className="text-[11px] text-muted-foreground">.geojson or .json, up to 25 MB — it stays on your device</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.geojson,application/geo+json,application/json"
        className="hidden"
        onChange={(e) => {
          loadFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <form onSubmit={submitUrl} className="flex items-center gap-1.5 rounded-xl bg-tint px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-ring/40">
        <Link2 className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden />
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="…or paste a link to GeoJSON"
          aria-label="GeoJSON URL"
          className="min-w-0 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-subtle-foreground sm:text-xs"
        />
        <button
          type="submit"
          disabled={!url.trim() || busy !== null}
          className="flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40"
        >
          {busy === 'url' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Load'}
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive" role="alert">
          {error}
        </p>
      )}

      <section>
        <p className="eyebrow mb-2">Try a demo</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SAMPLES.map(({ name, file, detail, icon: Icon }) => (
            <button
              key={file}
              type="button"
              disabled={busy !== null}
              onClick={() => void load({ kind: 'url', url: `/samples/${file}.geojson` }, { source: 'sample', name, props: { sample: name } }, name, name)}
              className="flex items-center gap-2 rounded-xl bg-card/70 px-2.5 py-2 text-left text-xs font-bold shadow-sm ring-1 ring-foreground/5 transition-colors hover:bg-card active:scale-[0.98] disabled:opacity-60"
            >
              {busy === name ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : <Icon className="h-4 w-4 shrink-0 text-primary" />}
              <span className="min-w-0">
                <span className="block truncate">{name}</span>
                <span className="block truncate text-[10px] font-semibold text-muted-foreground">{detail}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {FEATURED_STORIES.length > 0 && (
        <section>
          <p className="eyebrow mb-2">Stories</p>
          <div className="flex flex-col gap-1.5">
            {FEATURED_STORIES.map((story) => (
              <button
                key={story.url}
                type="button"
                onPointerEnter={preloadStoryRuntime}
                onClick={() => {
                  track('story_opened', { url: story.url, source: 'import_panel' });
                  setError(null);
                  loadStory(story.url).catch((err: unknown) =>
                    setError(`Couldn't open the story: ${err instanceof Error ? err.message : String(err)}`),
                  );
                }}
                className="group flex items-start gap-2.5 rounded-xl bg-card/70 p-2.5 text-left shadow-sm ring-1 ring-foreground/5 transition-colors hover:bg-card active:scale-[0.99]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <BookOpen className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold leading-snug">{story.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">{story.blurb}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}
    </Panel>
  );
}
