import { registerBuiltinContextMenuActions } from './context-menu/builtin/actions';
import { registerTool } from './tools/registry';
import { measureTool } from './tools/builtin/measure';
import {
  registerSourceProvider,
} from './sources/registry';
import {
  geojsonFileProvider,
  geojsonUrlProvider,
  geojsonTextProvider,
  geojsonDataProvider,
} from './sources/builtin/geojson';
import { registerBuiltinPanels } from '@/features/controls/register-panels';

/**
 * Registers every built-in extension. Called once at app bootstrap —
 * external plugins would call the same registry functions.
 */
export function registerBuiltinExtensions(): void {
  registerBuiltinPanels();
  registerBuiltinContextMenuActions();
  registerTool(measureTool);
  registerSourceProvider(geojsonFileProvider);
  registerSourceProvider(geojsonUrlProvider);
  registerSourceProvider(geojsonTextProvider);
  registerSourceProvider(geojsonDataProvider);
}

export { registerPanel, listPanels, getPanel } from './panels/registry';
export type { PanelDefinition } from './panels/registry';

export { contextMenuRegistry } from './context-menu/registry';
export type { ContextMenuItem, ContextMenuContext } from './context-menu/registry';

export { registerTool, getTool, listTools } from './tools/registry';

export {
  registerSourceProvider,
  listSourceProviders,
  ingest,
  toFeatureCollection,
} from './sources/registry';
export type { SourceProvider, SourceInput, IngestOptions, IngestResult } from './sources/registry';
