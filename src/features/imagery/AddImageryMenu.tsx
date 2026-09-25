import { useEffect, useRef, useState } from 'react';
import { useImageryStore } from '@/state/imagery-store';
import { listImageryPresets, type ImageryPreset } from '@/extensions/imagery/registry';
import { track } from '@/lib/analytics';

/** Preset picker for imagery layers (NASA GIBS and anything registered in `extensions/imagery`). */
export default function AddImageryMenu({ onClose }: { onClose: () => void }) {
  const presets = listImageryPresets();
  const [date, setDate] = useState(() => presets.find((p) => p.dated)?.dated?.default ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    // Capture phase: close this first and mark the key handled, so the panel underneath stays open.
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const add = (preset: ImageryPreset) => {
    useImageryStore.getState().addImagery(preset.create(preset.dated ? date || preset.dated.default : null));
    track('imagery_added', { preset: preset.id, date: preset.dated ? date : null });
    onClose();
  };

  const groups = new Map<string, ImageryPreset[]>();
  for (const p of presets) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Add imagery"
      className="glass-strong absolute bottom-full left-2 z-30 mb-2 flex max-h-[min(60dvh,420px)] w-[min(300px,calc(100vw-2rem))] flex-col gap-2 overflow-y-auto rounded-2xl p-2.5 animate-pop-in"
    >
      {presets.some((p) => p.dated) && (
        <label className="flex items-center justify-between gap-2 px-1 text-[11px] font-bold text-muted-foreground">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground"
          />
        </label>
      )}
      {[...groups.entries()].map(([group, items]) => (
        <div key={group}>
          <p className="eyebrow mb-1 px-1">{group}</p>
          <ul className="flex flex-col">
            {items.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => add(p)} className="w-full rounded-xl px-2 py-1.5 text-left hover:bg-hover active:scale-[0.99]">
                  <span className="block text-xs font-bold">{p.name}</span>
                  <span className="block text-[10.5px] leading-snug text-muted-foreground">{p.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
