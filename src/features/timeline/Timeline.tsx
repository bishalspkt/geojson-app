import { memo, useEffect, useMemo, useState } from 'react';
import { Clock, History, Pause, Play, SkipBack, X } from 'lucide-react';
import { featureInterval } from '@/core/time/temporal';
import { formatDuration, formatInstant, granularityFor } from '@/core/time/format';
import { useLayersStore } from '@/state/layers-store';
import { useTimeStore, type TimeCaption } from '@/state/time-store';
import { useUiStore } from '@/state/ui-store';
import { useStoryStore } from '@/state/story-store';
import { IconButton } from '@/components/ui/icon-button';
import { useIsMobile } from '@/lib/use-media-query';
import { track } from '@/lib/analytics';
import { keyBelongsToFocus } from '@/lib/keys';
import { cn } from '@/lib/utils';
import './timeline.css';

const SPEEDS = [0.5, 1, 2, 4];
const BINS = 90;
/** How long a caption stays up after the playhead passes it (real time). */
const CAPTION_HOLD_MS = 7000;

/** Counts of feature start times per bin across the extent (the scrubber's backdrop). */
function useHistogram(extent: [number, number] | null): number[] {
  const layers = useLayersStore((s) => s.layers);
  return useMemo(() => {
    const bins = new Array<number>(BINS).fill(0);
    if (!extent || extent[1] <= extent[0]) return bins;
    const span = extent[1] - extent[0];
    for (const layer of layers) {
      if (!layer.visible || !layer.temporal) continue;
      for (const f of layer.features) {
        const iv = featureInterval(f, layer.temporal);
        if (!iv || iv[0] < extent[0] || iv[0] > extent[1]) continue;
        bins[Math.min(BINS - 1, Math.floor(((iv[0] - extent[0]) / span) * BINS))]++;
      }
    }
    return bins;
  }, [layers, extent]);
}

/**
 * The latest caption at or before `current`, shown for a few seconds each
 * time it's reached (again after a rewind).
 */
function useActiveCaption(captions: TimeCaption[], current: number): TimeCaption | null {
  let index = -1;
  for (let i = 0; i < captions.length && captions[i].t <= current; i++) index = i;
  const active = index >= 0 ? captions[index] : null;
  // Each arrival at a caption starts a fresh hold (derived state, reset during render).
  const [shown, setShown] = useState<{ caption: TimeCaption | null; expired: boolean }>({ caption: null, expired: false });
  if (shown.caption !== active) setShown({ caption: active, expired: false });
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setShown((s) => (s.caption === active ? { ...s, expired: true } : s)), CAPTION_HOLD_MS);
    return () => clearTimeout(timer);
  }, [active]);
  return active && !(shown.caption === active && shown.expired) ? active : null;
}

