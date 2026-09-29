import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ListOrdered, Loader2, LogOut, Mountain } from 'lucide-react';
import type { StoryChapter, StoryDocument } from '@/types';
import { useStoryStore } from '@/state/story-store';
import { useLayersStore } from '@/state/layers-store';
import { useImageryStore } from '@/state/imagery-store';
import { useCompareStore } from '@/state/compare-store';
import { closeStory, goToChapter, loadStory } from '@/stories/runtime';
import { useEmbed } from '@/integrations/embed/embed-context';
import Panel from '@/features/controls/Panel';
import { setPanelWithPolicy } from '@/features/controls/panel-policy';
import Legend from '@/features/legend/Legend';
import { IconButton } from '@/components/ui/icon-button';
import { track } from '@/lib/analytics';
import { keyBelongsToFocus } from '@/lib/keys';
import { httpUrl } from '@/lib/safe';
import { cn } from '@/lib/utils';
import { RichText } from './rich-text';
import { Chart } from './charts';
import { FEATURED_STORIES } from './featured';
import { readableSearch, storyRefFor } from '@/stories/ref';

/**
 * Keep `?story=…&chapter=…` in the address bar so any chapter can be shared
 * (main app only): `?story=bhotekoshi-2026&chapter=timure` for built-in stories. The link is left alone while a story loads or after it
 * failed, so reloading retries it; it's removed only when the story is closed.
 */
function useShareableUrl(storyUrl: string | null, chapterId: string | null, enabled: boolean) {
  const status = useStoryStore((s) => s.status);
  useEffect(() => {
    if (!enabled || status === 'loading' || status === 'error') return;
    const url = new URL(window.location.href);
    if (storyUrl && chapterId) {
      url.searchParams.set('story', storyRefFor(storyUrl, window.location.origin));
      url.searchParams.set('chapter', chapterId);
    } else {
      url.searchParams.delete('story');
      url.searchParams.delete('chapter');
    }
    url.search = readableSearch(url.search);
    if (url.toString() !== window.location.href) window.history.replaceState(window.history.state, '', url);
  }, [storyUrl, chapterId, enabled, status]);
}

