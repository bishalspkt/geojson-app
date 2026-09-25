import { useEffect, useRef, useState } from 'react';
import { Globe, Map as MapIcon, Mountain, MountainSnow, Settings2 } from 'lucide-react';
import type { MapTheme } from '@/types';
import { useSettingsStore } from '@/state/settings-store';
import { Segmented } from '@/components/ui/segmented';
import { cn } from '@/lib/utils';

const THEMES: { id: MapTheme; label: string; swatch: string }[] = [
  { id: 'light', label: 'Light', swatch: 'linear-gradient(135deg,#bfe3f5 50%,#e8efe0 50%)' },
  { id: 'white', label: 'Clean', swatch: 'linear-gradient(135deg,#ffffff 50%,#eef0f3 50%)' },
  { id: 'grayscale', label: 'Mono', swatch: 'linear-gradient(135deg,#c9ccd1 50%,#9ea3aa 50%)' },
  { id: 'dark', label: 'Dark', swatch: 'linear-gradient(135deg,#1e293b 50%,#334155 50%)' },
  { id: 'black', label: 'Midnight', swatch: 'linear-gradient(135deg,#030712 50%,#1f2937 50%)' },
];

function Toggle({
  on,
  onChange,
  icon: Icon,
  label,
}: {
  on: boolean;
  onChange: () => void;
  icon: typeof Mountain;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors active:scale-[0.98]',
        on ? 'bg-primary/12 text-primary ring-1 ring-primary/30' : 'bg-tint text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

/** Basemap theme, projection and terrain — a popover off the logo pill. */
export default function MapSettings() {
  const theme = useSettingsStore((s) => s.theme);
  const projection = useSettingsStore((s) => s.projection);
  const terrain = useSettingsStore((s) => s.terrain);
  const hillshade = useSettingsStore((s) => s.hillshade);
  const exaggeration = useSettingsStore((s) => s.terrainExaggeration);
  const { setTheme, setProjection, setSettings } = useSettingsStore.getState();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    // Capture phase: close this first and mark the key handled, so the panel underneath stays open.
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn('flex h-8 w-8 items-center justify-center rounded-xl transition-colors', open ? 'bg-white/25' : 'hover:bg-white/15')}
        aria-label="Map settings"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Map settings"
          className="glass-strong fixed inset-x-3 top-[3.75rem] flex flex-col gap-4 rounded-2xl p-4 text-foreground animate-pop-in sm:absolute sm:inset-x-auto sm:left-[-3.25rem] sm:top-[calc(100%+0.75rem)] sm:w-72"
        >
          <section>
            <p className="eyebrow mb-2.5">Basemap</p>
            <div className="grid grid-cols-5 gap-1.5">
              {THEMES.map((t) => {
                const active = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    aria-pressed={active}
                    className="group flex flex-col items-center gap-1.5 rounded-xl p-1 transition-colors hover:bg-hover"
                  >
                    <span
                      className={cn('h-9 w-9 rounded-xl ring-1 ring-foreground/10 transition-shadow', active && 'ring-2 ring-primary ring-offset-2 ring-offset-card')}
                      style={{ background: t.swatch }}
                    />
                    <span className={cn('text-[10.5px] font-bold', active ? 'text-primary' : 'text-muted-foreground')}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="eyebrow mb-2">Projection</p>
            <Segmented
              label="Projection"
              className="grid w-full grid-cols-2"
              value={projection}
              onChange={setProjection}
              options={[
                { value: 'mercator', label: <><MapIcon className="h-4 w-4" aria-hidden /> Flat</> },
                { value: 'globe', label: <><Globe className="h-4 w-4" aria-hidden /> Globe</> },
              ]}
            />
          </section>

          <section>
            <p className="eyebrow mb-2">Terrain</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Toggle
                on={terrain}
                icon={MountainSnow}
                label="3D"
                onChange={() => setSettings({ terrain: !terrain, hillshade: !terrain ? true : hillshade })}
              />
              <Toggle on={hillshade} icon={Mountain} label="Relief" onChange={() => setSettings({ hillshade: !hillshade })} />
            </div>
            {terrain && (
              <label className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                Height
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.25}
                  value={exaggeration}
                  onChange={(e) => setSettings({ terrainExaggeration: Number(e.target.value) })}
                  className="flex-1 accent-[hsl(var(--primary))]"
                  aria-label="Terrain exaggeration"
                />
                <span className="w-9 text-right tabular-nums">{exaggeration}×</span>
              </label>
            )}
            <p className="mt-2 text-[10.5px] text-subtle-foreground">Tilt with right-drag, Ctrl-drag, or a two-finger drag.</p>
          </section>
        </div>
      )}
    </div>
  );
}
