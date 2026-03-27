import React from 'react';

export type PanelType = 'upload' | 'layers' | 'measure' | 'create' | 'animate';
export type PanelStatus = 'maximized' | 'hidden';

export type PanelProps = {
  type: PanelType;
  children: React.ReactNode;
  onToggle: (panel: PanelType) => void;
  className?: string;
};