/** The histogram bars, drawn once per data change; progress is a clip, not a re-render of every bar. */
const Histogram = memo(function Histogram({ bins, progress }: { bins: number[]; progress: number }) {
  // Same element identities every frame, so React skips the bars and only moves the clip.
  const bars = useMemo(() => {
    const max = Math.max(1, ...bins);
    return bins.map((count, i) => {
      const h = count === 0 ? 0 : 2 + (count / max) * 16;
      return <rect key={i} x={i + 0.12} y={20 - h} width={0.76} height={h} />;
    });
  }, [bins]);
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${BINS} 20`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <clipPath id="timeline-past">
          <rect x={0} y={0} width={progress * BINS} height={20} />
        </clipPath>
      </defs>
      <g className="fill-foreground/15">{bars}</g>
      <g className="fill-primary/75" clipPath="url(#timeline-past)">
        {bars}
      </g>
    </svg>
  );
});

/** Narration above the bar (re-renders with the playhead, alone). */
function Caption({ span }: { span: number }) {
  const current = useTimeStore((s) => s.current);
  const captions = useTimeStore((s) => s.captions);
  const timeZone = useTimeStore((s) => s.timeZone);
  const caption = useActiveCaption(captions, current);
  if (!caption) return null;
  return (
    <div
      key={caption.t}
      className="timeline-caption absolute bottom-[calc(100%+8px)] left-0 right-[3.75rem] rounded-2xl bg-gray-950/85 px-3.5 py-2.5 text-white shadow-xl shadow-black/25 backdrop-blur-xl sm:right-auto sm:max-w-[min(560px,100%)]"
      role="status"
      aria-live="polite"
    >
      <span className="block text-[11px] font-extrabold tracking-wide text-amber-300 tabular-nums">
        {formatInstant(caption.t, granularityFor(Math.min(span, 86_400_000)), timeZone, { withZone: false })}
      </span>
      <span className="block text-[13.5px] font-medium leading-snug">{caption.text}</span>
    </div>
  );
}

/** The current instant and the playback-rate note. */
function Readout({ span }: { span: number }) {
  const current = useTimeStore((s) => s.current);
  const timeZone = useTimeStore((s) => s.timeZone);
  const playing = useTimeStore((s) => s.playing);
  const pace = useTimeStore((s) => s.pace);
  const duration = useTimeStore((s) => s.duration);
  const speed = useTimeStore((s) => s.speed);
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-heading truncate text-[13px] font-extrabold tabular-nums">{formatInstant(current, granularityFor(span), timeZone)}</span>
      <span className="hidden shrink-0 text-[10.5px] font-semibold text-subtle-foreground sm:inline">
        {playing && pace < 0.9 ? (
          <span className="font-extrabold text-primary">slow motion ×{pace < 0.1 ? pace.toFixed(2) : pace.toFixed(1)}</span>
        ) : (
          <>
            {formatDuration(span)} in {Math.round(duration / speed)} s
          </>
        )}
      </span>
    </div>
  );
}

/** Histogram, caption ticks and the range input — the only part that moves every frame. */
function Scrubber({ extent }: { extent: [number, number] }) {
  const current = useTimeStore((s) => s.current);
  const captions = useTimeStore((s) => s.captions);
  const timeZone = useTimeStore((s) => s.timeZone);
  const histogram = useHistogram(extent);
  const span = Math.max(1, extent[1] - extent[0]);
  const progress = Math.min(1, Math.max(0, (current - extent[0]) / span));
  return (
    <div className="relative mt-0.5 h-7">
      <Histogram bins={histogram} progress={progress} />
      {captions.map((c) => {
        const at = (c.t - extent[0]) / span;
        if (at < 0 || at > 1) return null;
        return (
          <span
            key={c.t}
            className={cn('absolute top-0 -ml-[1.5px] h-2 w-[3px] rounded-full', c.t <= current ? 'bg-amber-500' : 'bg-foreground/30')}
            style={{ left: `${at * 100}%` }}
            title={c.text}
            aria-hidden
          />
        );
      })}
      <input
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(progress * 1000)}
        onChange={(e) => {
          const store = useTimeStore.getState();
          if (store.playing) store.pause();
          store.setCurrent(extent[0] + (Number(e.target.value) / 1000) * span);
        }}
        className="timeline-range absolute inset-x-0 bottom-0 w-full"
        aria-label="Timeline position"
        aria-valuetext={formatInstant(current, granularityFor(span), timeZone)}
      />
    </div>
  );
}

/**
 * The timeline bar: play/pause, a scrubber over a histogram of feature times,
 * speed, and cumulative vs. sliding-window mode. Mounted while the time store
 * is enabled; playback itself runs in the store + core player. Only the
 * readout, scrubber and caption subscribe to the playhead, so playback
 * doesn't re-render the controls every frame.
 */
export default function Timeline() {
  const extent = useTimeStore((s) => s.extent);
  const playing = useTimeStore((s) => s.playing);
  const speed = useTimeStore((s) => s.speed);
  const window_ = useTimeStore((s) => s.window);
  const timeZone = useTimeStore((s) => s.timeZone);
  const storyOpen = useStoryStore((s) => s.status === 'ready');
  const sheetBottom = useUiStore((s) => s.viewInsets.bottom);
  const mobile = useIsMobile();

  // Space toggles playback (unless focus is in a control that uses it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || keyBelongsToFocus(e, { controls: true })) return;
      e.preventDefault();
      useTimeStore.getState().togglePlay();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!extent) return null;

  const span = Math.max(1, extent[1] - extent[0]);
  const granularity = granularityFor(span);
  const store = useTimeStore.getState();

  const togglePlay = () => {
    if (!playing) track('timeline_played', { span_ms: span, story: storyOpen });
    store.togglePlay();
  };
  const cycleSpeed = () => store.setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);
  // Sliding window: ~8% of the extent shows "what's happening now".
  const recentWindow = Math.max(60_000, Math.round(span * 0.08));

  // Phone: float above the tab bar, or above an open bottom sheet.
  const style = mobile
    ? { bottom: sheetBottom > 0 ? `${sheetBottom + 8}px` : 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 8px)' }
    : undefined;

  return (
    <div
      role="region"
      aria-label="Timeline"
      style={style}
      className={cn(
        'glass fixed z-30 rounded-2xl px-2.5 py-2',
        mobile ? 'inset-x-2' : 'bottom-3 right-3 w-[min(660px,calc(100vw-470px))] min-w-[340px]',
      )}
    >
      <Caption span={span} />
      <div className="flex items-center gap-1.5">
        <IconButton label="Rewind to start" size="md" hideOnMobile onClick={() => store.setCurrent(extent[0])}>
          <SkipBack />
        </IconButton>
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md active:scale-95"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
        </button>

        <div className="min-w-0 flex-1 px-1">
          <Readout span={span} />
          <Scrubber extent={extent} />
          <div className="-mt-0.5 flex justify-between text-[10px] font-semibold text-subtle-foreground tabular-nums">
            <span>{formatInstant(extent[0], granularity, timeZone, { withZone: false })}</span>
            <span>{formatInstant(extent[1], granularity, timeZone, { withZone: false })}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleSpeed}
          className="h-9 min-w-9 shrink-0 rounded-xl px-1.5 text-[11px] font-extrabold text-muted-foreground tabular-nums hover:bg-hover"
          aria-label={`Playback speed ${speed}×`}
          title="Playback speed"
        >
          {speed}×
        </button>
        <IconButton
          label={window_ !== null ? `Recent only (${formatDuration(window_)}) — show everything` : 'Show only recent'}
          size="md"
          tone={window_ !== null ? 'active' : 'default'}
          onClick={() => store.setWindow(window_ === null ? recentWindow : null)}
        >
          {window_ !== null ? <Clock /> : <History />}
        </IconButton>
        {!storyOpen && (
          <IconButton label="Close timeline" size="md" onClick={() => store.disable()}>
            <X />
          </IconButton>
        )}
      </div>
    </div>
  );
}
