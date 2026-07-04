/**
 * Panels are an open set — any string registered via `extensions/panels`.
 * Built-ins: 'upload' | 'layers' | 'measure' | 'developers'.
 */
export type PanelType = string;

export type PanelStatus = 'maximized' | 'hidden';

export type PanelProps = {
  panelId: PanelType;
  children: React.ReactNode;
  className?: string;
};
