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
  component: React.ComponentType;
  /** Toolbar position, ascending. Built-ins use 10, 20, 30… */
  order: number;
  /** Show in embed mode with chrome=full (default false). */
  embedVisible?: boolean;
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
