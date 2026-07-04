import { useEffect, useState } from 'react';
import { Locate, Navigation } from 'lucide-react';
import { listPanels } from '@/extensions/panels/registry';
import { useLayersStore } from '@/state/layers-store';
import { useMapStore } from '@/state/map-store';
import { useToolsStore } from '@/state/tools-store';
import { useUiStore } from '@/state/ui-store';
import { getCurrentPosition } from '@/core';
import { useEmbed } from '@/integrations/embed/embed-context';
import { setPanelWithPolicy, togglePanelWithPolicy } from './panel-policy';

function useCompassBearing(): number {
  const map = useMapStore((s) => s.map);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map) return;
    const update = () => setBearing(map.getBearing());
    update();
    map.on('rotate', update);
    map.on('rotateend', update);
    return () => {
      map.off('rotate', update);
      map.off('rotateend', update);
    };
  }, [map]);

  return bearing;
}

/**
 * The control bar: one button per registered panel, plus locate + compass.
 * Panels come from the registry (`extensions/panels`) — adding a panel there
 * adds its button here with no changes to this component.
 */
export default function MapControls() {
  const embed = useEmbed();
  const activePanel = useUiStore((s) => s.activePanel);
  const map = useMapStore((s) => s.map);
  const bearing = useCompassBearing();
  const showCompass = Math.abs(bearing) > 0.5;

  // Auto-open the measure panel when the measure tool starts externally
  // (e.g. from the context menu).
  const activeTool = useToolsStore((s) => s.activeTool);
  useEffect(() => {
    if (activeTool === 'measure' && useUiStore.getState().activePanel !== 'measure') {
      useUiStore.getState().setActivePanel('measure');
    }
  }, [activeTool]);

  // Auto-open the layers panel when a feature gets selected (map click).
  const selectedFeatureId = useLayersStore((s) => s.selection?.featureId ?? null);
  useEffect(() => {
    if (selectedFeatureId && useUiStore.getState().activePanel !== 'layers') {
      setPanelWithPolicy('layers');
    }
  }, [selectedFeatureId]);

  const locateUser = async () => {
    try {
      const position = await getCurrentPosition();
      useUiStore.getState().requestFocus({
        kind: 'location',
        longitude: position.longitude,
        latitude: position.latitude,
      });
    } catch (error: unknown) {
      alert((error as Error).message);
    }
  };

  const panels = listPanels().filter((p) => (embed.enabled ? p.embedVisible : true));
  const activeDefinition = panels.find((p) => p.id === activePanel);

  return (
    <>
      {/* Floating Locate + Compass stack — top right (below search on mobile) */}
      {!embed.enabled && (
        <div className="fixed top-16 right-3 sm:top-3 sm:right-3 z-30 flex flex-col gap-2">
          <button
            onClick={locateUser}
            aria-label="Locate me"
            className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/30 shadow-lg shadow-black/5 active:scale-95 transition-transform duration-150 text-primary hover:text-primary hover:bg-white/90"
          >
            <Locate className="h-4.5 w-4.5" />
          </button>
          {showCompass && (
            <button
              onClick={() => map?.easeTo({ bearing: 0, duration: 300 })}
              aria-label="Reset bearing to north"
              className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/30 shadow-lg shadow-black/5 active:scale-95 transition-transform duration-150 text-primary hover:text-primary hover:bg-white/90"
            >
              <Navigation
                className="h-4.5 w-4.5"
                style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform 0.1s linear' }}
                fill="currentColor"
              />
            </button>
          )}
        </div>
      )}

      {/* Panel toolbar */}
      <div className="fixed bottom-0 left-0 right-0 sm:bottom-3 sm:left-3 sm:right-auto sm:w-fit z-30 flex items-center gap-0.5 p-1.5 sm:p-1 sm:rounded-2xl bg-white/70 backdrop-blur-xl border-t sm:border border-white/30 shadow-lg shadow-black/5">
        {panels.map((panel) => {
          const Icon = panel.icon;
          const isActive = activePanel === panel.id;
          return (
            <button
              key={panel.id}
              onClick={() => togglePanelWithPolicy(panel.id)}
              aria-label={panel.title}
              className={`flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-1.5 px-3 py-3 sm:py-2 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-95 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[11px] sm:text-xs">{panel.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      {activeDefinition && <activeDefinition.component />}
    </>
  );
}