/** ← / → step through chapters (outside fields and sliders). */
function useChapterKeys(story: StoryDocument | null, index: number) {
  useEffect(() => {
    if (!story) return;
    const onKey = (e: KeyboardEvent) => {
      // Not while typing, on a slider, or with the map focused (arrows pan it).
      if (keyBelongsToFocus(e, { map: true }) || (e.target instanceof Element && e.target.closest('[role="slider"]'))) return;
      if (e.key === 'ArrowRight' && index < story.chapters.length - 1) goToChapter(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) goToChapter(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [story, index]);
}

function Links({ title, items }: { title: string; items: { label: string; url?: string }[] }) {
  return (
    <div>
      <p className="eyebrow mb-1">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {items.map((s) => {
          const href = httpUrl(s.url);
          return (
            <li key={s.label} className="text-[11.5px] leading-snug text-muted-foreground">
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20 underline-offset-2 hover:text-primary">
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Legends for everything visible right now (data + imagery, both compare sides). */
function VisibleLegends() {
  const layers = useLayersStore((s) => s.layers);
  const imagery = useImageryStore((s) => s.layers);
  const compareLeft = useCompareStore((s) => (s.active ? s.left : null));
  const items = useMemo(() => {
    const out: { key: string; name: string; legend: NonNullable<(typeof layers)[number]['legend']> }[] = [];
    for (const l of imagery) if (l.legend && (l.visible || compareLeft?.includes(l.id))) out.push({ key: l.id, name: l.name, legend: l.legend });
    for (const l of layers) if (l.legend && l.visible) out.push({ key: l.id, name: l.name, legend: l.legend });
    return out;
  }, [layers, imagery, compareLeft]);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-card/50 p-2.5 ring-1 ring-foreground/5">
      {items.map((i) => (
        <Legend key={i.key} spec={i.legend} fallbackTitle={i.name} />
      ))}
    </div>
  );
}

function ChapterView({ chapter }: { chapter: StoryChapter }) {
  return (
    <article className="flex flex-col gap-3">
      <header>
        {chapter.kicker && <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-accent">{chapter.kicker}</p>}
        <h3 className="font-heading text-lg font-extrabold leading-tight tracking-tight">{chapter.title}</h3>
      </header>
      {chapter.stats && chapter.stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-1.5">
          {chapter.stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-card/60 px-2.5 py-1.5 ring-1 ring-foreground/5">
              <dd className="font-heading text-base font-extrabold leading-tight tabular-nums">{s.value}</dd>
              <dt className="text-[10.5px] font-semibold leading-tight text-muted-foreground">{s.label}</dt>
              {s.note && <p className="mt-0.5 text-[9.5px] leading-tight text-subtle-foreground">{s.note}</p>}
            </div>
          ))}
        </dl>
      )}
      <RichText text={chapter.body} />
      {chapter.chart && <Chart chart={chapter.chart} />}
      <VisibleLegends />
      {chapter.sources && chapter.sources.length > 0 && <Links title="Sources" items={chapter.sources} />}
    </article>
  );
}

function StoryBrowser() {
  const status = useStoryStore((s) => s.status);
  const error = useStoryStore((s) => s.error);
  return (
    <div className="flex flex-col gap-2 p-3.5">
      <p className="text-xs text-muted-foreground">
        Guided map narratives: each chapter moves the camera, switches layers, plays the timeline and compares imagery.
      </p>
      {FEATURED_STORIES.length === 0 && status === 'idle' && (
        <p className="rounded-xl bg-tint px-3 py-2.5 text-xs text-muted-foreground">
          Open a story from a link: <code className="font-mono text-[11px] text-foreground">?story=&lt;url of story.json&gt;</code>. Writing one:{' '}
          <a href="https://github.com/bishalspkt/geojson-app/blob/main/docs/stories.md" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
            docs/stories.md
          </a>
          .
        </p>
      )}
      {FEATURED_STORIES.map((s) => (
        <button
          key={s.url}
          type="button"
          onClick={() => {
            track('story_opened', { url: s.url, source: 'story_panel' });
            loadStory(s.url).catch(() => {});
          }}
          disabled={status === 'loading'}
          className="rounded-xl bg-card/70 p-3 text-left shadow-sm ring-1 ring-foreground/5 transition-colors hover:bg-card active:scale-[0.99] disabled:opacity-60"
        >
          <span className="font-heading flex items-center gap-1.5 text-sm font-extrabold">
            <Mountain className="h-4 w-4 text-primary" aria-hidden /> {s.title}
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">{s.blurb}</span>
        </button>
      ))}
      {status === 'loading' && (
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading story…
        </p>
      )}
      {status === 'error' && error && (
        <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Contents({ story, index, onPick }: { story: StoryDocument; index: number; onPick: () => void }) {
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' });
  }, []);
  return (
    <ol className="flex flex-col gap-0.5 p-2" aria-label="Chapters">
      {story.chapters.map((c, i) => (
        <li key={c.id} ref={i === index ? activeRef : undefined}>
          <button
            type="button"
            onClick={() => {
              goToChapter(i);
              onPick();
            }}
            aria-current={i === index ? 'step' : undefined}
            className={cn(
              'flex w-full items-baseline gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
              i === index ? 'bg-primary/12 text-primary' : 'hover:bg-hover',
            )}
          >
            <span className="w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-subtle-foreground">{i + 1}</span>
            <span className="min-w-0">
              {c.kicker && <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-subtle-foreground">{c.kicker}</span>}
              <span className="block text-[13px] font-bold leading-snug">{c.title}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function StoryPanel() {
  const story = useStoryStore((s) => (s.status === 'ready' ? s.story : null));
  const index = useStoryStore((s) => s.chapterIndex);
  const layerErrors = useStoryStore((s) => s.layerErrors);
  const storyUrl = useStoryStore((s) => s.url);
  const embed = useEmbed();
  const [showContents, setShowContents] = useState(false);
  useChapterKeys(story, index);

  const chapter = story?.chapters[index];
  useShareableUrl(story ? storyUrl : null, chapter?.id ?? null, !embed.enabled);
  useEffect(() => {
    if (story && chapter) track('story_chapter_viewed', { story: story.title, chapter: chapter.id, index });
  }, [story, chapter, index]);

  // Back to the top of the reader on chapter change.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.closest('[data-scroll-container]')?.scrollTo({ top: 0 });
  }, [index, showContents]);

  if (!story || !chapter) {
    return (
      <Panel panelId="story">
        <StoryBrowser />
      </Panel>
    );
  }

  const total = story.chapters.length;
  const exit = () => {
    void closeStory();
    setPanelWithPolicy(null);
  };

  const footer = (
    <div className="shrink-0 border-t border-glass-border px-3 pb-2 pt-1.5">
      <div className="mb-1.5 flex h-1 gap-[2px]" aria-hidden>
        {story.chapters.map((c, i) => (
          <span key={c.id} className={cn('flex-1 rounded-full transition-colors', i <= index ? 'bg-primary' : 'bg-foreground/12')} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToChapter(index - 1)}
          disabled={index === 0}
          className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-hover disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <span className="flex-1 text-center text-[11px] font-bold tabular-nums text-subtle-foreground" aria-live="polite">
          {index + 1} of {total}
        </span>
        <button
          type="button"
          onClick={() => goToChapter(index + 1)}
          disabled={index === total - 1}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-md active:scale-95 disabled:opacity-30"
        >
          Next <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  const actions = (
    <>
      <IconButton label={showContents ? 'Back to the chapter' : 'All chapters'} tone={showContents ? 'active' : 'default'} onClick={() => setShowContents((v) => !v)}>
        <ListOrdered />
      </IconButton>
      <IconButton label="Exit story" tone="danger" onClick={exit}>
        <LogOut />
      </IconButton>
    </>
  );

  return (
    <Panel panelId="story" variant="tall" title={story.title} actions={actions} footer={showContents ? undefined : footer}>
      <div ref={bodyRef} className={cn(!showContents && 'flex flex-col gap-3 p-3.5')}>
        {showContents ? (
          <Contents story={story} index={index} onPick={() => setShowContents(false)} />
        ) : (
          <>
            {index === 0 && story.subtitle && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {story.subtitle}
              </p>
            )}
            <ChapterView chapter={chapter} />
            {layerErrors.length > 0 && (
              <p className="rounded-lg bg-amber-500/12 px-2 py-1 text-[10.5px] text-amber-700 dark:text-amber-300">
                Some layers failed to load: {layerErrors.join('; ')}
              </p>
            )}
            {index === total - 1 && story.credits && story.credits.length > 0 && (
              <div className="border-t border-glass-border pt-2">
                <Links title="Data credits" items={story.credits} />
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
