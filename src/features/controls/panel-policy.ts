import { useLayersStore } from '@/state/layers-store';
import { useToolsStore } from '@/state/tools-store';
import { useUiStore } from '@/state/ui-store';

/**
 * Panel switching policy: panels are mutually exclusive, the measure panel
 * owns the measure tool, and switching away from the layers panel clears the
 * feature selection. Every UI surface that opens/closes panels goes through
 * here so the side effects stay consistent.
 */
export function togglePanelWithPolicy(panelId: string): void {
  const ui = useUiStore.getState();
  const next = ui.activePanel === panelId ? null : panelId;
  setPanelWithPolicy(next);
}

export function setPanelWithPolicy(panelId: string | null): void {
  const ui = useUiStore.getState();
  const tools = useToolsStore.getState();
  const layers = useLayersStore.getState();

  ui.setActivePanel(panelId);

  // The measure panel and the measure tool activate together.
  if (panelId === 'measure') {
    if (tools.activeTool !== 'measure') tools.setActiveTool('measure');
  } else if (tools.activeTool === 'measure') {
    tools.setActiveTool(null);
  }

  // Selection belongs to the layers panel.
  if (panelId !== 'layers' && layers.selection) {
    layers.selectFeature(null);
  }
}
