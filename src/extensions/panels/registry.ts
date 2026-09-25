import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * A control-bar panel. Register one and it appears as a toolbar button that
 * toggles the panel open — no edits to the controls component required.
 */
export interface PanelDefinition {
  id: string;
  /** Toolbar button label. */
  title: string;
  icon: LucideIcon;
  /** The panel body. Use `lazyPanel()` so its code loads when first opened. */
  component: React.ComponentType;
  /** Toolbar position, ascending. Built-ins use 10, 20, 30… */
  order: number;
  /** Show in embed mode with chrome=full (default false). */
  embedVisible?: boolean;
  /** Show in the phone layout (default true). */
  mobileVisible?: boolean;
  /**
   * Hook deciding whether the toolbar button is hidden right now (e.g. only
   * while some state holds). Called on every toolbar render.
   */
  useHidden?: () => boolean;
  /** Toolbar count badge (e.g. loaded layers). Hook, called on every toolbar render. */
  useBadge?: () => number | null;
  /** Start loading the panel's code (toolbar hover/focus, idle time). */
  preload?: () => void;
}

const panels = new Map<string, PanelDefinition>();

export function registerPanel(panel: PanelDefinition): void {
  panels.set(panel.id, panel);
}

export function unregisterPanel(id: string): void {
  panels.delete(id);
}

export function getPanel(id: string): PanelDefinition | undefined {
  return panels.get(id);
}

export function listPanels(): PanelDefinition[] {
  return Array.from(panels.values()).sort((a, b) => a.order - b.order);
}

/**
 * A code-split panel: `component` for the registry plus `preload` to warm it.
 *
 *   registerPanel({ id: 'x', ...lazyPanel(() => import('./XPanel')), … })
 */
export function lazyPanel(load: () => Promise<{ default: React.ComponentType }>): Pick<PanelDefinition, 'component' | 'preload'> {
  let pending: Promise<{ default: React.ComponentType }> | null = null;
  const once = () => (pending ??= load());
  return {
    component: React.lazy(once),
    preload: () => void once().catch(() => (pending = null)),
  };
}
