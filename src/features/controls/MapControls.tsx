import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Locate, Navigation } from 'lucide-react';
import { listPanels, type PanelDefinition } from '@/extensions/panels/registry';
import { useLayersStore } from '@/state/layers-store';
import { useMapStore } from '@/state/map-store';
import { useToolsStore } from '@/state/tools-store';
import { useUiStore } from '@/state/ui-store';
import { getCurrentPosition } from '@/core/camera/focus';
import { useEmbed } from '@/integrations/embed/embed-context';
import { useIsMobile } from '@/lib/use-media-query';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';
import { afterMapIdle } from '@/lib/after-map-idle';
import { ErrorBoundary } from '@/components/error-boundary';
import { isChunkLoadError } from '@/lib/chunk-error';
import { PanelError, PanelSkeleton } from './Panel';
import { setPanelWithPolicy, togglePanelWithPolicy } from './panel-policy';
import { notify } from '@/state/notify-store';

/**
 * Reset-to-north button, shown while the map is rotated. The chase camera
 * turns the map every frame, so the icon is rotated directly on the DOM and
 * React re-renders only when the button appears or disappears.
 */
function CompassButton() {
  const map = useMapStore((s) => s.map);
  const [rotated, setRotated] = useState(false);
  const iconRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const bearing = map.getBearing();
      setRotated(Math.abs(bearing) > 0.5);
      if (iconRef.current) iconRef.current.style.transform = `rotate(${-bearing}deg)`;
    };
    update();
    map.on('rotate', update);
    return () => {
      map.off('rotate', update);
    };
  }, [map]);
  useLayoutEffect(() => {
    if (rotated && iconRef.current && map) iconRef.current.style.transform = `rotate(${-map.getBearing()}deg)`;
  }, [rotated, map]);
  if (!rotated) return null;
  return (
    <IconButton
      label="Reset bearing to north"
      size="lg"
      tone="plain"
      className="glass text-primary hover:bg-hover"
      onClick={() => map?.easeTo({ bearing: 0, pitch: 0, duration: 400 })}
    >
      <Navigation ref={iconRef} fill="currentColor" />
    </IconButton>
  );
}

/** Panels follow what the user does elsewhere (context menu, map clicks). */
function usePanelAutomation() {
  // The measure tool started externally (context menu) → its panel.
  const activeTool = useToolsStore((s) => s.activeTool);
  useEffect(() => {
    if (activeTool === 'measure' && useUiStore.getState().activePanel !== 'measure') setPanelWithPolicy('measure');
  }, [activeTool]);

  // A feature selected on the map → the layers panel, except while reading a
  // story (selection and media cards must not pull the reader away).
  const selectedFeatureId = useLayersStore((s) => s.selection?.featureId ?? null);
  useEffect(() => {
    const active = useUiStore.getState().activePanel;
    if (selectedFeatureId && active !== 'layers' && active !== 'story') setPanelWithPolicy('layers');
  }, [selectedFeatureId]);
}

const neverHidden = () => false;
const noBadge = () => null;

function ToolbarButton({ panel, active, compact }: { panel: PanelDefinition; active: boolean; compact: boolean }) {
  const useHidden = panel.useHidden ?? neverHidden;
  const useBadge = panel.useBadge ?? noBadge;
  const hidden = useHidden();
  const badge = useBadge();
  if (hidden) return null;
  const Icon = panel.icon;
  return (
    <button
      type="button"
      onClick={() => togglePanelWithPolicy(panel.id)}
      onPointerEnter={panel.preload}
      onFocus={panel.preload}
      aria-pressed={active}
      aria-label={badge ? `${panel.title} (${badge})` : undefined}
      className={cn(
        'relative flex items-center justify-center font-bold transition-colors duration-150 active:scale-95',
        compact
          ? 'flex-1 flex-col gap-0.5 rounded-xl py-1.5 text-[10.5px]'
          : 'gap-1.5 rounded-xl px-3 py-2 text-xs',
        active
          ? compact
            ? 'text-primary'
            : 'bg-primary text-primary-foreground shadow-md'
          : 'text-muted-foreground hover:bg-hover hover:text-foreground',
      )}
    >
      <span className={cn('relative flex items-center justify-center', compact && 'h-7 w-12 rounded-full', compact && active && 'bg-primary/12')}>
        <Icon className="h-[18px] w-[18px] sm:h-4 sm:w-4" aria-hidden />
        {compact && badge !== null && badge > 0 && (
          <span className="absolute -top-0.5 right-1.5 min-w-4 rounded-full bg-accent px-1 text-center text-[9.5px] font-extrabold leading-4 text-accent-foreground tabular-nums">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span>{panel.title}</span>
      {!compact && badge !== null && badge > 0 && (
        <span
          className={cn(
            'min-w-[18px] rounded-full px-1.5 text-center text-[10px] leading-[18px] font-extrabold tabular-nums',
            active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/12 text-primary',
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

/**
 * The control bar (one button per registered panel), the active panel, and
 * the floating locate/compass buttons. Panels come from the registry
 * (`extensions/panels`) — registering one adds its button here.
 */
export default function MapControls() {
  const embed = useEmbed();
  const mobile = useIsMobile();
  const activePanel = useUiStore((s) => s.activePanel);
  usePanelAutomation();

  // Warm the most-used panels once the map has drawn, so first opens are instant.
  useEffect(
    () =>
      afterMapIdle(() => {
        for (const p of listPanels()) if (p.id === 'layers' || p.id === 'upload') p.preload?.();
      }),
    [],
  );

  const locateUser = async () => {
    try {
      const position = await getCurrentPosition();
      useUiStore.getState().requestFocus({ kind: 'location', longitude: position.longitude, latitude: position.latitude });
    } catch (error: unknown) {
      notify((error as GeolocationPositionError)?.message || 'Could not get your location');
    }
  };

  const panels = listPanels().filter((p) =>
    embed.enabled ? p.embedVisible : mobile ? p.mobileVisible !== false : true,
  );
  const active = panels.find((p) => p.id === activePanel);
  const ActivePanel = active?.component;
  const compact = mobile;

  return (
    <>
      {!embed.enabled && (
        <div className="fixed right-3 top-[4.25rem] z-30 flex flex-col gap-2 sm:top-3">
          <IconButton label="Show my location" size="lg" tone="plain" className="glass text-primary hover:bg-hover" onClick={locateUser}>
            <Locate />
          </IconButton>
          <CompassButton />
        </div>
      )}

      <nav
        aria-label="Map tools"
        className={cn(
          'glass fixed z-30 flex items-stretch',
          compact
            ? 'inset-x-0 bottom-0 h-[calc(var(--tabbar-h)+env(safe-area-inset-bottom,0px))] rounded-none border-x-0 border-b-0 px-1 pt-1 pb-safe'
            : embed.enabled
              ? 'bottom-2 left-2 gap-0.5 rounded-2xl p-1'
              : 'bottom-3 left-3 gap-0.5 rounded-2xl p-1',
        )}
      >
        {panels.map((panel) => (
          <ToolbarButton key={panel.id} panel={panel} active={activePanel === panel.id} compact={compact} />
        ))}
      </nav>

      {active && ActivePanel && (
        <ErrorBoundary key={active.id} name={`${active.id} panel`} fallback={(retry, error) => <PanelError panelId={active.id} retry={isChunkLoadError(error) ? null : retry} />}>
          <Suspense fallback={<PanelSkeleton panelId={active.id} />}>
            <ActivePanel />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}
