import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MoveHorizontal } from 'lucide-react';
import { startCompareMap } from '@/core/compare/compare-map';
import { useCompareStore, type CompareOption } from '@/state/compare-store';
import { useImageryStore } from '@/state/imagery-store';
import { useMapStore } from '@/state/map-store';
import { useUiStore } from '@/state/ui-store';
import { useIsMobile } from '@/lib/use-media-query';

/**
 * Before/after swipe. Hosts the secondary ("before") map — created and
 * synchronized by `core/compare` — clipped to the left of a draggable divider.
 * The main map underneath stays fully interactive; only the handle takes
 * pointer events.
 */
export default function CompareOverlay() {
  const active = useCompareStore((s) => s.active);
  const map = useMapStore((s) => (s.ready ? s.map : null));
  if (!active || !map) return null;
  return <CompareSwipe />;
}

function CompareSwipe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const position = useCompareStore((s) => s.position);
  const leftLabel = useCompareStore((s) => s.leftLabel);
  const rightLabel = useCompareStore((s) => s.rightLabel);
  const map = useMapStore((s) => s.map);

  useEffect(() => {
    if (!containerRef.current || !map) return;
    return startCompareMap(containerRef.current, map);
  }, [map]);

  const startDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      useCompareStore.getState().setPosition(ev.clientX / window.innerWidth);
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowLeft') useCompareStore.getState().setPosition(position - step);
    if (e.key === 'ArrowRight') useCompareStore.getState().setPosition(position + step);
  };

  const pct = `${(position * 100).toFixed(2)}%`;
  // Centre the handle in the part of the map no panel covers.
  const bottomInset = useUiStore((s) => s.viewInsets.bottom);

  return (
    <div className="fixed inset-0 z-[2] pointer-events-none">
      <div className="absolute inset-0" style={{ clipPath: `inset(0 calc(100% - ${pct}) 0 0)` }} aria-hidden>
        {/* Sized inner host: MapLibre's CSS forces `position: relative` on its container. */}
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {/* Divider */}
      <div className="absolute top-0 bottom-0 w-[3px] -ml-[1.5px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.45)]" style={{ left: pct }} />
      <button
        className="pointer-events-auto absolute -translate-y-1/2 -translate-x-1/2 h-11 w-11 rounded-full bg-white shadow-xl shadow-black/25 border border-black/5 flex items-center justify-center text-primary cursor-ew-resize touch-none active:scale-95"
        style={{ left: pct, top: `calc((100% - ${bottomInset}px) / 2)` }}
        onPointerDown={startDrag}
        onKeyDown={onKey}
        aria-label="Drag to compare before and after"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
      >
        <MoveHorizontal className="h-5 w-5" />
      </button>
      {leftLabel && <SideLabel side="left" label={leftLabel} pct={pct} />}
      {rightLabel && <SideLabel side="right" label={rightLabel} pct={pct} />}
    </div>
  );
}

/** Switch the main map's imagery from one right-side option to another. */
function showRightOption(from: CompareOption | undefined, to: CompareOption) {
  const imagery = useImageryStore.getState();
  for (const id of from?.ids ?? []) if (!to.ids.includes(id)) imagery.setImageryVisible(id, false);
  for (const id of to.ids) imagery.setImageryVisible(id, true);
}

/**
 * A side's label; with alternatives (several scenes of the same place) it
 * becomes a menu to pick which one that side shows.
 */
function SideLabel({ side, label, pct }: { side: 'left' | 'right'; label: string; pct: string }) {
  const options = useCompareStore((s) => (side === 'left' ? s.leftOptions : s.rightOptions));
  const index = useCompareStore((s) => (side === 'left' ? s.leftIndex : s.rightIndex));
  const [open, setOpen] = useState(false);
  const insets = useUiStore((s) => s.viewInsets);
  const mobile = useIsMobile();
  const place = side === 'left' ? '-translate-x-full -ml-3' : 'ml-3';
  const base = 'absolute rounded-lg bg-black/65 text-white text-[11px] font-bold whitespace-nowrap backdrop-blur';
  // Never run under a side panel or off the screen: truncate to the space available.
  const maxWidth =
    side === 'left' ? `calc(${pct} - ${insets.left + 24}px)` : `calc(100% - ${pct} - ${insets.right + 24}px)`;
  // Desktop: under the top bar. Phone: just above the bottom sheet, clear of the top-right buttons.
  const style = mobile
    ? {
        left: pct,
        maxWidth,
        bottom: insets.bottom ? `${insets.bottom + 12}px` : 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 12px)',
      }
    : { left: pct, maxWidth, top: '4.25rem' };
  if (options.length < 2) {
    return (
      <span className={`${base} ${place} truncate px-2.5 py-1`} style={style} title={label}>
        {label}
      </span>
    );
  }
  const choose = (i: number) => {
    setOpen(false);
    const store = useCompareStore.getState();
    if (side === 'left') store.chooseLeft(i);
    else {
      showRightOption(store.rightOptions[store.rightIndex], store.rightOptions[i]);
      store.chooseRight(i);
    }
  };
  return (
    <div className={`${base} ${place} pointer-events-auto`} style={style}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-full items-center gap-1 px-2.5 py-1 hover:bg-white/10 rounded-lg"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`${label} — ${options.length} scenes available, choose one`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute min-w-full rounded-lg bg-gray-950/90 p-1 shadow-xl shadow-black/30 ${mobile ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          style={{ [side === 'left' ? 'right' : 'left']: 0 }}
        >
          {options.map((o, i) => (
            <li key={o.label}>
              <button
                type="button"
                role="option"
                aria-selected={i === index}
                onClick={() => choose(i)}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] ${i === index ? 'bg-white/15' : 'hover:bg-white/10'}`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
